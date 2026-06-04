import cron from "node-cron";
import { Attendance } from "../modules/attendance/attendance.model.js";
import { AttendanceConfig } from "../modules/attendance/attendanceConfig.model.js";
import { EmployeeModel } from "../modules/employees/employee.model.js";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_SOURCE,
} from "../shared/constants/attendance.enums.js";
import { EMPLOYMENT_TYPE } from "../shared/constants/employee.enums.js";
import { getEgyptOffsetMinutes } from "../shared/utils/egyptTimezone.js";
import { todayUTC } from "../modules/attendance/attendance.service.js";

export async function startAutoCheckoutCron() {
  const config = await AttendanceConfig.getConfig();
  const [h, m] = config.autoCheckoutTime.split(":").map(Number);
  const cronExpr = `${m} ${h} * * *`;

  cron.schedule(
    cronExpr,
    async () => {
      try {
        const today = todayUTC();

        const cfg = await AttendanceConfig.getConfig();
        const [ch, cm] = cfg.autoCheckoutTime.split(":").map(Number);
        const offsetMinCron = getEgyptOffsetMinutes(new Date());
        const checkoutTime = new Date();
        checkoutTime.setUTCHours(ch, cm, 0, 0);
        checkoutTime.setTime(checkoutTime.getTime() - offsetMinCron * 60_000);

        const openRecords = await Attendance.find({
          date: today,
          "checkIn.time":  { $exists: true },
          "checkOut.time": { $exists: false },
        });

        if (openRecords.length > 0) {
          const bulkOps = openRecords.map((rec) => ({
            updateOne: {
              filter: { _id: rec._id },
              update: {
                $set: {
                  "checkOut.time":   checkoutTime,
                  "checkOut.source": ATTENDANCE_SOURCE.AUTO_CHECKOUT,
                  durationMinutes:   Math.round(
                    (checkoutTime - rec.checkIn.time) / 60000
                  ),
                },
              },
            },
          }));
          const result = await Attendance.bulkWrite(bulkOps);
          console.log(`[Cron] Auto-checkout: ${result.modifiedCount} records updated with duration`);
        } else {
          console.log("[Cron] Auto-checkout: no open check-ins found");
        }
      } catch (err) {
        console.error("[Cron] Auto-checkout failed:", err.message);
      }
    },
    { timezone: config.timezone }
  );

  console.log(`[Cron] Auto-checkout scheduled: ${cronExpr} (${config.timezone})`);
}

export async function startAutoAbsentCron() {
  const config = await AttendanceConfig.getConfig();
  const [h, m] = config.autoAbsentTime.split(":").map(Number);
  const cronExpr = `${m} ${h} * * *`;

  cron.schedule(
    cronExpr,
    async () => {
      try {
        const cfg = await AttendanceConfig.getConfig();
        const today = todayUTC();

        const dayOfWeek = today.getUTCDay();
        if (!cfg.workDays.includes(dayOfWeek)) {
          console.log("[Cron] Auto-absent skipped — not a work day");
          return;
        }

        let allEmployees = await EmployeeModel.find({})
          .populate({ path: "user", match: { isActive: true }, select: "isActive" });
        allEmployees = allEmployees.filter((e) => e.user !== null);
        if (!cfg.trackFreelancers) {
          allEmployees = allEmployees.filter((e) => e.employmentType !== EMPLOYMENT_TYPE.FREELANCER);
        }
        const existing  = await Attendance.find({ date: today }).select("employee");
        const existingIds = new Set(existing.map((r) => r.employee.toString()));

        const absent = allEmployees.filter((e) => !existingIds.has(e._id.toString()));
        if (absent.length === 0) return;

        await Attendance.insertMany(
          absent.map((e) => ({
            employee: e._id,
            date:     today,
            status:   ATTENDANCE_STATUS.ABSENT,
          })),
          { ordered: false }
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