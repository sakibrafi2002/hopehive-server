import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { closeDb, connectDb } from "./db.js";
import { eventsRouter } from "./routes/events.js";
import { joinedRouter } from "./routes/joined.js";

async function main() {
  await connectDb();

  const app = express();

  app.use(
    cors({
      origin: config.clientUrls,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json({ limit: "100kb" }));

  app.get("/", (_req, res) => {
    res.json({ name: "HopeHive API", status: "running" });
  });

  app.use("/api", eventsRouter);
  app.use("/api", joinedRouter);

  app.use((_req, res) => {
    res.status(404).json({ message: "That route does not exist" });
  });

  // Express 5 forwards rejected promises from async handlers here.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof SyntaxError) {
      res.status(400).json({ message: "The request body is not valid JSON" });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong on our side. Please try again" });
  });

  const server = app.listen(config.port, () => {
    console.log(`HopeHive API listening on port ${config.port}`);
  });

  const shutdown = () => {
    server.close(() => {
      closeDb().finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  console.error("Failed to start the server", error);
  process.exit(1);
});
