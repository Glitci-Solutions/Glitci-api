import rateLimit from "express-rate-limit";

// General auth endpoints (refresh, logout, etc.) — 100 req / 15 min per IP
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: "error",
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login — 10 req / 15 min per IP
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: "error",
    message: "Too many login attempts, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Forgot password — 5 req / 15 min per IP (strictest)
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: "error",
    message:
      "Too many password reset requests, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
