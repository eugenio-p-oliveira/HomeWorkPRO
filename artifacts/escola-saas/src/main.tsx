import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { setBaseUrl } from "@workspace/api-client-react";

const configuredApiUrl = import.meta.env.VITE_API_URL;
const apiBaseUrl =
  configuredApiUrl && configuredApiUrl !== "undefined" && configuredApiUrl !== "null"
    ? configuredApiUrl.replace(/\/$/, "")
    : "";

setBaseUrl(apiBaseUrl);

createRoot(document.getElementById("root")!).render(<App />);
