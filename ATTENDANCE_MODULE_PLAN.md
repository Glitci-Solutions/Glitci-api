# ATTENDANCE_MODULE_PLAN.md
# Glitci — Attendance Module: Full Backend Specification

> **Status:** Pending — Backend not yet built. No UI/UX designs exist yet.
>
> **Workflow:**
> 1. Build and fully test the backend using this document as the spec.
> 2. Write a feature description `.md` and send it to Claude Design to generate UI/UX screens.
> 3. Export the full UI/UX from Claude Design.
> 4. Return to `DESIGN.md` with the new backend folder + new UI/UX export to add the frontend Attendance phase.
>
> **Do not begin frontend Attendance work until all three pre-conditions above are met.**

---

## Codebase Convention Fixes Applied

This version corrects 17 mismatches between the original plan and the actual Glitci codebase conventions, plus adds rate limiting on kiosk login and locks down architectural decisions. Every code block in this document follows the existing patterns.

| # | Was Wrong | Now Correct |
|---|---|---|
| 1 | `export default mongoose.model(...)` | Named export + Mongoose guard: `export const Model = mongoose.models.X \|\| mongoose.model(...)` |
| 2 | `import bcryptjs` | `import bcrypt from "bcrypt"` (v6, already in package.json) |
| 3 | Enums in module folder | `src/shared/constants/attendance.enums.js` |
| 4 | `../../middlewares/auth.middleware.js` | `../auth/auth.middleware.js` |
| 5 | `../../middlewares/validator.middleware.js` | `../../shared/middlewares/validatorMiddleware.js` (camelCase) |
| 6 | `res.json({ status: "success", data: ... })` | No `status` field — follow per-module response shape |
| 7 | `import * as controller from "..."` | Named imports: `import { fn1, fn2 } from "..."` |
| 8 | `import * as validators from "..."` | Named imports per validator array |
| 9 | Start crons in `src/app/index.js` | Start crons in `server.js` after DB connection |
| 10 | `req.user.employeeId` | `req.employee._id` via `resolveEmployee` middleware |
| 11 | `return res.status(401).json({ message })` in middleware | `next(new ApiError("message", 401))` |
| 12 | `import ExcelJS from "exceljs"` | `import exceljs from "exceljs"` (lowercase) |
| 13 | Excel logic inline in controller | Extracted to `attendance.excel.js` |
| 14 | Hardcoded `"admin"`, `"operation"` strings | `USER_ROLES.ADMIN`, `USER_ROLES.OPERATION` etc. |
| 15 | `required: true` | `required: [true, "Field name is required"]` |
| 16 | `node-cron` assumed present | `npm install node-cron` — not in package.json |
| 17 | `KIOSK_JWT_SECRET` undocumented | Generation command + `.env` entry documented |
| +1 | No rate limit on kiosk login | Rate limiter added to `rateLimitMiddleware.js`, imported into routes |
| +2 | `ApiError(statusCode, message)` reversed | `ApiError(message, statusCode)` — matches actual constructor signature |
| +3 | `Employee` import name | `EmployeeModel` — matches actual named export |
| +4 | `USER_ROLES` path wrong | `../../shared/constants/userRoles.enums.js` |
| +5 | `ApiError` default import, lowercase filename | `{ ApiError }` named import from `../../shared/utils/ApiError.js` |
| +6 | `isActive` on Employee model | `isActive` is on User — filter via populate match |
| +7 | Populate `employee` → `name email` directly | Nested populate via `user` sub-document |
| +8 | `express.Router()` | `import { Router } from "express"` then `Router()` |
| +9 | Rate limiter inline in routes | Moved to `src/shared/middlewares/rateLimitMiddleware.js` |
| +10 | String literals in controller | `LEAVE_STATUS.APPROVED`, `LEAVE_STATUS.REJECTED`, `ATTENDANCE_STATUS.ABSENT`, `ATTENDANCE_SOURCE.MANUAL` |
| +11 | No param validators on `:id` routes | `mongoIdParam` + `deviceIdParam` added to all 6 param routes |
| +12 | Hardcoded `employmentType` array | `Object.values(EMPLOYMENT_TYPE)` from `employee.enums.js` |
| +13 | `generateAttendanceWorkbook` marked `async` unnecessarily | Changed to synchronous — no `await` inside |

**Architectural decisions locked down:**
- **Timezone:** Configurable via `AttendanceConfig.timezone` field (default `"Africa/Cairo"`). Crons read this at startup. Changing timezone requires server restart (documented).
- **Cron reschedule:** Fixed at server start using config values. No dynamic rescheduling.
- **Employee resolution:** `resolveEmployee` middleware on all employee-context routes — attaches `req.employee`. Services receive `req.employee._id` directly.
- **Config seed:** `AttendanceConfig.getConfig()` called once in `server.js` after DB connect — creates singleton if not present.

---

## Pre-Conditions Before Starting

- [ ] All 14 existing backend modules deployed and tested
- [ ] MongoDB Atlas cluster running with existing Glitci collections
- [ ] Existing `.env` has `JWT_SECRET`, `SMTP_*`, `MONGODB_URI` configured
- [ ] `node-cron` installed: `npm install node-cron`
- [ ] `KIOSK_JWT_SECRET` added to `.env` (see Section 14)
- [ ] Decision made on kiosk hardware (tablet model, fixed to wall vs portable)
- [ ] Company GPS coordinates (lat/lng) known for seeding the config

---

## 1. Module Overview — What Attendance Does

Glitci's Attendance module gives companies a full workforce presence tracking system built on two layers of verification: **QR code** (scanned at the physical office device) + **GPS** (employee's phone must be within the configured radius).

### Core Flows

