import logger from "./logger.js";
import { requestContext } from "./requestContext.js";

const SENSITIVE_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "authorization",
  "token",
  "refreshtoken",
]);

export const sanitizeForLog = (data) => {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(sanitizeForLog);
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizeForLog(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const httpLogger = (req, res, next) => {
  const start = Date.now();
  const ctx = requestContext.get();
  const txnId = ctx?.txnId || requestContext.getTxnId() || "-";
  const apiName = ctx?.apiName || requestContext.getApiName() || req.originalUrl || req.url;
  const method = req.method;
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress;

  // 1️⃣ Log Incoming API Call IMMEDIATELY when the hit reaches the server
  logger.info("Incoming API Call", {
    metadata: {
      apiName,
      method,
      ip,
      messageNumber: requestContext.nextMessageNumber(),
      txnId,
      req_header: sanitizeForLog(req.headers),
      req_body: sanitizeForLog(req.body),
    },
  });

  let responseBodyCaptured = null;
  const oldSend = res.send.bind(res);

  res.send = function (data) {
    responseBodyCaptured = data;
    return oldSend(data);
  };

  // 2️⃣ Log Outgoing Response reliably on 'finish'
  let loggedResponse = false;
  const logResponse = () => {
    if (loggedResponse) return;
    loggedResponse = true;

    const duration = Date.now() - start;
    const currentTxnId = requestContext.getTxnId() || txnId;
    const currentApiName = requestContext.getApiName() || apiName;

    // Flush Database Query logs for this request
    const dbLogs = requestContext.getLogs();
    dbLogs.forEach((l) => {
      logger.info("Database Query", {
        metadata: {
          apiName: currentApiName,
          method,
          messageNumber: requestContext.nextMessageNumber(),
          txnId: currentTxnId,
          dbQuery: l.dbQuery,
          dbParams: l.dbParams,
          dbExecutionTimeMs: l.dbExecutionTimeMs,
        },
      });
    });

    let parsedResBody = responseBodyCaptured;
    if (typeof responseBodyCaptured === "string") {
      try {
        parsedResBody = JSON.parse(responseBodyCaptured);
      } catch {
        // preserve non-json strings as-is
      }
    }

    const statusCode = res.statusCode;
    const logLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    logger[logLevel]("Outgoing API Response", {
      metadata: {
        apiName: currentApiName,
        method,
        statusCode,
        ip,
        messageNumber: requestContext.nextMessageNumber(),
        txnId: currentTxnId,
        message: `Completed with status ${statusCode} in ${duration}ms`,
        res_body: sanitizeForLog(parsedResBody),
      },
    });
  };

  res.on("finish", logResponse);
  res.on("close", () => {
    if (!res.writableEnded) {
      const duration = Date.now() - start;
      const currentTxnId = requestContext.getTxnId() || txnId;
      logger.warn("Client Connection Aborted", {
        metadata: {
          apiName: requestContext.getApiName() || apiName,
          method,
          txnId: currentTxnId,
          message: `Connection closed by client before response finished after ${duration}ms`,
        },
      });
    }
  });

  next();
};
