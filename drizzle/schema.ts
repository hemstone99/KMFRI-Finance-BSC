import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Roles ────────────────────────────────────────────────────────────────────
export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  level: int("level").notNull().default(1), // 1=ADFA, 2=HOD, 3=Staff
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  employeeId: varchar("employeeId", { length: 50 }),
  roleId: int("roleId").notNull().default(3), // default: Staff
  departmentId: int("departmentId"),
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE").notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Departments ──────────────────────────────────────────────────────────────
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique(),
  headId: int("headId"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Strategic Goals ──────────────────────────────────────────────────────────
export const strategicGoals = mysqlTable("strategic_goals", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  perspective: mysqlEnum("perspective", ["FINANCIAL", "CUSTOMER", "INTERNAL", "LEARNING"]).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).default("1.00"),
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE", "ACHIEVED"]).default("ACTIVE").notNull(),
  fiscalYear: varchar("fiscalYear", { length: 20 }).notNull().default("2025/2026"),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── KPIs ─────────────────────────────────────────────────────────────────────
export const kpis = mysqlTable("kpis", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  perspective: mysqlEnum("perspective", ["FINANCIAL", "CUSTOMER", "INTERNAL", "LEARNING"]).notNull(),
  targetValue: decimal("targetValue", { precision: 15, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  frequency: mysqlEnum("frequency", ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"]).notNull().default("MONTHLY"),
  baseline: decimal("baseline", { precision: 15, scale: 4 }),
  weight: decimal("weight", { precision: 5, scale: 2 }).default("1.00"),
  minThreshold: decimal("minThreshold", { precision: 15, scale: 4 }),
  maxThreshold: decimal("maxThreshold", { precision: 15, scale: 4 }),
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE").notNull(),
  goalId: int("goalId"),
  createdById: int("createdById").notNull(),
  fiscalYear: varchar("fiscalYear", { length: 20 }).notNull().default("2025/2026"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── KPI Assignments ──────────────────────────────────────────────────────────
// ADFA assigns to HOD; HOD assigns to Staff
export const kpiAssignments = mysqlTable("kpi_assignments", {
  id: int("id").autoincrement().primaryKey(),
  kpiId: int("kpiId").notNull(),
  assignedById: int("assignedById").notNull(),
  assignedToId: int("assignedToId").notNull(),
  departmentId: int("departmentId"),
  targetValue: decimal("targetValue", { precision: 15, scale: 4 }),
  dueDate: varchar("dueDate", { length: 20 }),
  period: varchar("period", { length: 20 }).notNull(), // e.g. "2025-06"
  notes: text("notes"),
  status: mysqlEnum("status", ["PENDING", "ACCEPTED", "IN_PROGRESS", "SUBMITTED", "APPROVED", "REJECTED"]).default("PENDING").notNull(),
  level: mysqlEnum("level", ["ADFA_TO_HOD", "HOD_TO_STAFF"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── KPI Data Entries ─────────────────────────────────────────────────────────
export const kpiData = mysqlTable("kpi_data", {
  id: int("id").autoincrement().primaryKey(),
  kpiId: int("kpiId").notNull(),
  assignmentId: int("assignmentId"),
  actualValue: decimal("actualValue", { precision: 15, scale: 4 }).notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  notes: text("notes"),
  evidenceUrl: varchar("evidenceUrl", { length: 1000 }),
  submittedById: int("submittedById").notNull(),
  reviewedById: int("reviewedById"),
  status: mysqlEnum("status", ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]).default("PENDING").notNull(),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["INFO", "SUCCESS", "WARNING", "ERROR", "KPI_ASSIGNED", "KPI_SUBMITTED", "KPI_APPROVED", "KPI_REJECTED", "ANOMALY_DETECTED"]).default("INFO").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  relatedId: int("relatedId"),
  relatedType: varchar("relatedType", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Anomalies ────────────────────────────────────────────────────────────────
export const anomalies = mysqlTable("anomalies", {
  id: int("id").autoincrement().primaryKey(),
  kpiId: int("kpiId").notNull(),
  kpiDataId: int("kpiDataId"),
  assignmentId: int("assignmentId"),
  detectedForUserId: int("detectedForUserId"),
  description: text("description").notNull(),
  anomalyType: mysqlEnum("anomalyType", ["OUT_OF_RANGE", "SUDDEN_SPIKE", "SUDDEN_DROP", "MISSING_DATA", "DUPLICATE_ENTRY", "INCONSISTENT_TREND", "THRESHOLD_BREACH"]).notNull(),
  severity: mysqlEnum("severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM").notNull(),
  status: mysqlEnum("status", ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"]).default("OPEN").notNull(),
  actualValue: decimal("actualValue", { precision: 15, scale: 4 }),
  expectedMin: decimal("expectedMin", { precision: 15, scale: 4 }),
  expectedMax: decimal("expectedMax", { precision: 15, scale: 4 }),
  resolvedById: int("resolvedById"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Approvals ────────────────────────────────────────────────────────────────
export const approvals = mysqlTable("approvals", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["KPI_DATA", "KPI_ASSIGNMENT", "STRATEGIC_GOAL"]).default("KPI_DATA").notNull(),
  referenceId: int("referenceId").notNull(),
  requestedById: int("requestedById").notNull(),
  reviewedById: int("reviewedById"),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"]).default("PENDING").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── AI Chat History ──────────────────────────────────────────────────────────
export const aiChats = mysqlTable("ai_chats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 255 }).notNull(),
  module: varchar("module", { length: 100 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Leave Management ─────────────────────────────────────────────────────────
export const leaveRequests = mysqlTable("leave_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leaveType: mysqlEnum("leaveType", ["ANNUAL", "SICK", "COMPASSIONATE", "MATERNITY", "PATERNITY", "UNPAID", "OTHER"]).notNull(),
  startDate: varchar("startDate", { length: 20 }).notNull(),
  endDate: varchar("endDate", { length: 20 }).notNull(),
  days: int("days").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).default("PENDING").notNull(),
  approvedById: int("approvedById"),
  approvalNotes: text("approvalNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Leave Balance ────────────────────────────────────────────────────────────
export const leaveBalance = mysqlTable("leave_balance", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leaveType: mysqlEnum("leaveType", ["ANNUAL", "SICK", "COMPASSIONATE", "MATERNITY", "PATERNITY", "UNPAID", "OTHER"]).notNull(),
  totalDays: int("totalDays").notNull(),
  usedDays: int("usedDays").default(0).notNull(),
  remainingDays: int("remainingDays").notNull(),
  fiscalYear: varchar("fiscalYear", { length: 20 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Budget Tracking ──────────────────────────────────────────────────────────
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  departmentId: int("departmentId").notNull(),
  fiscalYear: varchar("fiscalYear", { length: 20 }).notNull(),
  allocatedAmount: decimal("allocatedAmount", { precision: 15, scale: 2 }).notNull(),
  spentAmount: decimal("spentAmount", { precision: 15, scale: 2 }).default("0.00"),
  remainingAmount: decimal("remainingAmount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["ACTIVE", "CLOSED", "ARCHIVED"]).default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Evidence Portal ──────────────────────────────────────────────────────────
export const evidenceDocuments = mysqlTable("evidence_documents", {
  id: int("id").autoincrement().primaryKey(),
  kpiDataId: int("kpiDataId"),
  assignmentId: int("assignmentId"),
  uploadedById: int("uploadedById").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(),
  fileSize: int("fileSize"),
  description: text("description"),
  status: mysqlEnum("status", ["ACTIVE", "ARCHIVED", "DELETED"]).default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
