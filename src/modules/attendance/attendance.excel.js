import exceljs from "exceljs";

const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E1E2E" },
};
const HEADER_FONT  = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const BORDER_STYLE = { style: "thin", color: { argb: "FFD0D0D0" } };
const CELL_BORDER  = {
  top: BORDER_STYLE, left: BORDER_STYLE,
  bottom: BORDER_STYLE, right: BORDER_STYLE,
};

const STATUS_COLORS = {
  present:  "FFD1FAE5",
  late:     "FFFEF9C3",
  absent:   "FFFEE2E2",
  leave:    "FFE0E7FF",
  half_day: "FFFFF7ED",
  holiday:  "FFF5F3FF",
};

export function generateAttendanceWorkbook(records) {
  const workbook = new exceljs.Workbook();
  const sheet = workbook.addWorksheet("Attendance");

  sheet.columns = [
    { header: "Employee",       key: "name",     width: 28 },
    { header: "Department",     key: "dept",     width: 22 },
    { header: "Date",           key: "date",     width: 14 },
    { header: "Status",         key: "status",   width: 14 },
    { header: "Check In",       key: "checkIn",  width: 14 },
    { header: "Check Out",      key: "checkOut", width: 14 },
    { header: "Duration (min)", key: "duration", width: 16 },
    { header: "Source",         key: "source",   width: 16 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.fill   = HEADER_FILL;
    cell.font   = HEADER_FONT;
    cell.border = CELL_BORDER;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  records.forEach((r, idx) => {
    const row = sheet.addRow({
      name:     r.employee?.user?.name              || "—",
      dept:     r.employee?.department?.name        || "—",
      date:     r.date.toISOString().split("T")[0],
      status:   r.status,
      checkIn:  r.checkIn?.time?.toLocaleTimeString()  || "—",
      checkOut: r.checkOut?.time?.toLocaleTimeString() || "—",
      duration: r.durationMinutes                   ?? "—",
      source:   r.checkIn?.source                  || "—",
    });

    row.height = 22;
    const isOdd = idx % 2 === 0;

    row.eachCell((cell, colNum) => {
      cell.border = CELL_BORDER;
      cell.alignment = { vertical: "middle" };

      if (colNum === 4) {
        const argb = STATUS_COLORS[r.status] || "FFFFFFFF";
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.fill = {
          type: "pattern", pattern: "solid",
          fgColor: { argb: isOdd ? "FFFFFFFF" : "FFF9F9FB" },
        };
      }
    });
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  return workbook;
}