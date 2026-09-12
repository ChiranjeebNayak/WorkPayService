import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

import app from "./app.js";


import prisma from "./prisma.js";

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use by another process.`);
    console.error(`👉 Solution: Stop the existing process using port ${PORT}, or set a different PORT in .env.`);
  } else {
    console.error("❌ Server encountered an error:", err);
  }
  process.exit(1);
});

const handleShutdown = async (signal) => {
  console.log(`Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Database disconnected. Exiting process.");
      process.exit(0);
    } catch (err) {
      console.error("Error during disconnect:", err);
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
