import { Request, Response, NextFunction } from "express";
import { createLogger } from "../lib/logger.js";

const log = createLogger("http");

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const meta = { method, path: originalUrl, status, duration: `${duration}ms` };

    if (status >= 500) {
      log.error(`${method} ${originalUrl} ${status}`, undefined, meta);
    } else if (status >= 400) {
      log.warn(`${method} ${originalUrl} ${status}`, meta);
    } else {
      log.info(`${method} ${originalUrl} ${status}`, meta);
    }
  });

  next();
}

export function globalErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const errLog = createLogger("error");
  errLog.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err, {
    method: req.method,
    path: req.originalUrl,
    body: req.body,
  });

  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal server error",
      ...(process.env.NODE_ENV !== "production" && { message: err.message }),
    });
  }
}
