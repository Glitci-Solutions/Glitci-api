import bcrypt from "bcrypt";
import crypto from "crypto";
import { Attendance } from "./attendance.model.js";
import { AttendanceConfig } from "./attendanceConfig.model.js";
import { LeaveRequest } from "./leaveRequest.model.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { validateLocation } from "./geo.service.js";
import { validateQRToken, generateQRToken } from "./qr.service.js";
import { generateAttendanceWorkbook } from "./attendance.excel.js";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_SOURCE,
  LEAVE_STATUS,
} from "../../shared/constants/attendance.enums.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { getEgyptOffsetMinutes } from "../../shared/utils/egyptTimezone.js";

// ── Helpers ───────────────────────────────────────────────────────────

export function todayUTC() {
  const offsetMin = getEgyptOffsetMinutes(new Date());
  const nowCompany = new Date(Date.now() + offsetMin * 60_000);
  const d = new Date(
    Date.UTC(
      nowCompany.getUTCFullYear(),
      nowCompany.getUTCMonth(),
      nowCompany.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
  return d;
}

function resolveStatus(config) {
  const nowUTC = Date.now();
  const offsetMin = getEgyptOffsetMinutes(new Date(nowUTC));
  const nowCompanyMs = nowUTC + offsetMin * 60_000;
  const nowCompany = new Date(nowCompanyMs);

  const [startH, startM] = config.workStartTime.split(":").map(Number);
  const workStartMs =
    Date.UTC(
      nowCompany.getUTCFullYear(),
      nowCompany.getUTCMonth(),
      nowCompany.getUTCDate(),
      startH,
      startM,
      0,
      0
    ) -
    offsetMin * 60_000;

  const graceEndMs = workStartMs + config.lateGraceMinutes * 60_000;
  return nowUTC <= graceEndMs
    ? ATTENDANCE_STATUS.PRESENT
    : ATTENDANCE_STATUS.LATE;
}

// ── Config ────────────────────────────────────────────────────────────

export async function getConfigService() {
  const config = await AttendanceConfig.getConfig();
  const safe = config.toObject();
  delete safe.qrSigningSecret;
  delete safe.kioskPinHash;
  return safe;
}

export async function updateConfigService(payload) {
  const config = await AttendanceConfig.getConfig();
  const allowed = [
    "companyLocation",
    "allowedRadius",
    "workStartTime",
    "workEndTime",
    "lateGraceMinutes",
    "workDays",
    "qrLifetimeSeconds",
    "autoCheckoutTime",
    "autoAbsentTime",
    "timezone",
    "trackFreelancers",
  ];
  allowed.forEach((key) => {
    if (payload[key] !== undefined) config[key] = payload[key];
  });
  if (payload.kioskPin) {
    config.kioskPinHash = await bcrypt.hash(payload.kioskPin, 12);
  }
  await config.save();
  return config;
}

export async function rotateQRSecretService() {
  const config = await AttendanceConfig.getConfig();
  config.qrSigningSecret = crypto.randomBytes(32).toString("hex");
  await config.save();
  return config;
}

// ── Kiosk ─────────────────────────────────────────────────────────────

export async function kioskLoginService(pin, deviceName) {
  const config = await AttendanceConfig.getConfig();

  if (!config.kioskPinHash) {
    throw new ApiError(
      "Kiosk PIN not configured. Set it via PATCH /attendance/config first.",
      400
    );
  }

  const valid = await bcrypt.compare(pin, config.kioskPinHash);
  if (!valid) throw new ApiError("Invalid PIN", 401);

  const deviceId = crypto.randomUUID();
  config.activeKiosks.push({
    deviceId,
    deviceName: deviceName || null,
    lastSeen: new Date(),
  });
  await config.save();

  return { deviceId, config };
}

export async function listKiosksService() {
  const config = await AttendanceConfig.getConfig();
  return config.activeKiosks;
}

export async function revokeKioskService(deviceId) {
  const config = await AttendanceConfig.getConfig();
  config.activeKiosks = config.activeKiosks.filter(
    (k) => k.deviceId !== deviceId
  );
  await config.save();
  return config.activeKiosks;
}

// ── QR ────────────────────────────────────────────────────────────────

export async function generateQRService() {
  return generateQRToken();
}

export async function currentQRService() {
  return generateQRToken();
}

// ── Location / Check-in / Check-out ───────────────────────────────────

export async function verifyLocationService(employeeId, lat, lng) {
  const config = await AttendanceConfig.getConfig();
  const result = validateLocation(lat, lng, config);
  if (!result.withinRange) {
    throw new ApiError(
      `You are ${result.distance}m from the office. Maximum allowed: ${config.allowedRadius}m.`,
      403
    );
  }
  return { withinRange: true, distance: result.distance };
}

export async function checkInService(employeeId, qrToken, lat, lng) {
  const config = await AttendanceConfig.getConfig();

  const locationResult = validateLocation(lat, lng, config);
  if (!locationResult.withinRange) {
    throw new ApiError("GPS location not within company radius", 403);
  }

  await validateQRToken(qrToken, employeeId);

  const today = todayUTC();
  const existing = await Attendance.findOne({
    employee: employeeId,
    date: today,
  });
  if (existing?.status === ATTENDANCE_STATUS.LEAVE) {
    throw new ApiError(
      "You have an approved leave for today. Contact your manager to cancel it before checking in.",
      409
    );
  }
  if (existing?.checkIn?.time) {
    throw new ApiError("You have already checked in today", 409);
  }

  const offsetMinWork = getEgyptOffsetMinutes(new Date());
  const nowCompanyWork = new Date(Date.now() + offsetMinWork * 60_000);
  const dayOfWeek = nowCompanyWork.getUTCDay();
  if (!config.workDays.includes(dayOfWeek)) {
    throw new ApiError("Today is not a configured work day", 400);
  }

  const status = resolveStatus(config);

  const record = await Attendance.findOneAndUpdate(
    { employee: employeeId, date: today },
    {
      $set: {
        status,
        "checkIn.time": new Date(),
        "checkIn.location": { lat, lng },
        "checkIn.source": ATTENDANCE_SOURCE.QR_SCAN,
      },
    },
    { upsert: true, new: true }
  );

  return record;
}

export async function checkOutService(employeeId, lat, lng) {
  const config = await AttendanceConfig.getConfig();
  const today = todayUTC();

  const record = await Attendance.findOne({
    employee: employeeId,
    date: today,
  });
  if (!record?.checkIn?.time) {
    throw new ApiError("You have not checked in today", 400);
  }
  if (record?.checkOut?.time) {
    throw new ApiError("You have already checked out today", 409);
  }

  const locationResult = validateLocation(lat, lng, config);
  if (!locationResult.withinRange) {
    throw new ApiError("GPS location not within company radius", 403);
  }

  const checkOutTime = new Date();
  const durationMinutes = Math.round(
    (checkOutTime - record.checkIn.time) / 60000
  );

  const updated = await Attendance.findOneAndUpdate(
    { _id: record._id },
    {
      $set: {
        "checkOut.time": checkOutTime,
        "checkOut.location": { lat, lng },
        "checkOut.source": ATTENDANCE_SOURCE.QR_SCAN,
        durationMinutes,
      },
    },
    { new: true }
  );

  return updated;
}

// ── My Attendance ─────────────────────────────────────────────────────

export async function getMyTodayService(employeeId) {
  const today = todayUTC();
  const record = await Attendance.findOne({
    employee: employeeId,
    date: today,
  });
  return record || null;
}

export async function getMyHistoryService(employeeId, from, to, page, limit) {
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.max(Number(limit) || 30, 1);
  const filter = { employee: employeeId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Attendance.countDocuments(filter),
  ]);
  return {
    data: records,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  };
}

export async function getMySummaryService(employeeId, month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const records = await Attendance.find({
    employee: employeeId,
    date: { $gte: start, $lte: end },
  });
  const summary = {
    total: records.length,
    present: records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT)
      .length,
    late: records.filter((r) => r.status === ATTENDANCE_STATUS.LATE).length,
    absent: records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT)
      .length,
    leave: records.filter((r) => r.status === ATTENDANCE_STATUS.LEAVE).length,
    totalMinutes: records.reduce(
      (sum, r) => sum + (r.durationMinutes || 0),
      0
    ),
  };
  return { summary, records };
}

