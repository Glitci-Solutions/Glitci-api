import { Router } from "express";
import {
  // register,
  login,
  refreshAccessToken,
  logout,
  changePassword,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  setInitialPassword,
} from "./auth.controller.js";
import {
  // registerValidator,
  loginValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  verifyResetCodeValidator,
  resetPasswordValidator,
  setInitialPasswordValidator,
} from "./auth.validator.js";
import { protect } from "./auth.middleware.js";
import { uploadSingleImage } from "../../shared/middlewares/uploadMiddleware.js";
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
} from "../../shared/middlewares/rateLimitMiddleware.js";

const router = Router();

// Public routes
// router.post("/signup", uploadSingleImage("image"), registerValidator, register);
router.post("/login", loginRateLimiter, loginValidator, login);
router.post("/refresh", refreshAccessToken);
router.post("/forgot-password", forgotPasswordRateLimiter, forgotPasswordValidator, forgotPassword);
router.post("/verify-reset-code", verifyResetCodeValidator, verifyResetCode);
router.post("/reset-password", resetPasswordValidator, resetPassword);

// Protected routes
router.post("/logout", protect, logout);
router.patch(
  "/change-password",
  protect,
  changePasswordValidator,
  changePassword,
);
router.patch(
  "/set-initial-password",
  protect,
  setInitialPasswordValidator,
  setInitialPassword,
);

export default router;
