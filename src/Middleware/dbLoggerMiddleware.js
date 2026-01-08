// src/middleware/dbLoggerMiddleware.js
import prisma from "../prisma.js";
import { logDbQuery } from "../utils/dbLogger.js";

export const attachDbLogger = (req, res, next) => {
  // Wrap Prisma with logging proxy
  req.db = new Proxy(prisma, {
    get(target, model) {
      const origModel = target[model];
      if (typeof origModel === "object") {
        return new Proxy(origModel, {
          get(t, method) {
            // Handle Symbol properties directly without logging
            if (typeof method === "symbol") {
              return origModel[method];
            }
            
            if (typeof origModel[method] === "function") {
              return (...args) => {
                // Only log if method is a string (not a Symbol)
                const methodName = typeof method === "string" ? method : String(method);
                return logDbQuery(`prisma.${model}.${methodName}`, args, () => origModel[method](...args));
              };
            }
            return origModel[method];
          },
        });
      }
      return origModel;
    },
  });

  next();
};
