import jwt from "jsonwebtoken";
import { UserModel } from "../users/user.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import asyncHandler from "express-async-handler";

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ApiError("Not authorized, no token provided", 401));
  }

  console.log("token", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return next(new ApiError("User no longer exists", 401));
    }

    if (!user.isActive) {
      return next(new ApiError("Account has been deactivated", 401));
    }

    // Check if password was changed after token issued
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(
        user.passwordChangedAt.getTime() / 1000,
        10,
      );
      if (decoded.iat < changedTimestamp) {
        return next(
          new ApiError("Password was changed, please login again", 401),
        );
      }
    }

    req.user = user;
    next();
  } catch (err) {
    return next(
      new ApiError("Invalid or expired token, please login again", 401),
    );
  }
});

// Restrict routes to specific roles
export const allowedTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not authorized to access this resource", 403),
      );
    }
    next();
  };
};
