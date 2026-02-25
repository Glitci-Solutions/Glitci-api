export const TRANSACTION_TYPE = Object.freeze({
  INCOME: "income",
  EXPENSE: "expense",
});

export const TRANSACTION_CATEGORY = Object.freeze({
  // Income categories
  CLIENT_PAYMENT: "client_payment",
  OTHER_INCOME: "other_income",
  // Expense categories
  EMPLOYEE_SALARY: "employee_salary",
  EMPLOYEE_BONUS: "employee_bonus",
  EMPLOYEE_PAYMENT: "employee_payment",
  EQUIPMENT: "equipment",
  SOFTWARE: "software",
  MARKETING: "marketing",
  OFFICE: "office",
  UTILITIES: "utilities",
  OTHER_EXPENSE: "other_expense",
});

export const TRANSACTION_STATUS = Object.freeze({
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

export const PAYMENT_METHOD = Object.freeze({
  CASH: "cash",
  INSTAPAY: "instapay",
  WALLET: "wallet",
  CARD: "card",
  OTHER: "other",
});
