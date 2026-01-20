import express from "express";
import cors from "cors";
import adminRoutes from "./routes/adminRoutes.js";
import officeRoutes from "./routes/officeRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoute.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import transactionRouter from "./routes/transactionRoutes.js"
import holidayRoutes from "./routes/holidayRoutes.js";
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.js';
import prisma from './prisma.js';

// imports for logging
import logger from "./utils/logger.js"
import { httpLogger } from "./utils/httpLogger.js";
import { requestContext } from "./utils/requestContext.js";
import crypto from "crypto";
// import { attachDbLogger } from "./Middleware/dbLoggerMiddleware.js";


const app = express();

app.use(cors());
app.use(express.json());

// Attach Prisma client directly to request
app.use((req, res, next) => {
  req.db = prisma;
  next();
});

// Logging utils use
app.use((req, res, next) => {
  const txnId = req.headers["x-transaction-id"] || crypto.randomUUID();
  const apiName = req.originalUrl;
  requestContext.run({ txnId, apiName }, () => next());
});

// Temporarily disable dbLogger to fix Symbol conversion issues
// app.use(attachDbLogger);
app.use(httpLogger);

app.get("/", (req, res) => {
  const responsePayload = {
    version: "1.0.1",
    message: "Welcome to the WorkPay API"
  }
  res.send(responsePayload);
})

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "WorkPay API Documentation"
}));

app.use("/api/admins", adminRoutes);
app.use("/api/offices", officeRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/transactions", transactionRouter);
app.use("/api/holidays", holidayRoutes);

app.use((err, req, res, next) => {
  const txnId = requestContext.getTxnId();
  logger.error(`${req.method} ${req.url} [${txnId}] - ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: "Internal Server Error", txnId });
});

export default app;