**Employee Check-In (the main flow):**
1. Employee opens the app on their phone
2. App requests GPS location from the browser
3. GPS coordinates sent to `POST /attendance/verify-location` — backend checks distance using Haversine formula
4. If within range: frontend activates the QR scanner
5. Employee points camera at the office kiosk QR code
6. QR token + GPS coords sent to `POST /attendance/check-in`
7. Backend validates: QR token valid + not expired + not used + GPS within range + not already checked in
8. Attendance record created with `status: "present"` or `"late"` depending on work start time

**Kiosk QR Display (office device):**
1. Admin sets up a tablet/screen at the office entrance
2. Admin opens `/attendance/qr-display/setup` and enters the admin PIN
3. Kiosk receives a long-lived JWT (90 days) stored in the browser
4. Kiosk page auto-refreshes QR code every 60 seconds
5. Each QR encodes a signed token (HMAC-SHA256 with `qrSigningSecret`) with a 60s expiry

**Admin/Operation Views:**
- Daily attendance table: who's in, who's late, who's absent, manual entry option
- Monthly summary: company-wide and per-department stats
- Leave requests: approve/reject employee requests
- Config: set GPS coordinates, radius, work hours, QR lifetime, cron times, timezone

---

## 2. Constants File

**Path:** `src/shared/constants/attendance.enums.js`

> ⚠️ Fix #3: Enums belong in `src/shared/constants/`, not in the module folder. This matches the existing pattern for `USER_ROLES` and other shared constants.

```javascript
export const ATTENDANCE_STATUS = Object.freeze({
  PRESENT:  "present",
  LATE:     "late",
  ABSENT:   "absent",
  LEAVE:    "leave",
  HALF_DAY: "half_day",
  HOLIDAY:  "holiday",
});

export const LEAVE_TYPE = Object.freeze({
  SICK:     "sick",
  VACATION: "vacation",
  PERSONAL: "personal",
  UNPAID:   "unpaid",
});

export const ATTENDANCE_SOURCE = Object.freeze({
  QR_SCAN:       "qr_scan",
  MANUAL:        "manual",
  AUTO_CHECKOUT: "auto_checkout",
  AUTO_ABSENT:   "auto_absent",
});

export const LEAVE_STATUS = Object.freeze({
  PENDING:  "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});
```

---

## 3. Folder Structure

```
src/
  shared/
    constants/
      attendance.enums.js      # ← NEW (enums go here, not in module)
  modules/
    attendance/
      attendance.routes.js
      attendance.validator.js
      attendance.controller.js
      attendance.service.js
      qr.service.js
      geo.service.js
      attendance.middleware.js  # kioskAuth + resolveEmployee + freelancerGuard
      attendance.excel.js       # Excel workbook generation (extracted from controller)
      attendance.model.js
      attendanceConfig.model.js
      leaveRequest.model.js
      qrToken.model.js
  cron/
    attendance.cron.js          # ← NEW (cron jobs live here, started from server.js)
```

Mount in `src/app/routes.js` (existing file):
```javascript
import attendanceRoutes from "../modules/attendance/attendance.routes.js";
app.use("/api/v1/attendance", attendanceRoutes);
```

Warm up config singleton + start crons in `server.js` (existing entry point), after `mountRoutes(app)`:
```javascript
import { AttendanceConfig } from "./modules/attendance/attendanceConfig.model.js";
import { startAutoCheckoutCron, startAutoAbsentCron } from "./cron/attendance.cron.js";

// After DB connection established:
await AttendanceConfig.getConfig(); // Seeds singleton if not present
startAutoCheckoutCron();
startAutoAbsentCron();
```

---

## 4. MongoDB Models

> ⚠️ Fixes #1, #15 applied to all models: named exports with Mongoose guard, `required: [true, "message"]` pattern.

### 4.1 `attendance.model.js`

```javascript
import mongoose from "mongoose";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_SOURCE,
} from "../../shared/constants/attendance.enums.js";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      // Always store as start-of-day UTC: new Date(dateString) with time zeroed
    },
    checkIn: {
      time: Date,
      location: {
        lat: Number,
        lng: Number,
        accuracy: Number,
      },
      source: {
        type: String,
        enum: Object.values(ATTENDANCE_SOURCE),
        default: ATTENDANCE_SOURCE.QR_SCAN,
      },
    },
    checkOut: {
      time: Date,
      location: {
        lat: Number,
        lng: Number,
        accuracy: Number,
      },
      source: {
        type: String,
        enum: Object.values(ATTENDANCE_SOURCE),
      },
    },
    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      required: [true, "Status is required"],
    },
    durationMinutes: Number, // Computed on checkout: (checkOut.time - checkIn.time) / 60000
    note: String,            // Admin notes for manual entries
    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
    },
  },
  { timestamps: true }
);

// One record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ employee: 1, date: -1 });

export const Attendance =
  mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
```

### 4.2 `attendanceConfig.model.js`

```javascript
import mongoose from "mongoose";
import crypto from "crypto";

const attendanceConfigSchema = new mongoose.Schema(
  {
    companyLocation: {
      lat: { type: Number, required: [true, "Latitude is required"], default: 30.0444 },
      lng: { type: Number, required: [true, "Longitude is required"], default: 31.2357 },
    },
    allowedRadius:    { type: Number, default: 100 },    // meters
    workStartTime:    { type: String, default: "09:00" }, // "HH:MM"
    workEndTime:      { type: String, default: "17:00" },
    lateGraceMinutes: { type: Number, default: 15 },
    workDays: {
      type: [Number],
      default: [0, 1, 2, 3, 4], // 0=Sun … 6=Sat
    },
    qrLifetimeSeconds: { type: Number, default: 60 },
    qrSigningSecret: {
      type: String,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
    kioskPinHash: String, // bcrypt hash — never returned in API responses
    activeKiosks: [
      {
        deviceId:   String,
        deviceName: String,
        lastSeen:   Date,
        createdAt:  { type: Date, default: Date.now },
      },
    ],
    autoCheckoutTime: { type: String, default: "20:00" }, // cron reads at startup
    autoAbsentTime:   { type: String, default: "20:30" },
    // ⚠️ Timezone: configurable — changing requires server restart for crons to pick up
    timezone: { type: String, default: "Africa/Cairo" },
    trackFreelancers: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Singleton accessor — creates the document on first call if not present
attendanceConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) config = await this.create({});
  return config;
};

export const AttendanceConfig =
  mongoose.models.AttendanceConfig ||
  mongoose.model("AttendanceConfig", attendanceConfigSchema);
```