// ── Leave Requests ────────────────────────────────────────────────────

export async function submitLeaveRequestService(employeeId, payload) {
  const { type, startDate, endDate, reason } = payload;
  const lr = await LeaveRequest.create({
    type,
    startDate,
    endDate,
    reason,
    employee: employeeId,
  });
  return lr;
}

export async function getMyLeaveRequestsService(employeeId) {
  const requests = await LeaveRequest.find({ employee: employeeId }).sort({
    createdAt: -1,
  });
  return requests;
}

export async function getAllLeaveRequestsService(query) {
  const { status, employee, from, to } = query;
  const filter = {};
  if (status) filter.status = status;
  if (employee) filter.employee = employee;
  if (from || to) {
    filter.startDate = {};
    if (from) filter.startDate.$gte = new Date(from);
    if (to) filter.startDate.$lte = new Date(to);
  }
  const requests = await LeaveRequest.find(filter)
    .populate({
      path: "employee",
      populate: { path: "user", select: "name email" },
    })
    .sort({ createdAt: -1 });
  return requests;
}

export async function approveLeaveRequestService(id, reviewedById) {
  const lr = await LeaveRequest.findByIdAndUpdate(
    id,
    {
      status: LEAVE_STATUS.APPROVED,
      reviewedBy: reviewedById,
      reviewedAt: new Date(),
    },
    { new: true }
  );
  if (!lr) throw new ApiError("Leave request not found", 404);
  await createLeaveAttendanceRecords(lr);
  return lr;
}

