import { z } from "zod";
import { eq, desc, and, or, ne, lt, gt, isNull, sql, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM, type Message } from "./_core/llm";
import { getDb } from "./db";
import {
  users, roles, departments, kpis, kpiAssignments, kpiData,
  notifications, anomalies, approvals, strategicGoals, aiChats, auditLogs,
  leaveRequests, leaveBalance, budgets, evidenceDocuments,
} from "../drizzle/schema";
import type { TRPCError } from "@trpc/server";

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function createNotification(
  userId: number,
  title: string,
  message: string,
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "KPI_ASSIGNED" | "KPI_SUBMITTED" | "KPI_APPROVED" | "KPI_REJECTED" | "ANOMALY_DETECTED",
  relatedId?: number,
  relatedType?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ userId, title, message, type, relatedId, relatedType });
}

async function runAnomalyDetection(
  kpiId: number,
  dataId: number,
  actualValue: number,
  submittedById: number,
  assignmentId?: number
) {
  const db = await getDb();
  if (!db) return;

  const kpi = await db.select().from(kpis).where(eq(kpis.id, kpiId)).limit(1);
  if (!kpi[0]) return;

  const k = kpi[0];
  const target = parseFloat(k.targetValue as string);
  const minT = k.minThreshold ? parseFloat(k.minThreshold as string) : null;
  const maxT = k.maxThreshold ? parseFloat(k.maxThreshold as string) : null;
  const detected: Array<{ type: string; severity: string; desc: string; min?: number; max?: number }> = [];

  // Rule 1: Hard threshold breach
  if (minT !== null && actualValue < minT) {
    detected.push({
      type: "THRESHOLD_BREACH",
      severity: actualValue < minT * 0.5 ? "CRITICAL" : "HIGH",
      desc: `Value ${actualValue} is below minimum threshold of ${minT} for KPI "${k.name}"`,
      min: minT, max: maxT ?? undefined,
    });
  }
  if (maxT !== null && actualValue > maxT) {
    detected.push({
      type: "THRESHOLD_BREACH",
      severity: actualValue > maxT * 1.5 ? "CRITICAL" : "HIGH",
      desc: `Value ${actualValue} exceeds maximum threshold of ${maxT} for KPI "${k.name}"`,
      min: minT ?? undefined, max: maxT,
    });
  }

  // Rule 2: Out of range vs target (>50% deviation)
  if (target > 0) {
    const deviation = Math.abs((actualValue - target) / target) * 100;
    if (deviation > 50 && detected.length === 0) {
      detected.push({
        type: "OUT_OF_RANGE",
        severity: deviation > 100 ? "CRITICAL" : deviation > 75 ? "HIGH" : "MEDIUM",
        desc: `Value ${actualValue} deviates ${deviation.toFixed(1)}% from target ${target} for KPI "${k.name}"`,
        min: target * 0.5, max: target * 1.5,
      });
    }
  }

  // Rule 3: Sudden spike/drop vs recent history
  const recentData = await db
    .select()
    .from(kpiData)
    .where(and(eq(kpiData.kpiId, kpiId), ne(kpiData.id, dataId)))
    .orderBy(desc(kpiData.createdAt))
    .limit(3);

  if (recentData.length >= 2) {
    const avgRecent = recentData.reduce((s, d) => s + parseFloat(d.actualValue as string), 0) / recentData.length;
    if (avgRecent > 0) {
      const change = ((actualValue - avgRecent) / avgRecent) * 100;
      if (Math.abs(change) > 40 && detected.length === 0) {
        detected.push({
          type: change > 0 ? "SUDDEN_SPIKE" : "SUDDEN_DROP",
          severity: Math.abs(change) > 80 ? "HIGH" : "MEDIUM",
          desc: `${change > 0 ? "Spike" : "Drop"} of ${Math.abs(change).toFixed(1)}% detected for "${k.name}" vs recent average of ${avgRecent.toFixed(2)}`,
          min: avgRecent * 0.6, max: avgRecent * 1.4,
        });
      }
    }
  }

  // Rule 4: Duplicate entry check
  const duplicate = await db
    .select()
    .from(kpiData)
    .where(and(
      eq(kpiData.kpiId, kpiId),
      eq(kpiData.submittedById, submittedById),
      ne(kpiData.id, dataId)
    ))
    .limit(1);

  if (duplicate.length > 0) {
    const dupVal = parseFloat(duplicate[0].actualValue as string);
    if (dupVal === actualValue) {
      detected.push({
        type: "DUPLICATE_ENTRY",
        severity: "MEDIUM",
        desc: `Duplicate value ${actualValue} submitted for KPI "${k.name}" — identical to a previous entry`,
      });
    }
  }

  // Insert detected anomalies
  for (const a of detected) {
    const [inserted] = await db.insert(anomalies).values({
      kpiId,
      kpiDataId: dataId,
      assignmentId: assignmentId ?? null,
      detectedForUserId: submittedById,
      description: a.desc,
      anomalyType: a.type as any,
      severity: a.severity as any,
      actualValue: actualValue.toString(),
      expectedMin: a.min?.toString() ?? null,
      expectedMax: a.max?.toString() ?? null,
    });

    // Notify the submitter and ADFA users
    await createNotification(
      submittedById,
      `Anomaly Detected: ${k.name}`,
      a.desc,
      "ANOMALY_DETECTED",
      (inserted as any).insertId,
      "anomaly"
    );

    // Notify all ADFA users
    const adfaUsers = await db.select().from(users).where(eq(users.roleId, 1));
    for (const adfa of adfaUsers) {
      if (adfa.id !== submittedById) {
        await createNotification(adfa.id, `Anomaly Alert: ${k.name}`, a.desc, "ANOMALY_DETECTED", (inserted as any).insertId, "anomaly");
      }
    }
  }
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  // ─── First-Run Setup ─────────────────────────────────────────────────────
  setup: router({
    status: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { initialized: false, rolesSeeded: false, hasAdfa: false };
      const roleCount = await db.select({ c: count() }).from(roles);
      const adfaCount = await db.select({ c: count() }).from(users).where(eq(users.roleId, 1));
      const rolesSeeded = (roleCount[0]?.c ?? 0) >= 5;
      const hasAdfa = (adfaCount[0]?.c ?? 0) > 0;
      return {
        initialized: rolesSeeded && hasAdfa,
        rolesSeeded,
        hasAdfa,
      };
    }),

    // Allows an OAuth admin user to claim the ADFA role on first run
    claimAdfa: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      // Only allow if no ADFA exists yet
      const adfaCount = await db.select({ c: count() }).from(users).where(eq(users.roleId, 1));
      if ((adfaCount[0]?.c ?? 0) > 0) throw new Error("An ADFA account already exists");
      // Ensure roles are seeded
      const roleCount = await db.select({ c: count() }).from(roles);
      if ((roleCount[0]?.c ?? 0) < 5) {
        await db.insert(roles).values([
          { id: 1, name: "ADFA", level: 1, description: "Assistant Director Finance & Accounts" },
          { id: 2, name: "Principal Accountant", level: 2, description: "HOD" },
          { id: 3, name: "Senior Accountant", level: 2, description: "HOD" },
          { id: 4, name: "Accountant", level: 3, description: "Staff" },
          { id: 5, name: "Assistant Accountant", level: 3, description: "Staff" },
        ]).onDuplicateKeyUpdate({ set: { name: sql`name` } });
        // Seed departments if missing
        const deptCount = await db.select({ c: count() }).from(departments);
        if ((deptCount[0]?.c ?? 0) === 0) {
          await db.insert(departments).values([
            { name: "Finance & Accounts", code: "FIN", description: "Finance and Accounts Department" },
            { name: "Budget & Planning", code: "BUD", description: "Budget and Planning Unit" },
            { name: "Procurement", code: "PRO", description: "Procurement Unit" },
          ]);
        }
      }
      // Promote current user to ADFA
      await db.update(users).set({ roleId: 1, role: "admin" }).where(eq(users.id, ctx.user.id));
      await db.insert(auditLogs).values({ userId: ctx.user.id, action: "CLAIM_ADFA", module: "Setup", details: `${ctx.user.name} claimed ADFA role` });
      return { success: true };
    }),

    initialize: publicProcedure
      .input(z.object({
        adminName: z.string().min(2),
        adminEmail: z.string().email(),
        adminPassword: z.string().min(6),
        employeeId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        // Check if already initialized
        const existing = await db.select({ c: count() }).from(roles);
        if ((existing[0]?.c ?? 0) > 0) throw new Error("System already initialized");

        // Seed roles
        await db.insert(roles).values([
          { id: 1, name: "ADFA", level: 1, description: "Assistant Director Finance & Accounts — top-level KPI manager" },
          { id: 2, name: "Principal Accountant", level: 2, description: "HOD — assigns KPIs to accountants" },
          { id: 3, name: "Senior Accountant", level: 2, description: "HOD — assigns KPIs to assistant accountants" },
          { id: 4, name: "Accountant", level: 3, description: "Staff — submits KPI data" },
          { id: 5, name: "Assistant Accountant", level: 3, description: "Staff — submits KPI data" },
        ]);

        // Seed departments
        await db.insert(departments).values([
          { name: "Finance & Accounts", code: "FIN", description: "Finance and Accounts Department" },
          { name: "Budget & Planning", code: "BUD", description: "Budget and Planning Unit" },
          { name: "Procurement", code: "PRO", description: "Procurement Unit" },
        ]);

        // Create ADFA account
        const passwordHash = await bcrypt.hash(input.adminPassword, 12);
        const openId = `local_adfa_${Date.now()}`;
        const [r] = await db.insert(users).values({
          openId, name: input.adminName, email: input.adminEmail,
          passwordHash, employeeId: input.employeeId ?? null,
          roleId: 1, status: "ACTIVE", loginMethod: "local", role: "admin",
        });
        const adfaId = (r as any).insertId;
        await db.insert(auditLogs).values({ userId: adfaId, action: "SYSTEM_INIT", module: "Setup", details: `System initialized by ${input.adminEmail}` });
        return { success: true };
      }),
  }),

  // ─── Auth ────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(async (opts) => {
      if (!opts.ctx.user) return null;
      const db = await getDb();
      if (!db) return opts.ctx.user;
      const u = await db.select({
        id: users.id, openId: users.openId, name: users.name, email: users.email,
        employeeId: users.employeeId, roleId: users.roleId, departmentId: users.departmentId,
        status: users.status, role: users.role, createdAt: users.createdAt,
        roleName: roles.name, roleLevel: roles.level,
        deptName: departments.name,
      })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(eq(users.id, opts.ctx.user.id))
        .limit(1);
      return u[0] ?? opts.ctx.user;
    }),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const result = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        const user = result[0];
        console.log("[LOGIN] User found:", user?.email, "Hash exists:", !!user?.passwordHash);
        if (!user || !user.passwordHash) throw new Error("Invalid email or password");
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) throw new Error("Invalid email or password");
        if (user.status !== "ACTIVE") throw new Error("Account is not active. Contact administrator.");

        // Build session token using jose — must include openId, appId, name for sdk.verifySession
        const { SignJWT } = await import("jose");
        const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "kmfri-secret");
        const token = await new SignJWT({
          openId: user.openId,
          appId: process.env.VITE_APP_ID ?? "kmfri-local",
          name: user.name ?? user.email ?? "User",
          id: user.id,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("7d")
          .sign(secret);

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
        await db.insert(auditLogs).values({ userId: user.id, action: "LOGIN", module: "Auth", details: `User ${user.email} logged in` });

        return { success: true };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Users (Admin) ────────────────────────────────────────────────────────
  users: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: users.id, name: users.name, email: users.email, employeeId: users.employeeId,
        roleId: users.roleId, departmentId: users.departmentId, status: users.status,
        createdAt: users.createdAt, roleName: roles.name, roleLevel: roles.level,
        deptName: departments.name,
      })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .orderBy(users.name);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        employeeId: z.string().optional(),
        roleId: z.number().int().min(1).max(5),
        departmentId: z.number().int().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        // Only ADFA can create users
        if (ctx.user.roleId !== 1 && ctx.user.role !== "admin") throw new Error("Only ADFA can create users");
        const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (existing.length > 0) throw new Error("Email already registered");
        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const [result] = await db.insert(users).values({
          openId, name: input.name, email: input.email, passwordHash,
          employeeId: input.employeeId ?? null,
          roleId: input.roleId, departmentId: input.departmentId ?? null,
          status: "ACTIVE", loginMethod: "local",
        });
        const newUserId = (result as any).insertId;
        await createNotification(newUserId, "Welcome to KMFRI BSC", `Your account has been created. You can now log in and view your KPI assignments.`, "INFO");
        await db.insert(auditLogs).values({ userId: ctx.user.id, action: "CREATE_USER", module: "Users", details: `Created user ${input.email}` });
        return { id: newUserId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(2).optional(),
        employeeId: z.string().optional(),
        roleId: z.number().int().min(1).max(5).optional(),
        departmentId: z.number().int().nullable().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
        password: z.string().min(6).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId !== 1 && ctx.user.role !== "admin") throw new Error("Insufficient permissions");
        const { id, password, ...rest } = input;
        const updateData: Record<string, unknown> = { ...rest };
        if (password) updateData.passwordHash = await bcrypt.hash(password, 12);
        await db.update(users).set(updateData).where(eq(users.id, id));
        return { success: true };
      }),

    getHODs: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: users.id, name: users.name, email: users.email, employeeId: users.employeeId,
        roleId: users.roleId, departmentId: users.departmentId,
        roleName: roles.name, deptName: departments.name,
      })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(and(eq(users.status, "ACTIVE"), or(eq(users.roleId, 2), eq(users.roleId, 3))));
    }),

    getStaff: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: users.id, name: users.name, email: users.email, employeeId: users.employeeId,
        roleId: users.roleId, departmentId: users.departmentId,
        roleName: roles.name, deptName: departments.name,
      })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(and(eq(users.status, "ACTIVE"), or(eq(users.roleId, 4), eq(users.roleId, 5))));
    }),

    getMyTeam: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      // HOD sees staff in their department
      return db.select({
        id: users.id, name: users.name, email: users.email, employeeId: users.employeeId,
        roleId: users.roleId, departmentId: users.departmentId,
        roleName: roles.name, deptName: departments.name,
      })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(and(
          eq(users.status, "ACTIVE"),
          or(eq(users.roleId, 4), eq(users.roleId, 5)),
          ctx.user.departmentId ? eq(users.departmentId, ctx.user.departmentId) : sql`1=1`
        ));
    }),
  }),

  // ─── Roles ────────────────────────────────────────────────────────────────
  roles: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(roles).orderBy(roles.level);
    }),
  }),

  // ─── Departments ──────────────────────────────────────────────────────────
  departments: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: departments.id, name: departments.name, code: departments.code,
        headId: departments.headId, description: departments.description, createdAt: departments.createdAt,
        headName: users.name,
      })
        .from(departments)
        .leftJoin(users, eq(departments.headId, users.id))
        .orderBy(departments.name);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(2), code: z.string().optional(), description: z.string().optional(), headId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId !== 1) throw new Error("Only ADFA can manage departments");
        const [r] = await db.insert(departments).values(input);
        return { id: (r as any).insertId };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(2).optional(), code: z.string().optional(), description: z.string().optional(), headId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId !== 1) throw new Error("Only ADFA can manage departments");
        const { id, ...updates } = input;
        await db.update(departments).set(updates).where(eq(departments.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId !== 1) throw new Error("Only ADFA can manage departments");
        await db.delete(departments).where(eq(departments.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Strategic Goals ──────────────────────────────────────────────────────
  strategicGoals: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(strategicGoals).orderBy(desc(strategicGoals.createdAt));
    }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(3),
        description: z.string().optional(),
        perspective: z.enum(["FINANCIAL", "CUSTOMER", "INTERNAL", "LEARNING"]),
        weight: z.string().optional(),
        fiscalYear: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId !== 1 && ctx.user.role !== "admin") throw new Error("Only ADFA can manage strategic goals");
        const [r] = await db.insert(strategicGoals).values({ ...input, createdById: ctx.user.id });
        return { id: (r as any).insertId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(3).optional(),
        description: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "ACHIEVED"]).optional(),
        weight: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId !== 1 && ctx.user.role !== "admin") throw new Error("Only ADFA can manage strategic goals");
        const { id, ...rest } = input;
        await db.update(strategicGoals).set(rest).where(eq(strategicGoals.id, id));
        return { success: true };
      }),
  }),

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  kpis: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: kpis.id, name: kpis.name, description: kpis.description,
        perspective: kpis.perspective, targetValue: kpis.targetValue, unit: kpis.unit,
        frequency: kpis.frequency, baseline: kpis.baseline, weight: kpis.weight,
        minThreshold: kpis.minThreshold, maxThreshold: kpis.maxThreshold,
        status: kpis.status, goalId: kpis.goalId, fiscalYear: kpis.fiscalYear,
        createdById: kpis.createdById, createdAt: kpis.createdAt,
        goalTitle: strategicGoals.title, goalPerspective: strategicGoals.perspective,
        creatorName: users.name,
      })
        .from(kpis)
        .leftJoin(strategicGoals, eq(kpis.goalId, strategicGoals.id))
        .leftJoin(users, eq(kpis.createdById, users.id))
        .orderBy(desc(kpis.createdAt));
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(3),
        description: z.string().optional(),
        perspective: z.enum(["FINANCIAL", "CUSTOMER", "INTERNAL", "LEARNING"]),
        targetValue: z.string(),
        unit: z.string().min(1),
        frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"]).default("MONTHLY"),
        baseline: z.string().optional(),
        weight: z.string().optional(),
        minThreshold: z.string().optional(),
        maxThreshold: z.string().optional(),
        goalId: z.number().optional(),
        fiscalYear: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId !== 1 && ctx.user.role !== "admin") throw new Error("Only ADFA can create KPIs");
        const [r] = await db.insert(kpis).values({ ...input, createdById: ctx.user.id });
        await db.insert(auditLogs).values({ userId: ctx.user.id, action: "CREATE_KPI", module: "KPIs", details: `Created KPI: ${input.name}` });
        return { id: (r as any).insertId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(3).optional(),
        description: z.string().optional(),
        targetValue: z.string().optional(),
        unit: z.string().optional(),
        minThreshold: z.string().optional(),
        maxThreshold: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
        goalId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId !== 1 && ctx.user.role !== "admin") throw new Error("Only ADFA can update KPIs");
        const { id, ...rest } = input;
        await db.update(kpis).set(rest).where(eq(kpis.id, id));
        return { success: true };
      }),

    getData: protectedProcedure
      .input(z.object({ kpiId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select({
          id: kpiData.id, kpiId: kpiData.kpiId, actualValue: kpiData.actualValue,
          period: kpiData.period, notes: kpiData.notes, status: kpiData.status,
          createdAt: kpiData.createdAt, submitterName: users.name,
        })
          .from(kpiData)
          .leftJoin(users, eq(kpiData.submittedById, users.id))
          .where(eq(kpiData.kpiId, input.kpiId))
          .orderBy(desc(kpiData.period));
      }),

    bulkImport: protectedProcedure
      .input(z.object({
        rows: z.array(z.object({
          kpiName: z.string(),
          perspective: z.string(),
          targetValue: z.string(),
          period: z.string(),
          assignedTo: z.string(),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId !== 1 && ctx.user.role !== "admin") throw new Error("Only ADFA can bulk import KPIs");

        const results = { successCount: 0, warningCount: 0, failureCount: 0, errors: [] as string[] };

        for (const row of input.rows) {
          try {
            let kpiId: number | null = null;
            const existingKpi = await db.select({ id: kpis.id })
              .from(kpis)
              .where(eq(kpis.name, row.kpiName))
              .limit(1);
            
            if (existingKpi[0]) {
              kpiId = existingKpi[0].id;
            } else {
              const [r] = await db.insert(kpis).values({
                name: row.kpiName,
                perspective: row.perspective.toUpperCase() as any,
                targetValue: row.targetValue,
                unit: "%",
                status: "ACTIVE",
                createdById: ctx.user.id,
              });
              kpiId = (r as any).insertId;
            }

            if (!kpiId) {
              results.failureCount++;
              results.errors.push(`Row: ${row.kpiName} - Failed to create or find KPI`);
              continue;
            }

            const assignee = await db.select({ id: users.id, roleId: users.roleId })
              .from(users)
              .where(eq(users.name, row.assignedTo))
              .limit(1);
            
            if (!assignee[0]) {
              results.failureCount++;
              results.errors.push(`Row: ${row.kpiName} - Assignee "${row.assignedTo}" not found`);
              continue;
            }

            await db.insert(kpiAssignments).values({
              kpiId: kpiId,
              assignedToId: assignee[0].id,
              assignedById: ctx.user.id,
              period: row.period,
              targetValue: row.targetValue,
              notes: row.notes,
              level: [2, 3].includes(assignee[0].roleId) ? "ADFA_TO_HOD" : "HOD_TO_STAFF",
              status: "PENDING",
            });

            await createNotification(
              assignee[0].id,
              "KPI Assigned via Bulk Import",
              `KPI "${row.kpiName}" has been assigned to you for period ${row.period}`,
              "KPI_ASSIGNED",
              kpiId as number,
              "kpi"
            );

            results.successCount++;
          } catch (err) {
            results.failureCount++;
            results.errors.push(`Row: ${row.kpiName} - ${(err as Error).message}`);
          }
        }

        await db.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "BULK_IMPORT",
          module: "KPIs",
          details: `Bulk imported ${results.successCount} KPIs, ${results.failureCount} failures`,
        });

        return results;
      }),
  }),

  // ─── KPI Assignments ──────────────────────────────────────────────────────
  assignments: router({
    // ADFA assigns to HOD
    assignToHOD: protectedProcedure
      .input(z.object({
        kpiId: z.number(),
        assignedToId: z.number(),
        targetValue: z.string().optional(),
        period: z.string(),
        dueDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId !== 1 && ctx.user.role !== "admin") throw new Error("Only ADFA can assign KPIs to HODs");

        // Verify target is HOD
        const target = await db.select().from(users).where(eq(users.id, input.assignedToId)).limit(1);
        if (!target[0] || ![2, 3].includes(target[0].roleId)) throw new Error("Target must be a Principal or Senior Accountant (HOD)");

        const [r] = await db.insert(kpiAssignments).values({
          ...input, assignedById: ctx.user.id, level: "ADFA_TO_HOD",
        });
        const assignId = (r as any).insertId;

        // Get KPI name
        const kpi = await db.select().from(kpis).where(eq(kpis.id, input.kpiId)).limit(1);
        const kpiName = kpi[0]?.name ?? "KPI";

        // Notify HOD
        await createNotification(input.assignedToId, `New KPI Assigned by ADFA`, `You have been assigned the KPI: "${kpiName}" for period ${input.period}. Please review and cascade to your team.`, "KPI_ASSIGNED", assignId, "assignment");

        await db.insert(auditLogs).values({ userId: ctx.user.id, action: "ASSIGN_KPI_HOD", module: "Assignments", details: `Assigned KPI ${kpiName} to HOD ${target[0].name}` });
        return { id: assignId };
      }),

    // HOD assigns to Staff
    assignToStaff: protectedProcedure
      .input(z.object({
        kpiId: z.number(),
        assignedToId: z.number(),
        targetValue: z.string().optional(),
        period: z.string(),
        dueDate: z.string().optional(),
        notes: z.string().optional(),
        departmentId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (![2, 3].includes(ctx.user.roleId) && ctx.user.role !== "admin") throw new Error("Only HODs can assign KPIs to staff");

        // Verify target is staff
        const target = await db.select().from(users).where(eq(users.id, input.assignedToId)).limit(1);
        if (!target[0] || ![4, 5].includes(target[0].roleId)) throw new Error("Target must be an Accountant or Assistant Accountant");

        const [r] = await db.insert(kpiAssignments).values({
          ...input, assignedById: ctx.user.id, level: "HOD_TO_STAFF",
          departmentId: input.departmentId ?? ctx.user.departmentId ?? null,
        });
        const assignId = (r as any).insertId;

        const kpi = await db.select().from(kpis).where(eq(kpis.id, input.kpiId)).limit(1);
        const kpiName = kpi[0]?.name ?? "KPI";

        // Notify staff member
        await createNotification(input.assignedToId, `New KPI Assigned`, `Your HOD has assigned you the KPI: "${kpiName}" for period ${input.period}. Please submit your data before the due date.`, "KPI_ASSIGNED", assignId, "assignment");

        await db.insert(auditLogs).values({ userId: ctx.user.id, action: "ASSIGN_KPI_STAFF", module: "Assignments", details: `Assigned KPI ${kpiName} to staff ${target[0].name}` });
        return { id: assignId };
      }),

    // Get assignments for current user (as assignee)
    myAssignments: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const assignedBy = users;
      return db.select({
        id: kpiAssignments.id, kpiId: kpiAssignments.kpiId, period: kpiAssignments.period,
        targetValue: kpiAssignments.targetValue, dueDate: kpiAssignments.dueDate,
        notes: kpiAssignments.notes, status: kpiAssignments.status, level: kpiAssignments.level,
        createdAt: kpiAssignments.createdAt,
        kpiName: kpis.name, kpiUnit: kpis.unit, kpiPerspective: kpis.perspective,
        kpiTarget: kpis.targetValue, assignedByName: assignedBy.name,
      })
        .from(kpiAssignments)
        .leftJoin(kpis, eq(kpiAssignments.kpiId, kpis.id))
        .leftJoin(assignedBy, eq(kpiAssignments.assignedById, assignedBy.id))
        .where(eq(kpiAssignments.assignedToId, ctx.user.id))
        .orderBy(desc(kpiAssignments.createdAt));
    }),

    // Get assignments made by current user (as assigner)
    assignedByMe: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const assignedTo = users;
      return db.select({
        id: kpiAssignments.id, kpiId: kpiAssignments.kpiId, period: kpiAssignments.period,
        targetValue: kpiAssignments.targetValue, dueDate: kpiAssignments.dueDate,
        status: kpiAssignments.status, level: kpiAssignments.level, createdAt: kpiAssignments.createdAt,
        kpiName: kpis.name, kpiUnit: kpis.unit, kpiPerspective: kpis.perspective,
        assignedToName: assignedTo.name, assignedToRole: roles.name,
      })
        .from(kpiAssignments)
        .leftJoin(kpis, eq(kpiAssignments.kpiId, kpis.id))
        .leftJoin(assignedTo, eq(kpiAssignments.assignedToId, assignedTo.id))
        .leftJoin(roles, eq(assignedTo.roleId, roles.id))
        .where(eq(kpiAssignments.assignedById, ctx.user.id))
        .orderBy(desc(kpiAssignments.createdAt));
    }),

    // All assignments (ADFA view)
    all: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const assignedBy = users;
      const assignedTo = users;
      return db.select({
        id: kpiAssignments.id, kpiId: kpiAssignments.kpiId, period: kpiAssignments.period,
        targetValue: kpiAssignments.targetValue, status: kpiAssignments.status,
        level: kpiAssignments.level, createdAt: kpiAssignments.createdAt,
        kpiName: kpis.name, kpiPerspective: kpis.perspective,
        assignedByName: assignedBy.name, assignedToName: assignedTo.name,
      })
        .from(kpiAssignments)
        .leftJoin(kpis, eq(kpiAssignments.kpiId, kpis.id))
        .leftJoin(assignedBy, eq(kpiAssignments.assignedById, assignedBy.id))
        .leftJoin(assignedTo, eq(kpiAssignments.assignedToId, assignedTo.id))
        .orderBy(desc(kpiAssignments.createdAt));
    }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["ACCEPTED", "IN_PROGRESS", "SUBMITTED", "APPROVED", "REJECTED"]) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        await db.update(kpiAssignments).set({ status: input.status }).where(eq(kpiAssignments.id, input.id));

        const assignment = await db.select({
          assignedById: kpiAssignments.assignedById,
          assignedToId: kpiAssignments.assignedToId,
          kpiName: kpis.name,
        })
          .from(kpiAssignments)
          .leftJoin(kpis, eq(kpiAssignments.kpiId, kpis.id))
          .where(eq(kpiAssignments.id, input.id))
          .limit(1);

        if (assignment[0]) {
          const { assignedById, assignedToId, kpiName } = assignment[0];
          const notifType = input.status === "APPROVED" ? "KPI_APPROVED" : input.status === "REJECTED" ? "KPI_REJECTED" : "INFO";
          // Notify the assignee
          if (assignedToId) await createNotification(assignedToId, `KPI Assignment ${input.status}`, `Your KPI "${kpiName}" has been ${input.status.toLowerCase()}.`, notifType as any, input.id, "assignment");
          // Notify the assigner if submitted
          if (input.status === "SUBMITTED" && assignedById) await createNotification(assignedById, `KPI Data Submitted`, `${ctx.user.name} has submitted data for KPI "${kpiName}". Please review.`, "KPI_SUBMITTED", input.id, "assignment");
        }
        return { success: true };
      }),
  }),

  // ─── KPI Data Submission ──────────────────────────────────────────────────
  kpiData: router({
    submit: protectedProcedure
      .input(z.object({
        kpiId: z.number(),
        assignmentId: z.number().optional(),
        actualValue: z.string(),
        period: z.string(),
        notes: z.string().optional(),
        evidenceUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        const [r] = await db.insert(kpiData).values({
          ...input, submittedById: ctx.user.id, status: "PENDING",
        });
        const dataId = (r as any).insertId;

        // Update assignment status
        if (input.assignmentId) {
          await db.update(kpiAssignments).set({ status: "SUBMITTED" }).where(eq(kpiAssignments.id, input.assignmentId));
          const assignment = await db.select({ assignedById: kpiAssignments.assignedById })
            .from(kpiAssignments).where(eq(kpiAssignments.id, input.assignmentId)).limit(1);
          if (assignment[0]?.assignedById) {
            const kpi = await db.select().from(kpis).where(eq(kpis.id, input.kpiId)).limit(1);
            await createNotification(assignment[0].assignedById, "KPI Data Submitted for Review", `${ctx.user.name} submitted data for KPI "${kpi[0]?.name}" (Period: ${input.period}). Please review and approve.`, "KPI_SUBMITTED", dataId, "kpiData");
          }
        }

        // Run anomaly detection
        await runAnomalyDetection(input.kpiId, dataId, parseFloat(input.actualValue), ctx.user.id, input.assignmentId);

        await db.insert(auditLogs).values({ userId: ctx.user.id, action: "SUBMIT_KPI_DATA", module: "KPIData", details: `Submitted data for KPI ${input.kpiId}, value: ${input.actualValue}` });
        return { id: dataId };
      }),

    review: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["APPROVED", "REJECTED"]),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (![1, 2, 3].includes(ctx.user.roleId) && ctx.user.role !== "admin") throw new Error("Only ADFA or HODs can review KPI data");

        await db.update(kpiData).set({ status: input.status, reviewedById: ctx.user.id, rejectionReason: input.rejectionReason ?? null }).where(eq(kpiData.id, input.id));

        const entry = await db.select({ submittedById: kpiData.submittedById, kpiId: kpiData.kpiId })
          .from(kpiData).where(eq(kpiData.id, input.id)).limit(1);

        if (entry[0]) {
          const kpi = await db.select().from(kpis).where(eq(kpis.id, entry[0].kpiId)).limit(1);
          const notifType = input.status === "APPROVED" ? "KPI_APPROVED" : "KPI_REJECTED";
          await createNotification(entry[0].submittedById, `KPI Data ${input.status}`, `Your KPI data for "${kpi[0]?.name}" has been ${input.status.toLowerCase()}${input.rejectionReason ? `: ${input.rejectionReason}` : "."}`, notifType, input.id, "kpiData");
        }
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ assignmentId: z.number().optional(), kpiId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return [];
        const conditions = [];
        if (input?.assignmentId) conditions.push(eq(kpiData.assignmentId, input.assignmentId));
        if (input?.kpiId) conditions.push(eq(kpiData.kpiId, input.kpiId));
        // Staff only see their own
        if ([4, 5].includes(ctx.user.roleId)) conditions.push(eq(kpiData.submittedById, ctx.user.id));

        return db.select({
          id: kpiData.id, kpiId: kpiData.kpiId, actualValue: kpiData.actualValue,
          period: kpiData.period, notes: kpiData.notes, status: kpiData.status,
          rejectionReason: kpiData.rejectionReason, createdAt: kpiData.createdAt,
          kpiName: kpis.name, kpiUnit: kpis.unit, kpiTarget: kpis.targetValue,
          submitterName: users.name,
        })
          .from(kpiData)
          .leftJoin(kpis, eq(kpiData.kpiId, kpis.id))
          .leftJoin(users, eq(kpiData.submittedById, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(kpiData.createdAt));
      }),
  }),

  // ─── Notifications ────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { count: 0 };
      const result = await db.select({ count: count() }).from(notifications)
        .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));
      return { count: result[0]?.count ?? 0 };
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, ctx.user.id));
      return { success: true };
    }),
  }),

  // ─── Anomaly Detection ────────────────────────────────────────────────────
  anomalies: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      // Staff only see their own anomalies
      if ([4, 5].includes(ctx.user.roleId)) conditions.push(eq(anomalies.detectedForUserId, ctx.user.id));
      return db.select({
        id: anomalies.id, description: anomalies.description, anomalyType: anomalies.anomalyType,
        severity: anomalies.severity, status: anomalies.status, actualValue: anomalies.actualValue,
        expectedMin: anomalies.expectedMin, expectedMax: anomalies.expectedMax,
        createdAt: anomalies.createdAt, resolvedAt: anomalies.resolvedAt,
        kpiName: kpis.name, kpiPerspective: kpis.perspective,
      })
        .from(anomalies)
        .leftJoin(kpis, eq(anomalies.kpiId, kpis.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(anomalies.createdAt));
    }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"]) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const updateData: Record<string, unknown> = { status: input.status };
        if (input.status === "RESOLVED") { updateData.resolvedById = ctx.user.id; updateData.resolvedAt = new Date(); }
        await db.update(anomalies).set(updateData).where(eq(anomalies.id, input.id));
        return { success: true };
      }),

    stats: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { total: 0, open: 0, critical: 0, resolved: 0 };
      const all = await db.select({ status: anomalies.status, severity: anomalies.severity }).from(anomalies);
      return {
        total: all.length,
        open: all.filter(a => a.status === "OPEN").length,
        critical: all.filter(a => a.severity === "CRITICAL").length,
        resolved: all.filter(a => a.status === "RESOLVED").length,
      };
    }),
  }),

  // ─── Dashboard ────────────────────────────────────────────────────────────
  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const [totalKpis, totalUsers, totalAssignments, openAnomalies, pendingData] = await Promise.all([
        db.select({ count: count() }).from(kpis).where(eq(kpis.status, "ACTIVE")),
        db.select({ count: count() }).from(users).where(eq(users.status, "ACTIVE")),
        db.select({ count: count() }).from(kpiAssignments),
        db.select({ count: count() }).from(anomalies).where(eq(anomalies.status, "OPEN")),
        db.select({ count: count() }).from(kpiData).where(eq(kpiData.status, "PENDING")),
      ]);

      // Performance by perspective
      const allData = await db.select({
        perspective: kpis.perspective,
        target: kpis.targetValue,
        actual: kpiData.actualValue,
        status: kpiData.status,
      })
        .from(kpiData)
        .leftJoin(kpis, eq(kpiData.kpiId, kpis.id))
        .where(eq(kpiData.status, "APPROVED"));

      const perspectiveMap: Record<string, { total: number; count: number }> = {};
      for (const d of allData) {
        const p = d.perspective ?? "UNKNOWN";
        if (!perspectiveMap[p]) perspectiveMap[p] = { total: 0, count: 0 };
        const target = parseFloat(d.target as string);
        const actual = parseFloat(d.actual as string);
        if (target > 0) perspectiveMap[p].total += (actual / target) * 100;
        perspectiveMap[p].count++;
      }

      const perspectives = Object.entries(perspectiveMap).map(([name, v]) => ({
        name, score: v.count > 0 ? Math.round(v.total / v.count) : 0,
      }));

      return {
        totalKpis: totalKpis[0]?.count ?? 0,
        totalUsers: totalUsers[0]?.count ?? 0,
        totalAssignments: totalAssignments[0]?.count ?? 0,
        openAnomalies: openAnomalies[0]?.count ?? 0,
        pendingReviews: pendingData[0]?.count ?? 0,
        perspectives,
      };
    }),

    myKpiPerformance: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: kpiAssignments.id, kpiId: kpiAssignments.kpiId, period: kpiAssignments.period,
        targetValue: kpiAssignments.targetValue, status: kpiAssignments.status,
        kpiName: kpis.name, kpiUnit: kpis.unit, kpiTarget: kpis.targetValue,
        kpiPerspective: kpis.perspective,
      })
        .from(kpiAssignments)
        .leftJoin(kpis, eq(kpiAssignments.kpiId, kpis.id))
        .where(eq(kpiAssignments.assignedToId, ctx.user.id))
        .orderBy(desc(kpiAssignments.createdAt));
    }),
  }),

  // ─── AI Assistant ─────────────────────────────────────────────────────────
  ai: router({
    chat: protectedProcedure
      .input(z.object({ message: z.string().min(1).max(2000) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        // Save user message
        await db.insert(aiChats).values({ userId: ctx.user.id, role: "user" as const, content: input.message });

        // Build context
        const myAssignments = await db.select({
          kpiName: kpis.name, period: kpiAssignments.period, status: kpiAssignments.status,
          targetValue: kpiAssignments.targetValue, kpiUnit: kpis.unit,
        })
          .from(kpiAssignments)
          .leftJoin(kpis, eq(kpiAssignments.kpiId, kpis.id))
          .where(eq(kpiAssignments.assignedToId, ctx.user.id))
          .limit(10);

        const recentData = await db.select({
          kpiName: kpis.name, actualValue: kpiData.actualValue, period: kpiData.period, status: kpiData.status,
        })
          .from(kpiData)
          .leftJoin(kpis, eq(kpiData.kpiId, kpis.id))
          .where(eq(kpiData.submittedById, ctx.user.id))
          .orderBy(desc(kpiData.createdAt))
          .limit(5);

        const openAnomalies = await db.select({ description: anomalies.description, severity: anomalies.severity })
          .from(anomalies)
          .where(and(eq(anomalies.status, "OPEN"), eq(anomalies.detectedForUserId, ctx.user.id)))
          .limit(3);

        // Get chat history
        const history = await db.select().from(aiChats)
          .where(eq(aiChats.userId, ctx.user.id))
          .orderBy(desc(aiChats.createdAt))
          .limit(10);

        const systemPrompt = `You are the KMFRI BSC AI Assistant — an intelligent assistant for the Kenya Marine and Fisheries Research Institute's Balanced Scorecard Performance Management System.

User: ${ctx.user.name} | Role: ${(ctx.user as any).roleName ?? "Staff"} | Department: ${(ctx.user as any).deptName ?? "Finance"}

Current KPI Assignments (${myAssignments.length}):
${myAssignments.map(a => `- ${a.kpiName}: Target ${a.targetValue} ${a.kpiUnit}, Period ${a.period}, Status: ${a.status}`).join("\n") || "No assignments yet"}

Recent Submissions (${recentData.length}):
${recentData.map(d => `- ${d.kpiName}: Actual ${d.actualValue}, Period ${d.period}, Status: ${d.status}`).join("\n") || "No submissions yet"}

Open Anomalies (${openAnomalies.length}):
${openAnomalies.map(a => `- [${a.severity}] ${a.description}`).join("\n") || "No anomalies"}

You help users:
1. Understand their KPI assignments and targets
2. Navigate the submission and approval workflow
3. Interpret performance data and trends
4. Understand anomaly alerts
5. Learn about the BSC framework (Financial, Customer, Internal, Learning perspectives)
6. Guide ADFA on assigning KPIs to HODs and staff

Be concise, professional, and specific to KMFRI's government finance context. Use KES for monetary values.`;

        const messages: Message[] = [
          { role: "system", content: systemPrompt },
          ...history.reverse().slice(-8).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
          { role: "user", content: input.message },
        ];

        const response = await invokeLLM({ messages });
                const rawReply = response.choices[0]?.message?.content;
        const reply = typeof rawReply === "string" ? rawReply : (Array.isArray(rawReply) ? rawReply.map((p: any) => p.text ?? "").join("") : "I'm sorry, I couldn't process your request. Please try again.");
        // Save assistant reply
        await db.insert(aiChats).values({ userId: ctx.user.id, role: "assistant" as const, content: reply });

        return { reply };
      }),

    history: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(aiChats)
        .where(eq(aiChats.userId, ctx.user.id))
        .orderBy(aiChats.createdAt)
        .limit(50);
    }),

    clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(aiChats).where(eq(aiChats.userId, ctx.user.id));
      return { success: true };
    }),
  }),

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  audit: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      if (ctx.user.roleId !== 1 && ctx.user.role !== "admin") throw new Error("Only ADFA can view audit logs");
      return db.select({
        id: auditLogs.id, action: auditLogs.action, module: auditLogs.module,
        details: auditLogs.details, createdAt: auditLogs.createdAt, userName: users.name,
      })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(100);
    }),
  }),

  // ─── Leave Management ─────────────────────────────────────────────────────
  leave: router({
    submit: protectedProcedure
      .input((i: any) => i)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        await db.insert(leaveRequests).values({
          userId: ctx.user.id,
          leaveType: input.leaveType,
          startDate: input.startDate,
          endDate: input.endDate,
          days: input.days,
          reason: input.reason,
          status: "PENDING",
        });
        await createNotification(ctx.user.id, "Leave Request Submitted", `Your ${input.leaveType} leave request has been submitted for approval.`, "INFO");
        return { success: true };
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const isHodOrAdfa = ctx.user.roleId <= 2;
      if (isHodOrAdfa) {
        return db.select().from(leaveRequests).where(eq(leaveRequests.status, "PENDING")).orderBy(desc(leaveRequests.createdAt));
      }
      return db.select().from(leaveRequests).where(eq(leaveRequests.userId, ctx.user.id)).orderBy(desc(leaveRequests.createdAt));
    }),
    approve: protectedProcedure
      .input((i: any) => i)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId > 2) throw new Error("Only HOD/ADFA can approve leave");
        const leave = await db.select().from(leaveRequests).where(eq(leaveRequests.id, input.id)).limit(1);
        if (!leave[0]) throw new Error("Leave request not found");
        await db.update(leaveRequests).set({ status: "APPROVED", approvedById: ctx.user.id, approvalNotes: input.notes }).where(eq(leaveRequests.id, input.id));
        await createNotification(leave[0].userId, "Leave Approved", `Your ${leave[0].leaveType} leave has been approved.`, "SUCCESS");
        return { success: true };
      }),
    reject: protectedProcedure
      .input((i: any) => i)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        if (ctx.user.roleId > 2) throw new Error("Only HOD/ADFA can reject leave");
        const leave = await db.select().from(leaveRequests).where(eq(leaveRequests.id, input.id)).limit(1);
        if (!leave[0]) throw new Error("Leave request not found");
        await db.update(leaveRequests).set({ status: "REJECTED", approvedById: ctx.user.id, approvalNotes: input.notes }).where(eq(leaveRequests.id, input.id));
        await createNotification(leave[0].userId, "Leave Rejected", `Your ${leave[0].leaveType} leave has been rejected. Reason: ${input.notes}`, "WARNING");
        return { success: true };
      }),
    balance: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(leaveBalance).where(eq(leaveBalance.userId, ctx.user.id));
    }),
  }),

  // ─── Budget Tracking ──────────────────────────────────────────────────────
  budget: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      if (ctx.user.roleId !== 1 && ctx.user.role !== "admin") throw new Error("Only ADFA can view budgets");
      return db.select().from(budgets).orderBy(budgets.fiscalYear);
    }),
    byDepartment: protectedProcedure
      .input((i: any) => i)
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(budgets).where(eq(budgets.departmentId, input.departmentId));
      }),
  }),

  // ─── Evidence Portal ──────────────────────────────────────────────────────
  evidence: router({
    upload: protectedProcedure
      .input((i: any) => i)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        await db.insert(evidenceDocuments).values({
          kpiDataId: input.kpiDataId,
          assignmentId: input.assignmentId,
          uploadedById: ctx.user.id,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          fileType: input.fileType,
          fileSize: input.fileSize,
          description: input.description,
          status: "ACTIVE",
        });
        return { success: true };
      }),
    list: protectedProcedure
      .input((i: any) => i)
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        if (input.kpiDataId) {
          return db.select().from(evidenceDocuments).where(eq(evidenceDocuments.kpiDataId, input.kpiDataId));
        }
        if (input.assignmentId) {
          return db.select().from(evidenceDocuments).where(eq(evidenceDocuments.assignmentId, input.assignmentId));
        }
        return [];
      }),
    delete: protectedProcedure
      .input((i: any) => i)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(evidenceDocuments).where(eq(evidenceDocuments.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Export Reports ───────────────────────────────────────────────────────
  export: router({
    kpiReport: protectedProcedure
      .input((i: any) => i)
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;
        const assignments = await db.select({
          kpiName: kpis.name,
          targetValue: kpiAssignments.targetValue,
          actualValue: kpiData.actualValue,
          period: kpiData.period,
          status: kpiData.status,
          perspective: kpis.perspective,
        })
          .from(kpiAssignments)
          .leftJoin(kpis, eq(kpiAssignments.kpiId, kpis.id))
          .leftJoin(kpiData, eq(kpiAssignments.id, kpiData.assignmentId))
          .where(eq(kpiAssignments.assignedToId, ctx.user.id))
          .orderBy(kpiData.period);
        return { data: assignments, format: input.format };
      }),
    dashboardReport: protectedProcedure
      .input((i: any) => i)
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;
        const stats = await db.select({
          totalKpis: count(kpis.id),
          totalAssignments: count(kpiAssignments.id),
          approvedCount: count(kpiData.id),
        })
          .from(kpis)
          .leftJoin(kpiAssignments, eq(kpis.id, kpiAssignments.kpiId))
          .leftJoin(kpiData, eq(kpiAssignments.id, kpiData.assignmentId));
        return { data: stats, format: input.format };
      }),
  }),

});

export type AppRouter = typeof appRouter;