### 4.3 `leaveRequest.model.js`

```javascript
import mongoose from "mongoose";
import {
  LEAVE_TYPE,
  LEAVE_STATUS,
} from "../../shared/constants/attendance.enums.js";

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee is required"],
    },
    type: {
      type: String,
      enum: Object.values(LEAVE_TYPE),
      required: [true, "Leave type is required"],
    },
    startDate: { type: Date, required: [true, "Start date is required"] },
    endDate:   { type: Date, required: [true, "End date is required"] },
    reason:    { type: String, required: [true, "Reason is required"] },
    status: {
      type: String,
      enum: Object.values(LEAVE_STATUS),
      default: LEAVE_STATUS.PENDING,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewNote: String,
    reviewedAt: Date,
  },
  { timestamps: true }
);

leaveRequestSchema.index({ employee: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });

export const LeaveRequest =
  mongoose.models.LeaveRequest ||
  mongoose.model("LeaveRequest", leaveRequestSchema);
```

### 4.4 `qrToken.model.js` — Replay Protection Registry

```javascript
import mongoose from "mongoose";

const qrTokenSchema = new mongoose.Schema(
  {
    token:  { type: String, required: [true, "Token is required"], unique: true },
    usedAt: { type: Date, default: Date.now },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: false }
);

// Auto-delete used tokens after 5 minutes (tokens expire in 60s anyway)
qrTokenSchema.index({ usedAt: 1 }, { expireAfterSeconds: 300 });

export const QRToken =
  mongoose.models.QRToken || mongoose.model("QRToken", qrTokenSchema);
```

---

## 5. Services

> Import enums from `src/shared/constants/attendance.enums.js` in all service files.

### 5.1 `qr.service.js`

```javascript
import crypto from "crypto";
import { AttendanceConfig } from "./attendanceConfig.model.js";
import { QRToken } from "./qrToken.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";

export async function generateQRToken() {
  const config = await AttendanceConfig.getConfig();
  const issuedAt = Date.now();
  const expiresAt = issuedAt + config.qrLifetimeSeconds * 1000;
  const payload = `${issuedAt}.${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", config.qrSigningSecret)
    .update(payload)
    .digest("hex");
  const token = Buffer.from(JSON.stringify({ issuedAt, expiresAt, signature }))
    .toString("base64url");
  return { token, expiresAt };
}

export async function validateQRToken(token, employeeId) {
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    throw new ApiError("Invalid QR token format", 400);
  }

  const { issuedAt, expiresAt, signature } = parsed;

  if (Date.now() > expiresAt) throw new ApiError("QR token has expired", 400);

  const config = await AttendanceConfig.getConfig();
  const expectedSig = crypto
    .createHmac("sha256", config.qrSigningSecret)
    .update(`${issuedAt}.${expiresAt}`)
    .digest("hex");
  if (signature !== expectedSig) throw new ApiError("QR token signature invalid", 400);

  const alreadyUsed = await QRToken.findOne({ token });
  if (alreadyUsed) throw new ApiError("QR token has already been used", 400);

  // Mark as used atomically
  await QRToken.create({ token, usedBy: employeeId });

  return { valid: true };
}
```

### 5.2 `geo.service.js`

```javascript
const EARTH_RADIUS_METERS = 6371000;

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.asin(Math.sqrt(a));
}

export async function validateLocation(lat, lng, config) {
  const distance = haversineDistance(
    lat,
    lng,
    config.companyLocation.lat,
    config.companyLocation.lng
  );
  return {
    withinRange: distance <= config.allowedRadius,
    distance: Math.round(distance),
  };
}
```

### 5.3 `attendance.service.js`

> ⚠️ Fix #10: Services receive `employeeId` from `req.employee._id` (passed by controller).
> No `req.user.employeeId` anywhere — `req.user` is the User doc with no `employeeId` field.

```javascript
import { Attendance } from "./attendance.model.js";
import { AttendanceConfig } from "./attendanceConfig.model.js";
import { validateQRToken } from "./qr.service.js";
import { validateLocation } from "./geo.service.js";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_SOURCE,
} from "../../shared/constants/attendance.enums.js";
import { ApiError } from "../../shared/utils/ApiError.js";

function todayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function resolveStatus(config) {
  const now = new Date();
  const [startH, startM] = config.workStartTime.split(":").map(Number);
  const workStart = new Date(now);
  workStart.setHours(startH, startM, 0, 0);
  const graceEnd = new Date(workStart.getTime() + config.lateGraceMinutes * 60000);
  return now <= graceEnd ? ATTENDANCE_STATUS.PRESENT : ATTENDANCE_STATUS.LATE;
}

export async function verifyLocation(employeeId, lat, lng) {
  const config = await AttendanceConfig.getConfig();
  const result = await validateLocation(lat, lng, config);
  if (!result.withinRange) {
    throw new ApiError(
      `You are ${result.distance}m from the office. Maximum allowed: ${config.allowedRadius}m.`,
      403
    );
  }
  return { withinRange: true, distance: result.distance };
}

