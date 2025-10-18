import logger from "./logger.js";
import { requestContext } from "./requestContext.js";

export const httpLogger = (req, res, next) => {
  const start = Date.now();
  const oldSend = res.send.bind(res);

  res.send = function (data) {
    // Re-run inside the original context to ensure AsyncLocalStorage works
    const ctx = requestContext.get();
    const { txnId, apiName } = ctx;
    const duration = Date.now() - start;

    let responseBody = data;
    if (typeof data === "string") {
      try { responseBody = JSON.parse(data); } catch { }
    }

    const dbLogs = requestContext.getLogs().filter(l => l.dbQuery);

    // 1️⃣ Incoming
    logger.info("Incoming API Call", {
      metadata: {
        apiName,
        messageNumber: requestContext.nextMessageNumber(),
        txnId,
        req_header: req.headers,
        req_body: req.body,
      }
    });

    // 2️⃣ DB Logs
    dbLogs.forEach((l) => {
      logger.info("Database Query", {
        metadata: {
          apiName,
          messageNumber: requestContext.nextMessageNumber(),
          txnId,
          message: `${l.dbQuery} (Time: ${l.dbExecutionTimeMs}ms)`
        }
      });
    });

    // 3️⃣ Outgoing
    logger.info("Outgoing API Response", {
      metadata: {
        apiName,
        messageNumber: requestContext.nextMessageNumber(),
        txnId,
        message: `Completed in ${duration}ms`,
        res_body: responseBody,
      }
    });

    return oldSend(data);
  };

  next();
};
