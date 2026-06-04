import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { AttendanceConfig } from "./attendanceConfig.model.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { EMPLOYMENT_TYPE } from "../../shared/constants/employee.enums.js";

export const kioskAuth = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.kioskToken ||
    req.headers?.authorization?.replace("Bearer ", "");

  if (!token) return next(new ApiError("Kiosk authentication required", 401));

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.KIOSK_JWT_SECRET);
  } catch {
    return next(new ApiError("Invalid or expired kiosk token", 401));
  }

  const config = await AttendanceConfig.getConfig();
  const kiosk = config.activeKiosks.find((k) => k.deviceId === decoded.deviceId);
  if (!kiosk) return next(new ApiError("Kiosk device not registered or has been revoked", 401));

  kiosk.lastSeen = new Date();
  config.save().catch(() => {});

  req.kiosk = decoded;
  next();
});

export const resolveEmployee = asyncHandler(async (req, res, next) => {
  const employee = await EmployeeModel.findOne({ user: req.user._id });
  if (!employee) {
    return next(new ApiError("Employee profile not found for this user", 404));
  }
  req.employee = employee;
  next();
});

export const freelancerGuard = asyncHandler(async (req, res, next) => {
  const config = await AttendanceConfig.getConfig();
  if (
    req.employee.employmentType === EMPLOYMENT_TYPE.FREELANCER &&
    !config.trackFreelancers
  ) {
    return next(
      new ApiError("Attendance tracking is not enabled for freelancers", 403)
    );
  }
  next();
});