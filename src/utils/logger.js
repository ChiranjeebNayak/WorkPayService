import winston from "winston";
import path from "path";

const logDir = "logs";

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
    winston.format.json() // JSON output for files
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "error.json"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.json"), // change file extension to .json
    }),
  ],
});

// Optional: colorized console logs for development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message, metadata }) => {
          const meta =
            metadata && Object.keys(metadata).length
              ? JSON.stringify(metadata)
              : "";
          return `[${timestamp}] ${level}: ${message} ${meta}`;
        })
      ),
    })
  );
}

export default logger;
