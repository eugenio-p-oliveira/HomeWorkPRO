import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
// The app runs behind Replit/Vercel's reverse proxy. This makes the
// rate-limit client IP and forwarded headers work consistently in production.
app.set("trust proxy", 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // allow embedded images
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const defaultProductionOrigins = [
  "https://homeworkproapp.vercel.app",
  "https://www.homeworkproapp.vercel.app",
];

const configuredOrigins = [
  ...defaultProductionOrigins,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS ?? "").split(","),
]
  .map((origin) => origin?.trim().replace(/\/$/, ""))
  .filter((origin): origin is string => Boolean(origin));

app.use(cors({
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  origin: process.env.NODE_ENV !== "production"
    ? true
    : (origin, callback) => {
        if (!origin || configuredOrigins.includes(origin.replace(/\/$/, ""))) {
          callback(null, true);
        } else {
          callback(new Error("CORS origin not allowed"));
        }
      },
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Apply stricter rate limit to auth endpoints
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/guardians/login", authLimiter);

app.use("/api", generalLimiter, router);

export default app;
