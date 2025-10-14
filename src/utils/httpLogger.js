import logger from "./logger.js";
import { requestContext } from "./requestContext.js";

export const httpLogger = (req, res, next) => {
  const { method, originalUrl, headers, body } = req;
  const startTime = Date.now();

  const oldSend = res.send.bind(res); // bind correctly

  res.send = function (data) {
    const responseTime = Date.now() - startTime;

    // Try parsing data only if it's a string
    let responseBody = data;
    if (typeof data === "string") {
      try { responseBody = JSON.parse(data); } catch { }
    }

    const logs = requestContext.getLogs();
    const dbLog = logs.find(log => log.dbQuery) || {};

    const metadata = {
      host: req.hostname || req.headers.host,
      method,
      url: originalUrl,
      statusCode: res.statusCode,
      responseTimeMs: responseTime,
      requestHeaders: headers,
      requestBody: body,
      responseHeaders: res.getHeaders(),
      responseBody,
      ...dbLog,
    };

    logger.info("HTTP Request/Response Log", { metadata, timestamp: new Date().toISOString() });

    return oldSend(data); // call original send
  };

  next();
};