export async function checkIn(employeeId, qrToken, lat, lng) {
  const config = await AttendanceConfig.getConfig();

  // Layer 1: freelancer check handled by freelancerGuard middleware at route level

  // Layer 2: GPS — server-side enforcement (frontend pre-check is UX only)
  const locationResult = await validateLocation(lat, lng, config);
  if (!locationResult.withinRange) {
    throw new ApiError("GPS location not within company radius", 403);
  }

  // Layer 3: QR token (expiry + signature + replay)
  await validateQRToken(qrToken, employeeId);

  // Layer 4: Duplicate check-in
  const today = todayUTC();
  const existing = await Attendance.findOne({ employee: employeeId, date: today });
  if (existing?.checkIn?.time) {
    throw new ApiError("You have already checked in today", 409);
  }

  // Layer 5: Work day check
  const dayOfWeek = new Date().getDay();
  if (!config.workDays.includes(dayOfWeek)) {
    throw new ApiError("Today is not a configured work day", 400);
  }

  // Layer 6: Status (present vs late)
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

export async function checkOut(employeeId, lat, lng) {
  const config = await AttendanceConfig.getConfig();
  const today = todayUTC();

  const record = await Attendance.findOne({ employee: employeeId, date: today });
  if (!record?.checkIn?.time) {
    throw new ApiError("You have not checked in today", 400);
  }
  if (record?.checkOut?.time) {
    throw new ApiError("You have already checked out today", 409);
  }

  const locationResult = await validateLocation(lat, lng, config);
  if (!locationResult.withinRange) {
    throw new ApiError("GPS location not within company radius", 403);
  }

  const checkOutTime = new Date();
  const durationMinutes = Math.round((checkOutTime - record.checkIn.time) / 60000);

  await record.updateOne({
    "checkOut.time": checkOutTime,
    "checkOut.location": { lat, lng },
    "checkOut.source": ATTENDANCE_SOURCE.QR_SCAN,
    durationMinutes,
  });

  return { ...record.toObject(), checkOut: { time: checkOutTime }, durationMinutes };
}
```

---

## 6. `attendance.middleware.js`

> ⚠️ Fixes #10, #11: Uses `ApiError` + `asyncHandler` pattern. Adds `resolveEmployee` and `freelancerGuard`.

```javascript
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { AttendanceConfig } from "./attendanceConfig.model.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { EMPLOYMENT_TYPE } from "../../shared/constants/employee.enums.js";

// ── Kiosk JWT authentication ──────────────────────────────────────────────────
// Does NOT use protect — kiosk devices authenticate with KIOSK_JWT_SECRET, not user JWTs
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

  // Update lastSeen non-blocking
  kiosk.lastSeen = new Date();
  config.save().catch(() => {}); // fire-and-forget

  req.kiosk = decoded;
  next();
});

// ── Employee resolution middleware ────────────────────────────────────────────
// Attaches req.employee to any route that needs the Employee document.
// Place AFTER protect so req.user is guaranteed.
// Services receive req.employee._id — no req.user.employeeId anywhere.
export const resolveEmployee = asyncHandler(async (req, res, next) => {
  const employee = await EmployeeModel.findOne({ user: req.user._id });
  if (!employee) {
    return next(new ApiError("Employee profile not found for this user", 404));
  }
  req.employee = employee;
  next();
});

// ── Freelancer guard ──────────────────────────────────────────────────────────
// Blocks freelancers from check-in/out unless trackFreelancers is enabled.
// Place AFTER resolveEmployee so req.employee is available.
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
```

---

## 7. `attendance.excel.js` — Excel Export (Extracted)

> ⚠️ Fix #12, #13: Lowercase `exceljs` import, extracted from controller into its own file following the `transaction.excel.js` pattern.

```javascript
import exceljs from "exceljs";

export function generateAttendanceWorkbook(records) {
  const workbook = new exceljs.Workbook();
  const sheet = workbook.addWorksheet("Attendance");

  sheet.columns = [
    { header: "Employee",       key: "name",     width: 25 },
    { header: "Department",     key: "dept",     width: 20 },
    { header: "Date",           key: "date",     width: 15 },
    { header: "Status",         key: "status",   width: 12 },
    { header: "Check In",       key: "checkIn",  width: 15 },
    { header: "Check Out",      key: "checkOut", width: 15 },
    { header: "Duration (min)", key: "duration", width: 15 },
    { header: "Source",         key: "source",   width: 15 },
  ];

  records.forEach((r) =>
    sheet.addRow({
      name:     r.employee?.user?.name              || "—",
      dept:     r.employee?.department?.name         || "—",
      date:     r.date.toISOString().split("T")[0],
      status:   r.status,
      checkIn:  r.checkIn?.time?.toLocaleTimeString()  || "—",
      checkOut: r.checkOut?.time?.toLocaleTimeString() || "—",
      duration: r.durationMinutes                    || "—",
      source:   r.checkIn?.source                   || "—",
    })
  );

  return workbook;
}
```

---

## 8. `attendance.routes.js`

### 8.1 Add to `src/shared/middlewares/rateLimitMiddleware.js`

Add this export to the existing shared rate limiter file (alongside existing limiters):

```javascript
import rateLimit from "express-rate-limit";

// Kiosk PIN brute-force protection — 5 attempts per 15 minutes per IP
export const kioskLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: "error",
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

> ⚠️ Fixes #4, #5, #7, #8, #14: Correct import paths, named imports, `USER_ROLES` constants, rate limiting on kiosk login.

