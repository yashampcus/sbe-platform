import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRouter from "./routes/auth";
import passkeysRouter from "./routes/passkeys";
import configRouter from "./routes/config";
import assessmentTypesRouter from "./routes/assessmentTypes";
import questionsRouter from "./routes/questions";
import assessmentRouter from "./routes/assessment";
import adminRouter from "./routes/admin";

const app = express();

const frontendUrl = process.env.FRONTEND_URL;

app.use(
  cors({
    origin: frontendUrl ? frontendUrl.split(",").map((s) => s.trim()) : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use("/api/auth", authRouter);
app.use("/api/auth/passkey", passkeysRouter);
app.use("/api/config", configRouter);
app.use("/api/assessment-types", assessmentTypesRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/assessment", assessmentRouter);
app.use("/api/admin", adminRouter);

// Back-compat routes (no /api prefix) — frontend currently calls these.
app.use("/auth", authRouter);
app.use("/auth/passkey", passkeysRouter);
app.use("/config", configRouter);
app.use("/assessment-types", assessmentTypesRouter);
app.use("/questions", questionsRouter);
app.use("/assessment", assessmentRouter);
app.use("/admin", adminRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`aiforms-api listening on :${port}`);
});
