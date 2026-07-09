import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  numeric,
  boolean,
  json,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const statusEnum = pgEnum("status", ["ACTIVE", "INACTIVE", "SUSPENDED"]);
export const userRoleEnum = pgEnum("role", ["user", "admin"]);
export const perspectiveEnum = pgEnum("perspective", ["FINANCIAL", "CUSTOMER", "INTERNAL", "LEARNING"]);
export const frequencyEnum = pgEnum("frequency", ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["PENDING", "ACCEPTED", "IN_PROGRESS", "SUBMITTED", "APPROVED", "REJECTED"]);
export const assignmentLevelEnum = pgEnum("assignment_level", ["ADFA_TO_HOD", "HOD_TO_STAFF"]);
export const reviewStatusEnum = pgEnum("review_status", ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]);
export const notificationTypeEnum = pgEnum("notification_type", ["INFO", "SUCCESS", "WARNING", "ERROR", "KPI_ASSIGNED", "KPI_SUBMITTED", "KPI_APPROVED", "KPI_REJECTED", "ANOMALY_DETECTED"]);
export const anomalyTypeEnum = pgEnum("anomaly_type", ["OUT_OF_RANGE", "SUDDEN_SPIKE", "SUDDEN_DROP", "MISSING_DATA", "DUPLICATE_ENTRY", "INCONSISTENT_TREND", "THRESHOLD_BREACH"]);
export const severityEnum = pgEnum("severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const anomalyStatusEnum = pgEnum("anomaly_status", ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"]);
export const approvalTypeEnum = pgEnum("approval_type", ["KPI_DATA", "KPI_ASSIGNMENT", "STRATEGIC_GOAL"]);
export const approvalStatusEnum = pgEnum("approval_status", ["PENDING", "APPROVED", "REJECTED"]);
export const aiRoleEnum = pgEnum("ai_role", ["user", "assistant"]);
export const leaveTypeEnum = pgEnum("leave_type", ["ANNUAL", "SICK", "COMPASSIONATE", "MATERNITY", "PATERNITY", "UNPAID", "OTHER"]);
export const leaveStatusEnum = pgEnum("leave_status", ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);
export const budgetStatusEnum = pgEnum("budget_status", ["ACTIVE", "CLOSED", "ARCHIVED"]);
export const evidenceStatusEnum = pgEnum("evidence_status", ["ACTIVE", "ARCHIVED", "DELETED"]);
export const goalStatusEnum = pgEnum("goal_status", ["ACTIVE", "INACTIVE", "ACHIEVED"]);
export const kpiStatusEnum = pgEnum("kpi_status", ["ACTIVE", "INACTIVE", "ARCHIVED"]);

