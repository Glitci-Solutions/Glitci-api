import { check, query, param } from "express-validator";
import { EMPLOYMENT_TYPE } from "../../shared/constants/employee.enums.js";
import {
  ATTENDANCE_STATUS,
  LEAVE_TYPE,
  LEAVE_STATUS,
} from "../../shared/constants/attendance.enums.js";

export const locationBody = [
  check("lat").isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),
  check("lng").isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),
  check("accuracy")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Accuracy must be a positive number"),
];

export const checkInBody = [
  ...locationBody,
  check("qrToken").notEmpty().withMessage("QR token is required"),
];

export const historyQuery = [
  query("from").optional().isISO8601().withMessage("Invalid from date"),
  query("to").optional().isISO8601().withMessage("Invalid to date"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const summaryQuery = [
  query("month")
    .isInt({ min: 1, max: 12 })
    .toInt()
    .withMessage("Month must be 1–12"),
  query("year")
    .isInt({ min: 2020, max: 2100 })
    .toInt()
    .withMessage("Valid year required"),
];

export const dailyQuery = [
  query("date").optional().isISO8601().withMessage("Invalid date"),
  query("department").optional().isMongoId().withMessage("Invalid department ID"),
  query("status")
    .optional()
    .isIn(Object.values(ATTENDANCE_STATUS))
    .withMessage("Invalid status"),
  query("employmentType")
    .optional()
    .isIn(Object.values(EMPLOYMENT_TYPE))
    .withMessage("Invalid employment type"),
  query("search").optional().isString().trim(),
];

export const leaveRequestBody = [
  check("type")
    .isIn(Object.values(LEAVE_TYPE))
    .withMessage("Invalid leave type"),
  check("startDate").isISO8601().withMessage("Valid start date required"),
  check("endDate").isISO8601().withMessage("Valid end date required"),
  check("reason").notEmpty().trim().withMessage("Reason is required"),
];

export const leaveRequestsQuery = [
  query("status")
    .optional()
    .isIn(Object.values(LEAVE_STATUS))
    .withMessage("Invalid status"),
  query("employee").optional().isMongoId().withMessage("Invalid employee ID"),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
];

export const rejectLeaveBody = [
  check("reviewNote").notEmpty().withMessage("Rejection reason is required"),
];

export const manualEntryBody = [
  check("employee").isMongoId().withMessage("Valid employee ID required"),
  check("date").isISO8601().withMessage("Valid date required"),
  check("status")
    .isIn(Object.values(ATTENDANCE_STATUS))
    .withMessage("Invalid status"),
  check("checkIn").optional().isISO8601().withMessage("Invalid check-in time"),
  check("checkOut").optional().isISO8601().withMessage("Invalid check-out time"),
  check("note").optional().isString().trim(),
];

export const kioskLoginValidator = [
  check("pin")
    .isLength({ min: 4, max: 8 })
    .withMessage("PIN must be 4–8 digits"),
  check("deviceName").notEmpty().trim().withMessage("Device name is required"),
];

export const exportQuery = [
  query("month")
    .isInt({ min: 1, max: 12 })
    .toInt()
    .withMessage("Month must be 1–12"),
  query("year")
    .isInt({ min: 2020, max: 2100 })
    .toInt()
    .withMessage("Valid year required"),
  query("department").optional().isMongoId(),
];

export const mongoIdParam = [
  param("id").isMongoId().withMessage("Invalid ID format"),
];

export const deviceIdParam = [
  param("deviceId").isString().notEmpty().withMessage("Device ID is required"),
];