import { PrismaClient } from "@prisma/client";
import { requestContext } from "./utils/requestContext.js";

const prisma = new PrismaClient();

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

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
