// // src/middleware/dbLoggerMiddleware.js
import prisma from "../prisma.js";
import { logDbQuery } from "../utils/dbLogger.js";

// export const attachDbLogger = (req, res, next) => {
//   // Wrap Prisma with logging proxy
//   req.db = new Proxy(prisma, {
//     get(target, model) {
//       const origModel = target[model];
//       if (typeof origModel === "object") {
//         return new Proxy(origModel, {
//           get(t, method) {
//             if (typeof t[method] === "function") {
//               return (...args) =>
//                 logDbQuery(`prisma.${model}.${method}`, args, () => t[method](...args));
//             }
//             return t[method];
//           },
//         });
//       }
//       return origModel;
//     },
//   });

//   next();
// };
export const attachDbLogger = (req, res, next) => {
  // Wrap Prisma with logging proxy
  req.db = new Proxy(prisma, {
    get(target, model) {
      const origModel = target[model];

      // FIX 1: Ensure we only proxy actual models, not internal Symbols
      if (typeof model === "symbol") return origModel;

      if (origModel && typeof origModel === "object") {
        return new Proxy(origModel, {
          get(t, method) {
            // FIX 2: Check if 'method' is a Symbol (like Prisma's internal transaction markers)
            if (typeof method === "symbol") return t[method];

            if (typeof t[method] === "function") {
              return (...args) =>
                logDbQuery(
                  `prisma.${String(model)}.${String(method)}`, // Safely convert to string
                  args, 
                  () => t[method](...args)
                );
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