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
            if (typeof t[method] === "function") {
              return (...args) =>
                logDbQuery(`prisma.${model}.${method}`, args, () => t[method](...args));
            }
            return t[method];
          },
        });
      }
      return origModel;
    },
  });

  next();
};
