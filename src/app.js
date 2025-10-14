import express from "express";
import cors from "cors";
import adminRoutes from "./routes/adminRoutes.js";
import officeRoutes from "./routes/officeRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoute.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import transactionRouter from "./routes/transactionRoutes.js"
import holidayRoutes from "./routes/holidayRoutes.js";

// imports for logging
import logger from "./utils/logger.js"
import requestLogger from "./utils/requestLogger.js"
import { httpLogger } from "./utils/httpLogger.js";
import { requestContext } from "./utils/requestContext.js";
import crypto from "crypto";
import { attachDbLogger } from "./Middleware/dbLoggerMiddleware.js";



const app = express();

app.use(cors());
app.use(express.json());

// Logging utils use
app.use((req, res, next) => {
  requestContext.run({ requestId: crypto.randomUUID(), logs: [] }, next);
});
app.use(attachDbLogger);
app.use(httpLogger);
app.use(requestLogger);

app.get("/", (req, res) => {
  const responsePayload = {
    version: "1.0.0",
    message: "Welcome to the WorkPay API"
  }
  res.send(responsePayload);
})

app.use("/api/admins", adminRoutes);
app.use("/api/offices", officeRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/transactions", transactionRouter);
app.use("/api/holidays", holidayRoutes);

app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.url} - ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