export async function rejectLeaveRequestService(id, reviewNote, reviewedById) {
  const lr = await LeaveRequest.findByIdAndUpdate(
    id,
    {
      status: LEAVE_STATUS.REJECTED,
      reviewedBy: reviewedById,
      reviewNote,
      reviewedAt: new Date(),
    },
    { new: true }
  );
  if (!lr) throw new ApiError("Leave request not found", 404);
  return lr;
}

async function createLeaveAttendanceRecords(lr) {
  const days = [];
  const current = new Date(lr.startDate);
  current.setUTCHours(0, 0, 0, 0);
  const end = new Date(lr.endDate);
  end.setUTCHours(0, 0, 0, 0);
  while (current <= end) {
    const day = new Date(current);
    day.setUTCHours(0, 0, 0, 0);
    days.push(day);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  await Promise.allSettled(
    days.map((date) =>
      Attendance.findOneAndUpdate(
        { employee: lr.employee, date },
        {
          $setOnInsert: {
            status: ATTENDANCE_STATUS.LEAVE,
            leaveRequest: lr._id,
          },
        },
        { upsert: true }
      )
    )
  );
}

// ── Admin / Manager Reports ───────────────────────────────────────────

export async function getDailyAttendanceService(query) {
  const { date, department, status, employmentType, search } = query;
  const targetDate = date
    ? (() => {
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      })()
    : todayUTC();

  const empQuery = EmployeeModel.find({})
    .populate({
      path: "user",
      match: { isActive: true },
      select: "name email isActive",
    })
    .populate("department", "name");

  if (department) empQuery.where("department").equals(department);
  if (employmentType) empQuery.where("employmentType").equals(employmentType);

  let employees = await empQuery;
  employees = employees.filter((e) => e.user !== null);

  if (search) {
    const regex = new RegExp(search, "i");
    employees = employees.filter((e) => regex.test(e.user?.name || ""));
  }
  const empIds = employees.map((e) => e._id);

  const records = await Attendance.find({
    employee: { $in: empIds },
    date: targetDate,
  });
  const recordMap = Object.fromEntries(
    records.map((r) => [r.employee.toString(), r])
  );

  let result = employees.map((emp) => ({
    employee: {
      _id: emp._id,
      name: emp.user?.name,
      email: emp.user?.email,
      department: emp.department,
    },
    attendance:
      recordMap[emp._id.toString()] || { status: ATTENDANCE_STATUS.ABSENT },
  }));

  if (status) result = result.filter((r) => r.attendance.status === status);

  return { data: result, date: targetDate };
}

export async function getMonthlySummaryService(month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const records = await Attendance.find({
    date: { $gte: start, $lte: end },
  }).populate({
    path: "employee",
    populate: [
      { path: "user", select: "name email" },
      { path: "department", select: "name" },
    ],
  });

  const grouped = {};
  for (const r of records) {
    const empId = r.employee?._id?.toString();
    if (!empId) continue;

    if (!grouped[empId]) {
      grouped[empId] = {
        employee: {
          _id: r.employee._id,
          name: r.employee.user?.name,
          email: r.employee.user?.email,
          department: r.employee.department,
          employmentType: r.employee.employmentType,
        },
        summary: {
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          leave: 0,
          totalMinutes: 0,
        },
        records: [],
      };
    }

    const g = grouped[empId];
    g.summary.total += 1;
    if (r.status === ATTENDANCE_STATUS.PRESENT) g.summary.present += 1;
    if (r.status === ATTENDANCE_STATUS.LATE) g.summary.late += 1;
    if (r.status === ATTENDANCE_STATUS.ABSENT) g.summary.absent += 1;
    if (r.status === ATTENDANCE_STATUS.LEAVE) g.summary.leave += 1;
    g.summary.totalMinutes += r.durationMinutes || 0;

    g.records.push(r);
  }

  return Object.values(grouped);
}

export async function getEmployeeHistoryService(
  employeeId,
  from,
  to,
  page,
  limit
) {
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.max(Number(limit) || 30, 1);
  const filter = { employee: employeeId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  const records = await Attendance.find(filter)
    .sort({ date: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);
  return records;
}

// ── Manual Entry ──────────────────────────────────────────────────────

export async function manualEntryService(payload) {
  const { employee, date, status, checkIn, checkOut, note } = payload;
  const dateObj = new Date(date);
  dateObj.setUTCHours(0, 0, 0, 0);

  const checkInTime = checkIn ? new Date(checkIn) : null;
  const checkOutTime = checkOut ? new Date(checkOut) : null;

  // Validate checkIn/checkOut fall on the same calendar date
  if (checkInTime) {
    const ciDate = new Date(checkInTime);
    ciDate.setUTCHours(0, 0, 0, 0);
    if (ciDate.getTime() !== dateObj.getTime()) {
      throw new ApiError(
        `Check-in time must fall on the attendance date (${date}). Got: ${checkIn}`,
        400
      );
    }
  }
  if (checkOutTime) {
    const coDate = new Date(checkOutTime);
    coDate.setUTCHours(0, 0, 0, 0);
    if (coDate.getTime() !== dateObj.getTime()) {
      throw new ApiError(
        `Check-out time must fall on the attendance date (${date}). Got: ${checkOut}`,
        400
      );
    }
  }

  if (checkInTime && checkOutTime && checkOutTime <= checkInTime) {
    throw new ApiError("Check-out time must be after check-in time", 400);
  }

  // Check for existing record — prevent silent overwrites
  const existing = await Attendance.findOne({ employee, date: dateObj });
  if (existing) {
    throw new ApiError(
      `An attendance record already exists for this employee on ${date} (ID: ${existing._id}). Use PATCH /manual/${existing._id} to update it.`,
      409
    );
  }

  const durationMinutes =
    checkInTime && checkOutTime
      ? Math.round((checkOutTime - checkInTime) / 60000)
      : undefined;

  const record = await Attendance.create({
    employee,
    date: dateObj,
    status,
    note,
    ...(checkInTime && {
      checkIn: {
        time: checkInTime,
        source: ATTENDANCE_SOURCE.MANUAL,
      },
    }),
    ...(checkOutTime && {
      checkOut: {
        time: checkOutTime,
        source: ATTENDANCE_SOURCE.MANUAL,
      },
    }),
    ...(durationMinutes !== undefined && { durationMinutes }),
  });
  return record;
}

export async function updateManualEntryService(id, payload) {
  const { status, note, checkIn, checkOut } = payload;

  const existing = await Attendance.findById(id);
  if (!existing) throw new ApiError("Attendance record not found", 404);

  const recordDate = new Date(existing.date);
  recordDate.setUTCHours(0, 0, 0, 0);

  const updates = {};
  if (status !== undefined) updates.status = status;
  if (note !== undefined) updates.note = note;
  if (checkIn !== undefined) {
    const ciTime = new Date(checkIn);
    const ciDate = new Date(ciTime);
    ciDate.setUTCHours(0, 0, 0, 0);
    if (ciDate.getTime() !== recordDate.getTime()) {
      throw new ApiError(
        `Check-in time must fall on the record date (${existing.date.toISOString().slice(0, 10)}). Got: ${checkIn}`,
        400
      );
    }
    updates["checkIn.time"] = ciTime;
    updates["checkIn.source"] = ATTENDANCE_SOURCE.MANUAL;
  }
  if (checkOut !== undefined) {
    const coTime = new Date(checkOut);
    const coDate = new Date(coTime);
    coDate.setUTCHours(0, 0, 0, 0);
    if (coDate.getTime() !== recordDate.getTime()) {
      throw new ApiError(
        `Check-out time must fall on the record date (${existing.date.toISOString().slice(0, 10)}). Got: ${checkOut}`,
        400
      );
    }
    updates["checkOut.time"] = coTime;
    updates["checkOut.source"] = ATTENDANCE_SOURCE.MANUAL;
  }

  const resolvedCheckIn = updates["checkIn.time"] ?? existing.checkIn?.time;
  const resolvedCheckOut =
    updates["checkOut.time"] ?? existing.checkOut?.time;

  if (resolvedCheckIn && resolvedCheckOut && new Date(resolvedCheckOut) <= new Date(resolvedCheckIn)) {
    throw new ApiError("Check-out time must be after check-in time", 400);
  }

  if (resolvedCheckIn && resolvedCheckOut) {
    updates.durationMinutes = Math.round(
      (new Date(resolvedCheckOut) - new Date(resolvedCheckIn)) / 60000
    );
  }

  const record = await Attendance.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true }
  );
  return record;
}

export async function deleteRecordService(id) {
  const record = await Attendance.findByIdAndDelete(id);
  if (!record) throw new ApiError("Attendance record not found", 404);
  return record;
}

// ── Export ────────────────────────────────────────────────────────────

export async function exportExcelService(month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const records = await Attendance.find({ date: { $gte: start, $lte: end } })
    .populate({
      path: "employee",
      populate: [
        { path: "user", select: "name email" },
        { path: "department", select: "name" },
      ],
    })
    .sort({ date: 1 });

  const workbook = generateAttendanceWorkbook(records);
  const filename = `attendance-${year}-${String(month).padStart(2, "0")}.xlsx`;
  return { workbook, filename };
}
