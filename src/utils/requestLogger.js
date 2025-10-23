import morgan from "morgan";
import logger from "./logger.js";

// Use custom Morgan tokens for richer context
morgan.token("body", (req) => JSON.stringify(req.body));
morgan.token("query", (req) => JSON.stringify(req.query));
morgan.token("remote-addr", (req) => req.ip);

const stream = {
  write: (message) => logger.http(message.trim()),
};

const requestLogger = morgan(
  ':remote-addr :method :url :status :response-time ms - :res[content-length] query=:query body=:body',
  { stream }
);

export default requestLogger;
