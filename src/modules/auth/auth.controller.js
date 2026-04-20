import asyncHandler from "express-async-handler";
import {
  // registerService,
  loginService,
  refreshTokenService,
  logoutService,
  changePasswordService,
  forgetPasswordService,
  verifyPasswordResetCodeService,
  resetPasswordService,
  setInitialPasswordService,
  buildAuthUserResponse,
} from "./auth.service.js";

// Cookie options for refresh token only
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // sameSite: "strict",
  sameSite: "none",
  // secure: true,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Helper to set refresh token cookie
function setRefreshTokenCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
}

// Helper to clear refresh token cookie
function clearRefreshTokenCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // sameSite: "strict",
    sameSite: "none",
    // secure: true,
  });
}

// // POST /auth/signup - No tokens, user must login after
// export const register = asyncHandler(async (req, res) => {
//   const { user } = await registerService({
//     ...req.body,
//     imageFile: req.file,
//   });

//   res.status(201).json({
//     status: "success",
//     message: "User registered successfully. Please login.",
//     data: buildAuthUserResponse(user),
//   });
// });

// POST /auth/login
export const login = asyncHandler(async (req, res) => {
  const {
    user,
    accessToken,
    refreshToken,
    accessTokenExpires,
    mustChangePassword,
  } = await loginService(req.body);

  // Set refresh token in httpOnly cookie
  setRefreshTokenCookie(res, refreshToken);

  // Return access token in body (FE handles storage)
  res.status(200).json({
    data: buildAuthUserResponse(user),
    accessToken,
    accessTokenExpires,
    mustChangePassword,
  });
});

// POST /auth/refresh
export const refreshAccessToken = asyncHandler(async (req, res) => {
  // Get refresh token from cookie
  const incoming = req.cookies?.refreshToken;

  const { accessToken, refreshToken, accessTokenExpires } =
    await refreshTokenService({ refreshToken: incoming });

  // Set new refresh token in cookie
  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    accessToken,
    accessTokenExpires,
  });
});

// POST /auth/logout
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  await logoutService({ userId: req.user._id, refreshToken });

  clearRefreshTokenCookie(res);

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

// PATCH /auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await changePasswordService({
    userId: req.user._id,
    currentPassword,
    newPassword,
  });

  clearRefreshTokenCookie(res);

  res.status(200).json({
    status: "success",
    message: "Password changed successfully. Please login again.",
  });
});

// POST /auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = await forgetPasswordService(req.body);

  res.status(200).json({
    status: "success",
    message: `Reset code sent to email ${email}`,
  });
});

// POST /auth/verify-reset-code
export const verifyResetCode = asyncHandler(async (req, res) => {
  await verifyPasswordResetCodeService(req.body);

  res.status(200).json({
    status: "success",
    message: "Reset code verified",
  });
});

// POST /auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  await resetPasswordService(req.body);

  res.status(200).json({
    status: "success",
    message: "Password reset successfully",
  });
});

// PATCH /auth/set-initial-password
export const setInitialPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  await setInitialPasswordService({
    userId: req.user._id,
    newPassword,
  });

  clearRefreshTokenCookie(res);

  res.status(200).json({
    status: "success",
    message: "Password set successfully. Please login again.",
  });
});
