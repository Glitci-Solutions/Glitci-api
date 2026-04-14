import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

import { dbConnection } from "./src/config/dbConnection.js";
import { globalError } from "./src/shared/middlewares/errorMiddleware.js";
import { ApiError } from "./src/shared/utils/ApiError.js";
import { mountRoutes } from "./src/app/routes.js";
import { egyptTimezoneReplacer } from "./src/shared/utils/egyptTimezone.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (for Vercel)
app.set("trust proxy", 1);

// Convert all UTC dates in JSON responses to Egypt timezone (Africa/Cairo)
app.set("json replacer", egyptTimezoneReplacer);

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        "https://glitci-app.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
      ];
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

// DB connection
dbConnection();

// Mount Routes
mountRoutes(app);

// Root endpoint
app.get("/", (req, res) => {
  res.send("Glitci API is running.");
});

// 404 handler
app.use((req, res, next) => {
  next(new ApiError(`Can't find this route: ${req.originalUrl}`, 404));
});

// Global error handler
app.use(globalError);

const server = app.listen(PORT, () =>
  console.log(`Glitci API running on port ${PORT}`),
);

// UnhandledRejections event handler
process.on("unhandledRejection", (err) => {
  console.error(`unhandledRejection: ${err.name} | ${err.message}`);
  server.close(() => {
    console.log("Server shutting down...");
    process.exit(1);
  });
});

export default app;