// ─── Roles ────────────────────────────────────────────────────────────────────
export const roles = pgTable("roles", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  level: integer("level").notNull().default(1), // 1=ADFA, 2=HOD, 3=Staff
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  employeeId: varchar("employeeId", { length: 50 }),
  roleId: integer("roleId").notNull().default(3), // default: Staff
  departmentId: integer("departmentId"),
  status: statusEnum("status").default("ACTIVE").notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Departments ──────────────────────────────────────────────────────────────
export const departments = pgTable("departments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique(),
  headId: integer("headId"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Strategic Goals ──────────────────────────────────────────────────────────
export const strategicGoals = pgTable("strategic_goals", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  perspective: perspectiveEnum("perspective").notNull(),
  weight: numeric("weight", { precision: 5, scale: 2 }).default("1.00"),
  status: goalStatusEnum("status").default("ACTIVE").notNull(),
  fiscalYear: varchar("fiscalYear", { length: 20 }).notNull().default("2025/2026"),
  createdById: integer("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── KPIs ─────────────────────────────────────────────────────────────────────
export const kpis = pgTable("kpis", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  perspective: perspectiveEnum("perspective").notNull(),
  targetValue: numeric("targetValue", { precision: 15, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  frequency: frequencyEnum("frequency").notNull().default("MONTHLY"),
  baseline: numeric("baseline", { precision: 15, scale: 4 }),
  weight: numeric("weight", { precision: 5, scale: 2 }).default("1.00"),
  minThreshold: numeric("minThreshold", { precision: 15, scale: 4 }),
  maxThreshold: numeric("maxThreshold", { precision: 15, scale: 4 }),
  status: kpiStatusEnum("status").default("ACTIVE").notNull(),
  goalId: integer("goalId"),
  createdById: integer("createdById").notNull(),
  fiscalYear: varchar("fiscalYear", { length: 20 }).notNull().default("2025/2026"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── KPI Assignments ──────────────────────────────────────────────────────────
export const kpiAssignments = pgTable("kpi_assignments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  kpiId: integer("kpiId").notNull(),
  assignedById: integer("assignedById").notNull(),
  assignedToId: integer("assignedToId").notNull(),
  departmentId: integer("departmentId"),
  targetValue: numeric("targetValue", { precision: 15, scale: 4 }),
  dueDate: varchar("dueDate", { length: 20 }),
  period: varchar("period", { length: 20 }).notNull(), // e.g. "2025-06"
  notes: text("notes"),
  status: assignmentStatusEnum("status").default("PENDING").notNull(),
  level: assignmentLevelEnum("level").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── KPI Data Entries ─────────────────────────────────────────────────────────
export const kpiData = pgTable("kpi_data", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  kpiId: integer("kpiId").notNull(),
  assignmentId: integer("assignmentId"),
  actualValue: numeric("actualValue", { precision: 15, scale: 4 }).notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  notes: text("notes"),
  evidenceUrl: varchar("evidenceUrl", { length: 1000 }),
  submittedById: integer("submittedById").notNull(),
  reviewedById: integer("reviewedById"),
  status: reviewStatusEnum("status").default("PENDING").notNull(),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").default("INFO").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  relatedId: integer("relatedId"),
  relatedType: varchar("relatedType", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Anomalies ────────────────────────────────────────────────────────────────
export const anomalies = pgTable("anomalies", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  kpiId: integer("kpiId").notNull(),
  kpiDataId: integer("kpiDataId"),
  assignmentId: integer("assignmentId"),
  detectedForUserId: integer("detectedForUserId"),
  description: text("description").notNull(),
  anomalyType: anomalyTypeEnum("anomalyType").notNull(),
  severity: severityEnum("severity").default("MEDIUM").notNull(),
  status: anomalyStatusEnum("status").default("OPEN").notNull(),
  actualValue: numeric("actualValue", { precision: 15, scale: 4 }),
  expectedMin: numeric("expectedMin", { precision: 15, scale: 4 }),
  expectedMax: numeric("expectedMax", { precision: 15, scale: 4 }),
  resolvedById: integer("resolvedById"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── Approvals ────────────────────────────────────────────────────────────────
export const approvals = pgTable("approvals", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  type: approvalTypeEnum("type").default("KPI_DATA").notNull(),
  referenceId: integer("referenceId").notNull(),
  requestedById: integer("requestedById").notNull(),
  reviewedById: integer("reviewedById"),
  status: approvalStatusEnum("status").default("PENDING").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── AI Chat History ──────────────────────────────────────────────────────────
export const aiChats = pgTable("ai_chats", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  role: aiRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId"),
  action: varchar("action", { length: 255 }).notNull(),
  module: varchar("module", { length: 100 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Leave Management ─────────────────────────────────────────────────────────
export const leaveRequests = pgTable("leave_requests", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  leaveType: leaveTypeEnum("leaveType").notNull(),
  startDate: varchar("startDate", { length: 20 }).notNull(),
  endDate: varchar("endDate", { length: 20 }).notNull(),
  days: integer("days").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").default("PENDING").notNull(),
  approvedById: integer("approvedById"),
  approvalNotes: text("approvalNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── Leave Balance ────────────────────────────────────────────────────────────
export const leaveBalance = pgTable("leave_balance", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  leaveType: leaveTypeEnum("leaveType").notNull(),
  totalDays: integer("totalDays").notNull(),
  usedDays: integer("usedDays").default(0).notNull(),
  remainingDays: integer("remainingDays").notNull(),
  fiscalYear: varchar("fiscalYear", { length: 20 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── Budget Tracking ──────────────────────────────────────────────────────────
export const budgets = pgTable("budgets", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  departmentId: integer("departmentId").notNull(),
  fiscalYear: varchar("fiscalYear", { length: 20 }).notNull(),
  allocatedAmount: numeric("allocatedAmount", { precision: 15, scale: 2 }).notNull(),
  spentAmount: numeric("spentAmount", { precision: 15, scale: 2 }).default("0.00"),
  remainingAmount: numeric("remainingAmount", { precision: 15, scale: 2 }).notNull(),
  status: budgetStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── Evidence Portal ──────────────────────────────────────────────────────────
export const evidenceDocuments = pgTable("evidence_documents", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  kpiDataId: integer("kpiDataId"),
  assignmentId: integer("assignmentId"),
  uploadedById: integer("uploadedById").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(),
  fileSize: integer("fileSize"),
  description: text("description"),
  status: evidenceStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
