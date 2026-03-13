import "dotenv/config";
import express from "express";
import { createDb } from "@ai-tracker/db";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes will be added in subsequent tasks
app.get("/api/repositories", (_req, res) => {
  res.json({ repositories: [], total: 0 });
});

app.get("/api/trending", (_req, res) => {
  res.json({ trending: [], period: "daily" });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
