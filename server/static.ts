import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In Docker, WORKDIR is /app and client build is copied to /app/client/dist
  const distPath = path.resolve(process.cwd(), "client", "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the client build directory: ${distPath}. Make sure to build the client first.`,
    );
  }

  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(distPath));

  // SPA fallback: always return index.html for any non-API route
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
