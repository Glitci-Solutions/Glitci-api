// src/app/routes.js
import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import employeeRoutes from "../modules/employees/employee.routes.js";
import clientRoutes from "../modules/clients/client.routes.js";
import departmentRoutes from "../modules/departments/department.routes.js";
import positionRoutes from "../modules/positions/position.routes.js";
import skillRoutes from "../modules/skills/skill.routes.js";
import serviceRoutes from "../modules/services/service.routes.js";
import projectRoutes from "../modules/projects/project.routes.js";
import transactionRoutes from "../modules/transactions/transaction.routes.js";
import financeRoutes from "../modules/finance/finance.routes.js";
import analyticsRoutes from "../modules/analytics/analytics.routes.js";
import taskRoutes from "../modules/tasks/task.routes.js";

export function mountRoutes(app) {
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/employees", employeeRoutes);
  app.use("/api/v1/clients", clientRoutes);
  app.use("/api/v1/departments", departmentRoutes);
  app.use("/api/v1/positions", positionRoutes);
  app.use("/api/v1/skills", skillRoutes);
  app.use("/api/v1/services", serviceRoutes);
  app.use("/api/v1/projects", projectRoutes);
  app.use("/api/v1/transactions", transactionRoutes);
  app.use("/api/v1/finance", financeRoutes);
  app.use("/api/v1/analytics", analyticsRoutes);
  app.use("/api/v1/tasks", taskRoutes);
}
