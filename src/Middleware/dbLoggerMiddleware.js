// src/middleware/dbLoggerMiddleware.js
import { logDbQuery } from "../utils/dbLogger.js";

export const attachDbLogger = (req, res, next) => {
  req.db = (queryName, params, executor) => logDbQuery(queryName, params, executor);
  next();
};