```javascript
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

// kioskLoginLimiter is imported from rateLimitMiddleware.js (see Section 8.1 below)

// ── Config ────────────────────────────────────────────────────────────────────
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

// ── Kiosk Management ─────────────────────────────────────────────────────────
router.post("/kiosk/login",
  kioskLoginLimiter,          // ← rate limit before any processing
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

// ── QR (kiosk-authenticated — no user JWT) ───────────────────────────────────
router.post("/qr/generate", kioskAuth, generateQR);
router.get("/qr/current",   kioskAuth, currentQR);

// ── Employee Check-In / Check-Out ─────────────────────────────────────────────
// resolveEmployee: attaches req.employee (looks up Employee by req.user._id)
// freelancerGuard: blocks freelancers unless config.trackFreelancers is true
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

// ── Employee Self-Service ─────────────────────────────────────────────────────
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

// ── Leave Requests ────────────────────────────────────────────────────────────
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

// ── Admin / Operation Views ───────────────────────────────────────────────────
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

// ── Export ────────────────────────────────────────────────────────────────────
router.get("/export",
  protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  exportQuery, validatorMiddleware,
  exportExcel
);

export default router;
```

---

## 9. `attendance.validator.js`

> ⚠️ Fix #8: All validators are named exports (no `import *`). Enum values imported from shared constants.

```javascript
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

// ── Param validators (MongoId checks for all :id / :deviceId routes) ─────────

export const mongoIdParam = [
  param("id").isMongoId().withMessage("Invalid ID format"),
];

export const deviceIdParam = [
  param("deviceId").isString().notEmpty().withMessage("Device ID is required"),
];
```

---

## 10. `attendance.controller.js`

> ⚠️ Fixes #6, #7, #10, #12: No `status` field in responses, named imports only, `req.employee._id` (not `req.user.employeeId`), `bcrypt` (not `bcryptjs`), Excel logic delegated to `attendance.excel.js`.

