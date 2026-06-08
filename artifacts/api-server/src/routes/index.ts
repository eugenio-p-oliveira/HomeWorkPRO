import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tenantsRouter from "./tenants";
import usersRouter from "./users";
import academicRouter from "./academic";
import examsRouter from "./exams";
import questionsRouter from "./questions";
import questionsCrudRouter from "./questionsCrud";
import sessionsRouter from "./sessions";
import reportsRouter from "./reports";
import guardiansRouter from "./guardians";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(guardiansRouter); // public guardian login must be BEFORE academicRouter
router.use("/tenants", tenantsRouter);
router.use("/users", usersRouter);
router.use(academicRouter);
router.use("/exams", examsRouter);
router.use("/exams/:examId/questions", questionsRouter);
router.use("/questions", questionsCrudRouter);
router.use(sessionsRouter);
router.use("/reports", reportsRouter);

export default router;
