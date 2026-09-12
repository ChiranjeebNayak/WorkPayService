import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

import { PrismaClient } from "@prisma/client";
import { requestContext } from "./utils/requestContext.js";

const prisma = new PrismaClient({
  log: [{ emit: "event", level: "query" }],
});

// Capture each query in the current request context
prisma.$on("query", (e) => {
  const store = requestContext.get();
  if (store) {
    requestContext.addLog({
      dbQuery: e.query,        // raw SQL
      dbParams: e.params,      // bound parameters
      dbExecutionTimeMs: e.duration,
    });
  }
});

export default prisma;