```javascript
import asyncHandler from "express-async-handler";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  verifyLocation as verifyLocationService,
  checkIn as checkInService,
  checkOut as checkOutService,
} from "./attendance.service.js";
import {
  LEAVE_STATUS,
  ATTENDANCE_STATUS,
  ATTENDANCE_SOURCE,
} from "../../shared/constants/attendance.enums.js";
import { generateQRToken } from "./qr.service.js";
import { generateAttendanceWorkbook } from "./attendance.excel.js";
import { AttendanceConfig } from "./attendanceConfig.model.js";
import { LeaveRequest } from "./leaveRequest.model.js";
import { Attendance } from "./attendance.model.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";

// ── Config ────────────────────────────────────────────────────────────────────

export const getConfig = asyncHandler(async (req, res) => {
  const config = await AttendanceConfig.getConfig();
  const safe = config.toObject();
  delete safe.qrSigningSecret;
  delete safe.kioskPinHash;
  res.json({ data: safe });
});

export const updateConfig = asyncHandler(async (req, res) => {
  const config = await AttendanceConfig.getConfig();
  const allowed = [
    "companyLocation", "allowedRadius", "workStartTime", "workEndTime",
    "lateGraceMinutes", "workDays", "qrLifetimeSeconds",
    "autoCheckoutTime", "autoAbsentTime", "timezone", "trackFreelancers",
  ];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) config[key] = req.body[key];
  });
  await config.save();
  res.json({ message: "Config updated successfully" });
});

export const rotateQRSecret = asyncHandler(async (req, res) => {
  const config = await AttendanceConfig.getConfig();
  config.qrSigningSecret = crypto.randomBytes(32).toString("hex");
  await config.save();
  res.json({ message: "QR signing secret rotated. All existing QR codes are now invalid." });
});

// ── Kiosk ─────────────────────────────────────────────────────────────────────

export const kioskLogin = asyncHandler(async (req, res, next) => {
  const { pin, deviceName } = req.body;
  const config = await AttendanceConfig.getConfig();

  if (!config.kioskPinHash) {
    return next(new ApiError("Kiosk PIN not configured. Set it via PATCH /attendance/config first.", 400));
  }

  const valid = await bcrypt.compare(pin, config.kioskPinHash);
  if (!valid) return next(new ApiError("Invalid PIN", 401));

  const deviceId = crypto.randomUUID();
  const token = jwt.sign(
    { deviceId, deviceName },
    process.env.KIOSK_JWT_SECRET,
    { expiresIn: "90d" }
  );

  config.activeKiosks.push({ deviceId, deviceName, lastSeen: new Date() });
  await config.save();

  res.cookie("kioskToken", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 90 * 24 * 60 * 60 * 1000,
  });

  res.json({ message: "Kiosk authenticated successfully", deviceId });
});

export const listKiosks = asyncHandler(async (req, res) => {
  const config = await AttendanceConfig.getConfig();
  res.json({ data: config.activeKiosks });
});

export const revokeKiosk = asyncHandler(async (req, res) => {
  const config = await AttendanceConfig.getConfig();
  config.activeKiosks = config.activeKiosks.filter(
    (k) => k.deviceId !== req.params.deviceId
  );
  await config.save();
  res.json({ message: "Kiosk revoked successfully" });
});

// ── QR ────────────────────────────────────────────────────────────────────────

export const generateQR = asyncHandler(async (req, res) => {
  const { token, expiresAt } = await generateQRToken();
  res.json({ data: { token, expiresAt } });
});

export const currentQR = asyncHandler(async (req, res) => {
  const { token, expiresAt } = await generateQRToken();
  res.json({ data: { token, expiresAt } });
});

// ── Check-In / Check-Out ──────────────────────────────────────────────────────
// req.employee is set by resolveEmployee middleware — NOT req.user.employeeId

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

// ── Employee Self-Service ─────────────────────────────────────────────────────

export const myToday = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const record = await Attendance.findOne({ employee: req.employee._id, date: today });
  res.json({ data: record || null });
});

export const myHistory = asyncHandler(async (req, res) => {
  const { from, to, page = 1, limit = 30 } = req.query;
  const filter = { employee: req.employee._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to)   filter.date.$lte = new Date(to);
  }
  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Attendance.countDocuments(filter),
  ]);
  res.json({ data: records, total, page, pages: Math.ceil(total / limit) });
});

export const mySummary = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);
  const records = await Attendance.find({
    employee: req.employee._id,
    date: { $gte: start, $lte: end },
  });
  const summary = {
    total:        records.length,
    present:      records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length,
    late:         records.filter((r) => r.status === ATTENDANCE_STATUS.LATE).length,
    absent:       records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length,
    leave:        records.filter((r) => r.status === ATTENDANCE_STATUS.LEAVE).length,
    totalMinutes: records.reduce((sum, r) => sum + (r.durationMinutes || 0), 0),
  };
  res.json({ data: { summary, records } });
});

// ── Leave Requests ────────────────────────────────────────────────────────────

export const submitLeaveRequest = asyncHandler(async (req, res) => {
  const lr = await LeaveRequest.create({
    ...req.body,
    employee: req.employee._id,
  });
  res.status(201).json({ data: lr });
});

export const myLeaveRequests = asyncHandler(async (req, res) => {
  const requests = await LeaveRequest.find({ employee: req.employee._id }).sort({
    createdAt: -1,
  });
  res.json({ data: requests });
});

export const getAllLeaveRequests = asyncHandler(async (req, res) => {
  const { status, employee, from, to } = req.query;
  const filter = {};
  if (status)   filter.status = status;
  if (employee) filter.employee = employee;
  if (from || to) {
    filter.startDate = {};
    if (from) filter.startDate.$gte = new Date(from);
    if (to)   filter.startDate.$lte = new Date(to);
  }
  const requests = await LeaveRequest.find(filter)
    .populate({ path: "employee", populate: { path: "user", select: "name email" } })
    .sort({ createdAt: -1 });
  res.json({ data: requests });
});

export const approveLeaveRequest = asyncHandler(async (req, res, next) => {
  const lr = await LeaveRequest.findByIdAndUpdate(
    req.params.id,
    { status: LEAVE_STATUS.APPROVED, reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true }
  );
  if (!lr) return next(new ApiError("Leave request not found", 404));
  await _createLeaveAttendanceRecords(lr);
  res.json({ data: lr });
});

export const rejectLeaveRequest = asyncHandler(async (req, res, next) => {
  const lr = await LeaveRequest.findByIdAndUpdate(
    req.params.id,
    {
      status:     LEAVE_STATUS.REJECTED,
      reviewedBy: req.user._id,
      reviewNote: req.body.reviewNote,
      reviewedAt: new Date(),
    },
    { new: true }
  );
  if (!lr) return next(new ApiError("Leave request not found", 404));
  res.json({ data: lr });
});

async function _createLeaveAttendanceRecords(lr) {
  const days = [];
  const current = new Date(lr.startDate);
  const end = new Date(lr.endDate);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  await Promise.allSettled(
    days.map((date) =>
      Attendance.findOneAndUpdate(
        { employee: lr.employee, date },
        { $setOnInsert: { status: ATTENDANCE_STATUS.LEAVE, leaveRequest: lr._id } },
        { upsert: true }
      )
    )
  );
}

// ── Admin Views ───────────────────────────────────────────────────────────────

export const getDailyAttendance = asyncHandler(async (req, res) => {
  const { date, department, status, employmentType, search } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setUTCHours(0, 0, 0, 0);

  // isActive lives on the User model, not Employee.
  // Follow the existing getEmployeesService pattern: populate user, filter on user.isActive.
  const empQuery = EmployeeModel.find({})
    .populate({ path: "user", match: { isActive: true }, select: "name email isActive" })
    .populate("department", "name");

  if (department)     empQuery.where("department").equals(department);
  if (employmentType) empQuery.where("employmentType").equals(employmentType);

  let employees = await empQuery;
  // Remove employees whose user was filtered out by populate match
  employees = employees.filter((e) => e.user !== null);

  // Text search on user.name (post-filter — use Atlas Search for production scale)
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
      _id:        emp._id,
      name:       emp.user?.name,
      email:      emp.user?.email,
      department: emp.department,
    },
    attendance: recordMap[emp._id.toString()] || { status: ATTENDANCE_STATUS.ABSENT },
  }));

  if (status) result = result.filter((r) => r.attendance.status === status);

  res.json({ data: result, date: targetDate });
});

export const getMonthlySummary = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);
  const records = await Attendance.find({ date: { $gte: start, $lte: end } }).populate({
    path:     "employee",
    populate: { path: "department", select: "name" },
  });
  res.json({ data: records });
});

export const getEmployeeHistory = asyncHandler(async (req, res) => {
  const { from, to, page = 1, limit = 30 } = req.query;
  const filter = { employee: req.params.id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to)   filter.date.$lte = new Date(to);
  }
  const records = await Attendance.find(filter)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  res.json({ data: records });
});

export const manualEntry = asyncHandler(async (req, res) => {
  const { employee, date, status, checkIn, checkOut, note } = req.body;
  const dateObj = new Date(date);
  dateObj.setUTCHours(0, 0, 0, 0);
  const record = await Attendance.findOneAndUpdate(
    { employee, date: dateObj },
    {
      status,
      note,
      ...(checkIn  && { "checkIn.time":  new Date(checkIn),  "checkIn.source":  ATTENDANCE_SOURCE.MANUAL }),
      ...(checkOut && { "checkOut.time": new Date(checkOut), "checkOut.source": ATTENDANCE_SOURCE.MANUAL }),
    },
    { upsert: true, new: true }
  );
  res.status(201).json({ data: record });
});

export const updateManualEntry = asyncHandler(async (req, res, next) => {
  const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!record) return next(new ApiError("Attendance record not found", 404));
  res.json({ data: record });
});

export const deleteRecord = asyncHandler(async (req, res, next) => {
  const record = await Attendance.findByIdAndDelete(req.params.id);
  if (!record) return next(new ApiError("Attendance record not found", 404));
  res.json({ message: "Attendance record deleted successfully" });
});

// ── Export ────────────────────────────────────────────────────────────────────

export const exportExcel = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);

  const records = await Attendance.find({ date: { $gte: start, $lte: end } })
    .populate({ path: "employee", populate: { path: "department", select: "name" } })
    .sort({ date: 1 });

  const workbook = generateAttendanceWorkbook(records);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="attendance-${year}-${String(month).padStart(2, "0")}.xlsx"`
  );
  await workbook.xlsx.write(res);
  res.end();
});
```

---

## 11. `src/cron/attendance.cron.js`

> ⚠️ Fix #9: Crons live in `src/cron/`, started from `server.js` after DB connection — not in `src/app/index.js`.
> Timezone read from `AttendanceConfig` at startup. Cron schedule fixed at start (changing requires restart).

```javascript
import cron from "node-cron";
import { Attendance } from "../modules/attendance/attendance.model.js";
import { AttendanceConfig } from "../modules/attendance/attendanceConfig.model.js";
import { EmployeeModel } from "../modules/employees/employee.model.js";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_SOURCE,
} from "../shared/constants/attendance.enums.js";

