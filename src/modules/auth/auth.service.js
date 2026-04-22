import crypto from "crypto";
import bcrypt from "bcrypt";
import { UserModel } from "../users/user.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import {
  createAccessToken,
  createRefreshToken,
} from "../../shared/utils/createToken.js";
// import {
//   validateImageFile,
//   uploadImageToCloudinary,
//   deleteImageFromCloudinary,
// } from "../../shared/utils/imageUpload.js";
import sendEmail from "../../shared/Email/sendEmails.js";
import { forgetPasswordEmailHTML } from "../../shared/Email/emailHtml.js";

async function issueSessionTokensForUser(user) {
  const now = Date.now();

  // Remove expired tokens
  user.refreshTokens = (user.refreshTokens || []).filter(
    (t) => !t.expiresAt || t.expiresAt.getTime() > now,
  );

  const accessToken = createAccessToken(user._id, user.role);
  const refreshToken = createRefreshToken(user._id);
  const hashedRefreshToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  user.refreshTokens.push({
    token: hashedRefreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  await user.save();

  return {
    accessToken,
    refreshToken,
    accessTokenExpires: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours
  };
}

export function buildAuthUserResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    image: user?.image?.url || null,
    role: user.role,
  };
}

// // Register a new user - no tokens issued, user must login
// export async function registerService({
//   name,
//   email,
//   phone,
//   password,
//   imageFile,
// }) {
//   if (!name || !email || !password) {
//     throw new ApiError("name, email and password are required", 400);
//   }

//   const existing = await UserModel.findOne({ email: email.toLowerCase() });
//   if (existing) {
//     throw new ApiError("User already exists with this email", 409);
//   }

//   // Validate image if provided
//   if (imageFile) {
//     validateImageFile(imageFile);
//   }

//   let uploadedImage = null;
//   let user = null;

//   try {
//     // Create user first to get the ID for folder naming
//     user = await UserModel.create({
//       name,
//       email: email.toLowerCase(),
//       phone: phone || null,
//       password,
//     });

//     // Upload image if provided
//     if (imageFile) {
//       const folder = `glitci/users/${user._id}`;
//       const publicId = `avatar_${Date.now()}`;
//       uploadedImage = await uploadImageToCloudinary(imageFile, {
//         folder,
//         publicId,
//       });

//       // Update user with image
//       user.image = uploadedImage;
//       await user.save();
//     }

//     return { user };
//   } catch (err) {
//     // Cleanup: delete uploaded image if exists
//     if (uploadedImage?.public_id) {
//       await deleteImageFromCloudinary(uploadedImage.public_id);
//     }

//     // Cleanup: delete user if was created
//     if (user?._id) {
//       await UserModel.findByIdAndDelete(user._id);
//     }

//     throw err;
//   }
// }

// Login user
export async function loginService({ email, password }) {
  if (!email || !password) {
    throw new ApiError("email and password are required", 400);
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
    "+password +tempPassword",
  );

  if (!user) {
    throw new ApiError("Incorrect email or password", 401);
  }

  // Check if this is a first-time login (password is null, use tempPassword)
  let mustChangePassword = false;

  if (!user.password && user.tempPassword) {
    // First-time login: validate against tempPassword
    const isTempMatch = await bcrypt.compare(password, user.tempPassword);
    if (!isTempMatch) {
      throw new ApiError("Incorrect email or password", 401);
    }
    mustChangePassword = true;
  } else if (user.password) {
    // Normal login: validate against password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError("Incorrect email or password", 401);
    }
  } else {
    // No password set at all
    throw new ApiError("Incorrect email or password", 401);
  }

  if (!user.isActive) {
    throw new ApiError("Account has been deactivated. Contact support", 401);
  }

  const { accessToken, refreshToken, accessTokenExpires } =
    await issueSessionTokensForUser(user);

  return {
    user,
    accessToken,
    refreshToken,
    accessTokenExpires,
    mustChangePassword,
  };
}

// Refresh access token
export async function refreshTokenService({ refreshToken }) {
  if (!refreshToken) {
    throw new ApiError("Refresh token is required", 400);
  }

  let decoded;
  try {
    decoded = crypto.createHash("sha256").update(refreshToken).digest("hex");
  } catch {
    throw new ApiError("Invalid refresh token", 401);
  }

  const user = await UserModel.findOne({
    "refreshTokens.token": decoded,
    "refreshTokens.expiresAt": { $gt: new Date() },
  });

  if (!user) {
    throw new ApiError("Invalid or expired refresh token", 401);
  }

  // Remove used refresh token and issue new tokens
  user.refreshTokens = user.refreshTokens.filter((t) => t.token !== decoded);

  const tokens = await issueSessionTokensForUser(user);

  return tokens;
}

// Logout user
export async function logoutService({ userId, refreshToken }) {
  if (!refreshToken) {
    return { message: "Logged out successfully" };
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  await UserModel.updateOne(
    { _id: userId },
    { $pull: { refreshTokens: { token: hashedToken } } },
  );

  return { message: "Logged out successfully" };
}

// Change password
export async function changePasswordService({
  userId,
  currentPassword,
  newPassword,
}) {
  const user = await UserModel.findById(userId).select("+password");

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError("Current password is incorrect", 401);
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date();
  user.refreshTokens = []; // Invalidate all sessions

  await user.save();

  return { message: "Password changed successfully" };
}

// Forget password - generate reset code
export async function forgetPasswordService({ email }) {
  const user = await UserModel.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError("No user found with this email", 404);
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");

  user.passwordResetCode = hashedCode;
  user.passwordResetCodeExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  user.passwordResetCodeVerified = false;
  await user.save();

  const firstName = (user.name || "").split(" ")[0] || "there";
  const capitalizedName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  try {
    await sendEmail({
      email: user.email,
      subject: `${capitalizedName}, here is your reset code`,
      message: forgetPasswordEmailHTML(capitalizedName, resetCode),
    });
  } catch (error) {
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpire = undefined;
    user.passwordResetCodeVerified = undefined;
    await user.save();
    throw new ApiError("Sending email failed", 500);
  }
  return { email: user.email };
}

// Verify password reset code
export async function verifyPasswordResetCodeService({ email, resetCode }) {
  const hashedCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");

  const user = await UserModel.findOne({
    email: email.toLowerCase(),
    passwordResetCode: hashedCode,
    passwordResetCodeExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError("Invalid or expired reset code", 400);
  }

  user.passwordResetCodeVerified = true;
  await user.save();

  return { message: "Reset code verified" };
}

// Reset password
export async function resetPasswordService({ email, newPassword }) {
  const user = await UserModel.findOne({
    email: email.toLowerCase(),
    passwordResetCodeVerified: true,
  });

  if (!user) {
    throw new ApiError("Please verify reset code first", 400);
  }

  user.password = newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetCodeExpire = undefined;
  user.passwordResetCodeVerified = undefined;
  user.passwordChangedAt = new Date();
  user.refreshTokens = [];

  await user.save();

  return { message: "Password reset successfully" };
}

// Set initial password (for first-time login with temp password)
export async function setInitialPasswordService({ userId, newPassword }) {
  const user = await UserModel.findById(userId).select("+tempPassword");

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  if (!user.tempPassword) {
    throw new ApiError("Password has already been set", 400);
  }

  // Set permanent password and clear temp
  user.password = newPassword;
  user.tempPassword = null;
  user.passwordChangedAt = new Date();
  user.refreshTokens = []; // Invalidate all sessions

  await user.save();

  return { message: "Password set successfully. Please login again." };
}
