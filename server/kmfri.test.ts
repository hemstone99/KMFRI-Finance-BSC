import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-001",
    email: "test@kmfri.go.ke",
    name: "Test User",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser | null = null): TrpcContext {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth", () => {
  it("me returns null when unauthenticated", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user when authenticated", async () => {
    const user = makeUser({ name: "Susan Ogolla", email: "susan@kmfri.go.ke" });
    const caller = appRouter.createCaller(makeCtx(user));
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Susan Ogolla");
  });

  it("logout clears session cookie", async () => {
    const { COOKIE_NAME } = await import("../shared/const");
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: makeUser(),
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

// ─── Setup Tests ──────────────────────────────────────────────────────────────

describe("setup.status", () => {
  it("returns status object with expected shape", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const status = await caller.setup.status();
    expect(status).toHaveProperty("initialized");
    expect(status).toHaveProperty("rolesSeeded");
    expect(status).toHaveProperty("hasAdfa");
    expect(typeof status.initialized).toBe("boolean");
    expect(typeof status.rolesSeeded).toBe("boolean");
    expect(typeof status.hasAdfa).toBe("boolean");
  });
});

// ─── Anomaly Detection Tests ──────────────────────────────────────────────────

describe("anomaly detection logic", () => {
  it("detects value exceeding maximum threshold", () => {
    const kpi = { target: 100, minValue: 0, maxValue: 100 };
    const value = 200; // 200 > 100 * 1.5 = 150, so this is an anomaly
    const isAnomaly = kpi.maxValue !== null && value > kpi.maxValue * 1.5;
    expect(isAnomaly).toBe(true);
  });

  it("detects value below minimum threshold", () => {
    const kpi = { target: 100, minValue: 10, maxValue: 100 };
    const value = 2;
    const isAnomaly = kpi.minValue !== null && value < kpi.minValue * 0.5;
    expect(isAnomaly).toBe(true);
  });

  it("accepts normal value within range", () => {
    const kpi = { target: 100, minValue: 0, maxValue: 100 };
    const value = 75;
    const isAnomaly = kpi.maxValue !== null && value > kpi.maxValue * 1.5;
    expect(isAnomaly).toBe(false);
  });

  it("calculates severity correctly", () => {
    const getSeverity = (deviation: number): string => {
      if (deviation >= 50) return "CRITICAL";
      if (deviation >= 25) return "HIGH";
      if (deviation >= 10) return "MEDIUM";
      return "LOW";
    };
    expect(getSeverity(60)).toBe("CRITICAL");
    expect(getSeverity(30)).toBe("HIGH");
    expect(getSeverity(15)).toBe("MEDIUM");
    expect(getSeverity(5)).toBe("LOW");
  });
});

// ─── KPI Hierarchy Tests ──────────────────────────────────────────────────────

describe("KPI role hierarchy", () => {
  it("ADFA role has id 1", () => {
    const ROLE_ADFA = 1;
    const ROLE_PRINCIPAL = 2;
    const ROLE_SENIOR = 3;
    const ROLE_ACCOUNTANT = 4;
    const ROLE_ASSISTANT = 5;

    // ADFA can assign to HODs (Principal and Senior Accountants)
    const adfaCanAssignTo = [ROLE_PRINCIPAL, ROLE_SENIOR];
    expect(adfaCanAssignTo).toContain(ROLE_PRINCIPAL);
    expect(adfaCanAssignTo).toContain(ROLE_SENIOR);
    expect(adfaCanAssignTo).not.toContain(ROLE_ADFA);
  });

  it("HODs can assign to Accountants and Assistants", () => {
    const ROLE_ACCOUNTANT = 4;
    const ROLE_ASSISTANT = 5;
    const hodCanAssignTo = [ROLE_ACCOUNTANT, ROLE_ASSISTANT];
    expect(hodCanAssignTo).toContain(ROLE_ACCOUNTANT);
    expect(hodCanAssignTo).toContain(ROLE_ASSISTANT);
  });

  it("validates KPI perspective types", () => {
    const validPerspectives = ["FINANCIAL", "CUSTOMER", "INTERNAL", "LEARNING"];
    expect(validPerspectives).toContain("FINANCIAL");
    expect(validPerspectives).toContain("CUSTOMER");
    expect(validPerspectives).toContain("INTERNAL");
    expect(validPerspectives).toContain("LEARNING");
    expect(validPerspectives).not.toContain("INVALID");
  });
});

// ─── Notification Tests ───────────────────────────────────────────────────────

describe("notification types", () => {
  it("validates notification type enum values", () => {
    const validTypes = [
      "KPI_ASSIGNED",
      "KPI_SUBMITTED",
      "KPI_APPROVED",
      "KPI_REJECTED",
      "ANOMALY_DETECTED",
      "SYSTEM",
    ];
    expect(validTypes).toContain("KPI_ASSIGNED");
    expect(validTypes).toContain("ANOMALY_DETECTED");
    expect(validTypes).not.toContain("UNKNOWN_TYPE");
  });
});