export async function startAutoCheckoutCron() {
  const config = await AttendanceConfig.getConfig();
  const [h, m] = config.autoCheckoutTime.split(":").map(Number);
  const cronExpr = `${m} ${h} * * *`; // e.g. "0 20 * * *" for 20:00

  cron.schedule(
    cronExpr,
    async () => {
      try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Use the configured time as the checkout timestamp
        const cfg = await AttendanceConfig.getConfig();
        const [ch, cm] = cfg.autoCheckoutTime.split(":").map(Number);
        const checkoutTime = new Date();
        checkoutTime.setHours(ch, cm, 0, 0);

        const result = await Attendance.updateMany(
          {
            date: today,
            "checkIn.time":  { $exists: true },
            "checkOut.time": { $exists: false },
          },
          {
            $set: {
              "checkOut.time":   checkoutTime,
              "checkOut.source": ATTENDANCE_SOURCE.AUTO_CHECKOUT,
            },
          }
        );
        console.log(`[Cron] Auto-checkout: ${result.modifiedCount} records updated`);
      } catch (err) {
        console.error("[Cron] Auto-checkout failed:", err.message);
      }
    },
    { timezone: config.timezone } // read from config at startup
  );

  console.log(`[Cron] Auto-checkout scheduled: ${cronExpr} (${config.timezone})`);
}

export async function startAutoAbsentCron() {
  const config = await AttendanceConfig.getConfig();
  const [h, m] = config.autoAbsentTime.split(":").map(Number);
  const cronExpr = `${m} ${h} * * *`; // e.g. "30 20 * * *" for 20:30

  cron.schedule(
    cronExpr,
    async () => {
      try {
        const cfg = await AttendanceConfig.getConfig();
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const dayOfWeek = today.getDay();
        if (!cfg.workDays.includes(dayOfWeek)) {
          console.log("[Cron] Auto-absent skipped — not a work day");
          return;
        }

        const employees = await EmployeeModel.find({});
        const existing  = await Attendance.find({ date: today }).select("employee");
        const existingIds = new Set(existing.map((r) => r.employee.toString()));

        const absent = employees.filter((e) => !existingIds.has(e._id.toString()));
        if (absent.length === 0) return;

        await Attendance.insertMany(
          absent.map((e) => ({
            employee: e._id,
            date:     today,
            status:   ATTENDANCE_STATUS.ABSENT,
          })),
          { ordered: false } // skip on duplicate key — don't error if record exists
        );
        console.log(`[Cron] Auto-absent: ${absent.length} records created`);
      } catch (err) {
        console.error("[Cron] Auto-absent failed:", err.message);
      }
    },
    { timezone: config.timezone }
  );

  console.log(`[Cron] Auto-absent scheduled: ${cronExpr} (${config.timezone})`);
}
```

Add to `server.js` after DB connection:
```javascript
import { AttendanceConfig } from "./modules/attendance/attendanceConfig.model.js";
import { startAutoCheckoutCron, startAutoAbsentCron } from "./cron/attendance.cron.js";

