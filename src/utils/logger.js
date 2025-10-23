import winston from "winston"
import chalk from "chalk"

const colorizeJSON = (obj) => {
  const json = JSON.stringify(obj, null, 2)
  return json.replace(
    /"([^"]+)":\s(".*?"|\d+|true|false|null|\{|\[|[\w.-]+)/g,
    (match, key, value) => {
      const coloredKey = chalk.green(`"${key}"`)
      const coloredValue = chalk.blue(value)
      return `${coloredKey}: ${coloredValue}`
    }
  )
}

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, metadata = {} }) => {
      const logEntry = {
        timestamp,
        level,
        apiName: metadata.apiName || "-",
        messageNumber: metadata.messageNumber || "-",
        txnId: metadata.txnId || "-",
        message,
      }

      if (metadata.req_header) logEntry.req_header = metadata.req_header
      if (metadata.req_body) logEntry.req_body = metadata.req_body
      if (metadata.res_body) logEntry.res_body = metadata.res_body
      if (metadata.dbQuery) logEntry.db_query = metadata.dbQuery
      if (metadata.dbParams) logEntry.db_params = metadata.dbParams
      if (metadata.dbExecutionTimeMs) logEntry.db_duration_ms = metadata.dbExecutionTimeMs

      return colorizeJSON(logEntry)
    })
  ),
  transports: [new winston.transports.Console()],
})

export default logger
