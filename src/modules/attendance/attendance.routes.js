import { Router } from "express";
import { kioskLoginLimiter } from "../../shared/middlewares/rateLimitMiddleware.js";
import { protect, allowedTo } from "../auth/auth.middleware.js";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";
import { USER_ROLES } from "../../shared/constants/userRoles.enums.js";
import {
  kioskAuth,
  resolveEmployee,
  freelancerGuard,
} from "./attendance.middleware.js";
import {
  locationBody,
  checkInBody,
  historyQuery,
  summaryQuery,
  dailyQuery,
  leaveRequestBody,
  leaveRequestsQuery,
  rejectLeaveBody,
  manualEntryBody,
  kioskLoginValidator,
  exportQuery,
  mongoIdParam,
  deviceIdParam,
} from "./attendance.validator.js";
import {
  getConfig,
  updateConfig,
  rotateQRSecret,
  kioskLogin,
  listKiosks,
  revokeKiosk,
  generateQR,
  currentQR,
  verifyLocation,
  checkIn,
  checkOut,
  myToday,
  myHistory,
  mySummary,
  submitLeaveRequest,
  myLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getDailyAttendance,
  getMonthlySummary,
  getEmployeeHistory,
  manualEntry,
  updateManualEntry,
  deleteRecord,
  exportExcel,
} from "./attendance.controller.js";

const router = Router();

router.get("/config",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  getConfig
);
router.patch("/config",
  protect, allowedTo(USER_ROLES.ADMIN),
  updateConfig
);
router.post("/config/rotate-qr-secret",
  protect, allowedTo(USER_ROLES.ADMIN),
  rotateQRSecret
);

router.post("/kiosk/login",
  kioskLoginLimiter,
  kioskLoginValidator, validatorMiddleware,
  kioskLogin
);
router.get("/kiosks",
  protect, allowedTo(USER_ROLES.ADMIN),
  listKiosks
);
router.delete("/kiosks/:deviceId",
  protect, allowedTo(USER_ROLES.ADMIN),
  deviceIdParam, validatorMiddleware,
  revokeKiosk
);

router.post("/qr/generate", kioskAuth, generateQR);
router.get("/qr/current",   kioskAuth, currentQR);

router.post("/verify-location",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
  resolveEmployee,
  locationBody, validatorMiddleware,
  verifyLocation
);
router.post("/check-in",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
  resolveEmployee, freelancerGuard,
  checkInBody, validatorMiddleware,
  checkIn
);
router.post("/check-out",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
  resolveEmployee, freelancerGuard,
  locationBody, validatorMiddleware,
  checkOut
);

router.get("/my/today",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
  resolveEmployee,
  myToday
);
router.get("/my",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
  resolveEmployee,
  historyQuery, validatorMiddleware,
  myHistory
);
router.get("/my/summary",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
  resolveEmployee,
  summaryQuery, validatorMiddleware,
  mySummary
);

router.post("/leave-requests",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
  resolveEmployee,
  leaveRequestBody, validatorMiddleware,
  submitLeaveRequest
);
router.get("/my/leave-requests",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
  resolveEmployee,
  myLeaveRequests
);
router.get("/leave-requests",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  leaveRequestsQuery, validatorMiddleware,
  getAllLeaveRequests
);
router.patch("/leave-requests/:id/approve",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  mongoIdParam, validatorMiddleware,
  approveLeaveRequest
);
router.patch("/leave-requests/:id/reject",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  mongoIdParam, rejectLeaveBody, validatorMiddleware,
  rejectLeaveRequest
);

router.get("/daily",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.OPERATION),
  dailyQuery, validatorMiddleware,
  getDailyAttendance
);
router.get("/summary",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.OPERATION),
  summaryQuery, validatorMiddleware,
  getMonthlySummary
);
router.get("/employee/:id",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.OPERATION),
  mongoIdParam, historyQuery, validatorMiddleware,
  getEmployeeHistory
);
router.post("/manual",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  manualEntryBody, validatorMiddleware,
  manualEntry
);
router.patch("/manual/:id",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  mongoIdParam, manualEntryBody, validatorMiddleware,
  updateManualEntry
);
router.delete("/:id",
  protect, allowedTo(USER_ROLES.ADMIN),
  mongoIdParam, validatorMiddleware,
  deleteRecord
);

router.get("/export",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  exportQuery, validatorMiddleware,
  exportExcel
);

export default router;