// After mongoose.connect() resolves:
await AttendanceConfig.getConfig(); // seed singleton if first run
await startAutoCheckoutCron();
await startAutoAbsentCron();
```

---

## 12. Role-Based Access Matrix

| Endpoint | Admin | Financial Manager | Operation | Employee |
|---|---|---|---|---|
| `GET /config` | ✅ | ❌ | ✅ view-only | ❌ |
| `PATCH /config` | ✅ | ❌ | ❌ | ❌ |
| `POST /config/rotate-qr-secret` | ✅ | ❌ | ❌ | ❌ |
| `POST /kiosk/login` | Public + PIN + rate-limited | same | same | ❌ |
| `GET /kiosks` | ✅ | ❌ | ❌ | ❌ |
| `DELETE /kiosks/:deviceId` | ✅ | ❌ | ❌ | ❌ |
| `POST /qr/generate` | Kiosk JWT | Kiosk JWT | Kiosk JWT | ❌ |
| `GET /qr/current` | Kiosk JWT | Kiosk JWT | Kiosk JWT | ❌ |
| `POST /verify-location` | ✅ | ❌ | ✅ | ✅ |
| `POST /check-in` | ✅ | ❌ | ✅ | ✅ |
| `POST /check-out` | ✅ | ❌ | ✅ | ✅ |
| `GET /my/today` | ✅ | ❌ | ✅ | ✅ |
| `GET /my` | ✅ | ❌ | ✅ | ✅ |
| `GET /my/summary` | ✅ | ❌ | ✅ | ✅ |
| `POST /leave-requests` | ✅ | ❌ | ✅ | ✅ |
| `GET /my/leave-requests` | ✅ | ❌ | ✅ | ✅ |
| `GET /leave-requests` | ✅ | ❌ | ✅ | ❌ |
| `PATCH /leave-requests/:id/approve` | ✅ | ❌ | ✅ | ❌ |
| `PATCH /leave-requests/:id/reject` | ✅ | ❌ | ✅ | ❌ |
| `GET /daily` | ✅ | ✅ view | ✅ | ❌ |
| `GET /summary` | ✅ | ✅ view | ✅ | ❌ |
| `GET /employee/:id` | ✅ | ✅ view | ✅ | ❌ |
| `POST /manual` | ✅ | ❌ | ✅ | ❌ |
| `PATCH /manual/:id` | ✅ | ❌ | ✅ | ❌ |
| `DELETE /:id` | ✅ | ❌ | ❌ | ❌ |
| `GET /export` | ✅ | ✅ | ❌ | ❌ |

---

## 13. Business Rules Summary

| Rule | Implementation |
|---|---|
| One record per employee per day | Unique index `{ employee, date }`. Return 409 on duplicate check-in. |
| QR token expires in `qrLifetimeSeconds` (default 60s) | Checked in `qr.service.js`. Throws `ApiError("QR token has expired", 400)`. |
| QR token single-use | TTL `qrToken` collection. Insert on use — duplicate key = replay. |
| Employee must be within `allowedRadius` meters | Haversine in `geo.service.js`. Throws `ApiError("You are Xm from the office...", 403)`. |
| Status: `present` within grace period, `late` otherwise | `resolveStatus()` in `attendance.service.js` at check-in time. |
| No double check-in | Check `checkIn.time` exists. Throws `ApiError(409)`. |
| No double check-out | Check `checkOut.time` exists. Throws `ApiError(409)`. |
| Freelancers excluded unless `trackFreelancers: true` | `freelancerGuard` middleware. Throws `ApiError(403)`. |
| Auto-checkout at configured time | Cron job. Source = `auto_checkout`. Status unchanged. |
| Auto-absent after auto-checkout | Cron creates absent records. `ordered: false` skips duplicates. |
| Approved leave creates attendance records | `_createLeaveAttendanceRecords` — `$setOnInsert` avoids overwriting. |
| Kiosk PIN brute-force prevention | `express-rate-limit`: 5 attempts / 15 min / IP on `POST /kiosk/login`. |
| Kiosk token lives 90 days | `jwt.sign(..., { expiresIn: "90d" })` in httpOnly cookie. |
| Kiosk revocable | Remove from `config.activeKiosks`. `kioskAuth` checks on every request. |
| QR secret rotatable | New secret invalidates all current QR codes instantly. |
| Cron timezone configurable | `config.timezone` field. Read at startup. Changing requires restart. |

---

## 14. Environment Variables to Add

```env
KIOSK_JWT_SECRET=<64-char random hex string>
```

Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 15. Dependencies to Add

```bash
npm install node-cron
```

Already in `package.json` (no install needed):
- `bcrypt` v6 ✅
- `exceljs` ✅
- `jsonwebtoken` ✅
- `express-validator` ✅
- `express-rate-limit` ✅ (verify — used by existing modules)

---

## 16. Testing Checklist

- [ ] Check-in succeeds: valid QR + GPS within radius
- [ ] Check-in fails: expired QR (>60s old) → 400
- [ ] Check-in fails: replayed QR (same token twice) → 400
- [ ] Check-in fails: GPS 150m away (outside 100m radius) → 403
- [ ] Check-in fails: already checked in today → 409
- [ ] Check-in fails: freelancer + `trackFreelancers: false` → 403
- [ ] Check-in fails: non-work day → 400
- [ ] Check-out succeeds after valid check-in
- [ ] Check-out fails: no prior check-in → 400
- [ ] Check-out fails: already checked out → 409
- [ ] Auto-checkout cron marks open check-ins at configured time
- [ ] Auto-absent cron creates absent records for no-shows
- [ ] Auto-absent cron skips non-work days
- [ ] Cron timezone respected (verify with Africa/Cairo)
- [ ] Manual entry creates record correctly
- [ ] Manual entry updates existing record correctly
- [ ] Leave approval creates one attendance record per leave day
- [ ] Leave approval does not overwrite existing records (`$setOnInsert`)
- [ ] Kiosk login: correct PIN → 90-day JWT in cookie
- [ ] Kiosk login: wrong PIN → 401
- [ ] Kiosk login: 6th attempt within 15 min → 429
- [ ] Revoked kiosk: next QR request → 401
- [ ] QR secret rotation: previously valid token now rejected
- [ ] Financial manager: can GET /daily, /summary, /employee/:id
- [ ] Financial manager: cannot POST /manual → 403
- [ ] Employee: cannot GET /daily → 403
- [ ] Export Excel: correct data for month/year, correct filename format

---

## 17. Next Steps After Backend Is Complete

1. Test every item in the checklist above (Postman or automated suite)
2. Deploy to staging — verify cron jobs fire on schedule
3. Write the UI/UX feature description `.md` (every screen, state, interaction, edge case)
4. Send to Claude Design for UI/UX generation
5. Export full UI/UX
6. Return here: upload new backend folder + new UI/UX folder
7. Update `DESIGN.md` with the Attendance frontend phase
