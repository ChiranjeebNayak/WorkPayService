import { requestContext } from "./requestContext.js";

export const logDbQuery = async (query, params, executor) => {
  const start = Date.now();
  try {
    const result = await executor();
    const duration = Date.now() - start;
    requestContext.addLog({
      dbQuery: query,
      dbParams: params,
      dbExecutionTimeMs: duration,
    });
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    requestContext.addLog({
      dbQuery: query,
      dbParams: params,
      dbError: err.message,
      dbExecutionTimeMs: duration,
    });
    throw err;
  }
};
