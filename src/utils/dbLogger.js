import { requestContext } from "./requestContext.js";

export const logDbQuery = async (query, params, executor) => {
  const start = Date.now();
  try {
    const result = await executor();
    const duration = Date.now() - start;

    requestContext.addLog({
      dbQuery: query,
      dbParams: params,
      dbResponse: trySafeStringify(result),
      dbExecutionTimeMs: duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;

    requestContext.addLog({
      dbQuery: query,
      dbParams: params,
      dbError: error.message,
      dbExecutionTimeMs: duration,
    });

    throw error;
  }
};

function trySafeStringify(data) {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
}
