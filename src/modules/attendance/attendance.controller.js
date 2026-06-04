import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import {
  getConfigService,
  updateConfigService,
  rotateQRSecretService,
  kioskLoginService,
  listKiosksService,
  revokeKioskService,
  generateQRService,
  currentQRService,
  verifyLocationService,
  checkInService,
  checkOutService,
  getMyTodayService,
  getMyHistoryService,
  getMySummaryService,
  submitLeaveRequestService,
  getMyLeaveRequestsService,
  getAllLeaveRequestsService,
  approveLeaveRequestService,
  rejectLeaveRequestService,
  getDailyAttendanceService,
  getMonthlySummaryService,
  getEmployeeHistoryService,
  manualEntryService,
  updateManualEntryService,
  deleteRecordService,
  exportExcelService,
} from "./attendance.service.js";

// ── Config ────────────────────────────────────────────────────────────

export const getConfig = asyncHandler(async (req, res) => {
  const config = await getConfigService();
  res.json({ data: config });
});

export const updateConfig = asyncHandler(async (req, res) => {
  await updateConfigService(req.body);
  res.json({ message: "Config updated successfully" });
});

export const rotateQRSecret = asyncHandler(async (req, res) => {
  await rotateQRSecretService();
  res.json({
    message: "QR signing secret rotated. All existing QR codes are now invalid.",
  });
});

// ── Kiosk ─────────────────────────────────────────────────────────────

export const kioskLogin = asyncHandler(async (req, res) => {
  const { pin, deviceName } = req.body;
  const { deviceId } = await kioskLoginService(pin, deviceName);

  const token = jwt.sign(
    { deviceId, deviceName },
    process.env.KIOSK_JWT_SECRET,
    { expiresIn: "90d" }
  );

  res.cookie("kioskToken", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 90 * 24 * 60 * 60 * 1000,
  });

  res.json({ message: "Kiosk authenticated successfully", deviceId });
});

export const listKiosks = asyncHandler(async (req, res) => {
  const kiosks = await listKiosksService();
  res.json({ data: kiosks });
});

export const revokeKiosk = asyncHandler(async (req, res) => {
  await revokeKioskService(req.params.deviceId);
  res.json({ message: "Kiosk revoked successfully" });
});

// ── QR ────────────────────────────────────────────────────────────────

export const generateQR = asyncHandler(async (req, res) => {
  const { token, expiresAt } = await generateQRService();
  res.json({ data: { token, expiresAt } });
});

export const currentQR = asyncHandler(async (req, res) => {
  const { token, expiresAt } = await currentQRService();
  res.json({ data: { token, expiresAt } });
});

// ── Location / Check-in / Check-out ───────────────────────────────────

export const verifyLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  const result = await verifyLocationService(req.employee._id, lat, lng);
  res.json({ data: result });
});

export const checkIn = asyncHandler(async (req, res) => {
  const { lat, lng, qrToken } = req.body;
  const record = await checkInService(req.employee._id, qrToken, lat, lng);
  res.status(201).json({ data: record });
});

export const checkOut = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  const record = await checkOutService(req.employee._id, lat, lng);
  res.json({ data: record });
});

// ── My Attendance ─────────────────────────────────────────────────────

export const myToday = asyncHandler(async (req, res) => {
  const record = await getMyTodayService(req.employee._id);
  res.json({ data: record });
});

export const myHistory = asyncHandler(async (req, res) => {
  const { from, to, page, limit } = req.query;
  const result = await getMyHistoryService(
    req.employee._id,
    from,
    to,
    page,
    limit
  );
  res.json(result);
});

export const mySummary = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const { summary, records } = await getMySummaryService(
    req.employee._id,
    month,
    year
  );
  res.json({ data: { summary, records } });
});

// ── Leave Requests ────────────────────────────────────────────────────

export const submitLeaveRequest = asyncHandler(async (req, res) => {
  const lr = await submitLeaveRequestService(req.employee._id, req.body);
  res.status(201).json({ data: lr });
});

export const myLeaveRequests = asyncHandler(async (req, res) => {
  const requests = await getMyLeaveRequestsService(req.employee._id);
  res.json({ data: requests });
});

export const getAllLeaveRequests = asyncHandler(async (req, res) => {
  const requests = await getAllLeaveRequestsService(req.query);
  res.json({ data: requests });
});

export const approveLeaveRequest = asyncHandler(async (req, res) => {
  const lr = await approveLeaveRequestService(req.params.id, req.user._id);
  res.json({ data: lr });
});

export const rejectLeaveRequest = asyncHandler(async (req, res) => {
  const lr = await rejectLeaveRequestService(
    req.params.id,
    req.body.reviewNote,
    req.user._id
  );
  res.json({ data: lr });
});

// ── Admin / Manager Reports ───────────────────────────────────────────

export const getDailyAttendance = asyncHandler(async (req, res) => {
  const result = await getDailyAttendanceService(req.query);
  res.json(result);
});

export const getMonthlySummary = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const records = await getMonthlySummaryService(month, year);
  res.json({ data: records });
});

export const getEmployeeHistory = asyncHandler(async (req, res) => {
  const { from, to, page, limit } = req.query;
  const records = await getEmployeeHistoryService(
    req.params.id,
    from,
    to,
    page,
    limit
  );
  res.json({ data: records });
});

export const manualEntry = asyncHandler(async (req, res) => {
  const record = await manualEntryService(req.body);
  res.status(201).json({ data: record });
});

export const updateManualEntry = asyncHandler(async (req, res) => {
  const record = await updateManualEntryService(req.params.id, req.body);
  res.json({ data: record });
});

export const deleteRecord = asyncHandler(async (req, res) => {
  await deleteRecordService(req.params.id);
  res.json({ message: "Attendance record deleted successfully" });
});

export const exportExcel = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const { workbook, filename } = await exportExcelService(month, year);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});
