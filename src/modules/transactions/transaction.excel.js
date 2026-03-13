import exceljs from "exceljs";

export const generateTransactionsWorkbook = (transactions) => {
  const workbook = new exceljs.Workbook();
  workbook.creator = "Glitci System";
  workbook.created = new Date();

  // Split transactions into income and expense
  const incomes = transactions.filter((t) => t.type === "income");
  const expenses = transactions.filter((t) => t.type === "expense");

  const setupSheet = (sheetName, data) => {
    const sheet = workbook.addWorksheet(sheetName);

    // Define columns
    sheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Category", key: "category", width: 25 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Currency", key: "currency", width: 10 },
      { header: "Project", key: "project", width: 25 },
      { header: "Client", key: "client", width: 25 },
      { header: "Employee", key: "employee", width: 25 },
      { header: "Description", key: "description", width: 40 },
      { header: "Payment Method", key: "paymentMethod", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Added By", key: "addedBy", width: 25 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: sheetName === "Income" ? "FF2E7D32" : "FFC62828" }, // Green for income, Red for expense
    };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // Add rows
    data.forEach((t) => {
      let clientName = "-";
      if (t.client) {
        clientName = t.client.companyName || t.client.name || "-";
      }
      
      let employeeName = "-";
      if (t.employee && t.employee.user) {
        employeeName = t.employee.user.name || "-";
      }
      
      let projectName = "-";
      if (t.project && t.project.name) {
        projectName = t.project.name;
      }

      const row = sheet.addRow({
        date: t.date ? new Date(t.date).toISOString().split("T")[0] : "-",
        category: t.category ? t.category.toUpperCase().replace(/_/g, " ") : "-",
        amount: t.amount || 0,
        currency: t.currency || "-",
        project: projectName,
        client: clientName,
        employee: employeeName,
        description: t.description || "-",
        paymentMethod: t.paymentMethod ? t.paymentMethod.toUpperCase() : "-",
        status: t.status ? t.status.toUpperCase() : "-",
        addedBy: t.addedBy ? t.addedBy.name : "System",
      });

      // Add alternating row colors, borders, and center alignment
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFEEEEEE" } },
          bottom: { style: "thin", color: { argb: "FFEEEEEE" } },
          left: { style: "thin", color: { argb: "FFEEEEEE" } },
          right: { style: "thin", color: { argb: "FFEEEEEE" } },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      });

      if (row.number % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9F9F9" },
        };
      }

      // Highlight Category cell
      const categoryCell = row.getCell("category");
      categoryCell.font = { bold: true };
      if (sheetName === "Income") {
        categoryCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8F5E9" }, // Light green
        };
      } else {
        categoryCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFEBEE" }, // Light red
        };
      }
    });

    // Adjust row height slightly for better readability
    sheet.eachRow((row) => {
      row.height = 25;
    });
  };

  setupSheet("Income", incomes);
  setupSheet("Expenses", expenses);

  return workbook;
};
