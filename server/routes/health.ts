import { Router } from "express";
import { testConnection } from "../db";

const router = Router();

router.get("/", async (req, res) => {
  const dbConnected = await testConnection();
  
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    database: dbConnected ? "connected" : "disconnected",
  });
});

export default router;







