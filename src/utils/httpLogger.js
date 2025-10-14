import logger from "./logger.js";

// Middleware to log requests and responses
export const httpLogger = (req, res, next) => {
  const { method, originalUrl, headers, body } = req;
  const startTime = Date.now();

  // Capture response body
  const oldSend = res.send;
  res.send = function (data) {
    res.send = oldSend; // restore original function
    res.send(data);     // call original

    const responseTime = Date.now() - startTime;

    // Log full request/response
    logger.info("HTTP Request/Response Log", {
      timestamp: new Date().toISOString(),
      method,
      url: originalUrl,
      host: req.hostname || req.headers.host,
      requestHeaders: headers,
      requestBody: body,
      statusCode: res.statusCode,
      responseHeaders: res.getHeaders(),
      responseBody: tryParseJson(data),
      responseTimeMs: responseTime,
    });

    return data;
  };

  next();
};

// Helper to safely parse JSON response body
function tryParseJson(data) {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}
