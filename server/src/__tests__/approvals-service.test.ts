import { beforeEach, describe, expect, it, vi } from "vitest";
import { approvalService } from "../services/approvals.ts";
import type { ApprovalRecord } from "../services/approvals.ts";

// Mocking services
const mockAgentService = vi.hoisted(() => ({
  activatePendingApproval: vi.fn(),
  create: vi.fn(),
  terminate: vi.fn(),
}));

const mockGoalService = vi.hoisted(() => ({
  getById: vi.fn(),
  update: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  wakeup: vi.fn(),
}));

const mockActivityService = vi.hoisted(() => ({
  log: vi.fn(),
}));

vi.mock("../services/agents.js", () => ({
  agentService: vi.fn(() => mockAgentService),
}));

vi.mock("../services/goals.ts", () => ({
  goalService: vi.fn(() => mockGoalService),
}));

vi.mock("../services/heartbeat.js", () => ({
  heartbeatService: vi.fn(() => mockHeartbeatService),
}));

vi.mock("../services/activity.ts", () => ({
  activityService: vi.fn(() => mockActivityService),
}));

// Mocking the main approvalService logic to inject mocks
vi.mock("../services/approvals.ts", async () => {
  const actual = await vi.importActual<typeof import("../services/approvals.ts")>("../services/approvals.ts");
  return {
    ...actual,
    approvalService: vi.fn((db: any) => {
      const svc = actual.approvalService(db);
      // Override methods to use our mocks
      svc.approve = vi.fn(svc.approve);
      svc.reject = vi.fn(svc.reject);
      svc.requestRevision = vi.fn(svc.requestRevision);
      return svc;
    }),
  };
});

// Helper to create mock approval records
function createApproval(id: string, type: string, status: string, requestedByAgentId: string | null = "requester-1", goalId: string | null = null): ApprovalRecord {
  const payload: Record<string, unknown> = {};
  if (type === "hire_agent") {
    payload.agentId = "agent-1";
  } else if (type === "goal_plan") {
    payload.goalId = goalId ?? "goal-1";
    payload.goalTitle = "Test Goal Plan";
    payload.plan = "Plan details";
  } else if (type === "goal_completion") {
    payload.goalId = goalId ?? "goal-1";
    payload.goalTitle = "Test Goal Completion";
    payload.outcome = "Complete";
    payload.issuesDone = 5;
    payload.issuesTotal = 5;
  }

  return {
    id,
    companyId: "company-1",
    type,
    status,
    payload,
    requestedByAgentId,
  };
}

describe("approvalService", () => {
  let svc: ReturnType<typeof approvalService>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks for services used in approval resolution side-effects
    mockAgentService.activatePendingApproval.mockResolvedValue(undefined);
    mockAgentService.create.mockResolvedValue({ id: "agent-1" });
    mockAgentService.terminate.mockResolvedValue(undefined);
    mockGoalService.getById.mockResolvedValue({
      id: "goal-1",
      companyId: "company-1",
      ownerAgentId: "agent-1",
      status: "active",
    });
    mockHeartbeatService.wakeup.mockResolvedValue({ runId: "run-123" });

    // Initialize approvalService with a mock DB
    const db = { select: vi.fn(), update: vi.fn() } as unknown as Db;
    svc = approvalService(db);
  });

  // --- Idempotency Tests (existing) ---
  describe("resolution idempotency", () => {
    it("treats repeated approve retries as no-ops after another worker resolves the approval", async () => {
      const selectWhere = vi.fn().mockResolvedValueOnce([createApproval("approval-1", "hire_agent", "approved")]);
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      const db = { select: vi.fn().mockReturnValue({ from: selectFrom }) } as unknown as Db;
      const svc = approvalService(db);
      const result = await svc.approve("approval-1", "board", "ship it");

      expect(result.applied).toBe(false);
      expect(result.approval.status).toBe("approved");
      expect(mockAgentService.activatePendingApproval).not.toHaveBeenCalled();
    });

    it("treats repeated reject retries as no-ops after another worker resolves the approval", async () => {
      const selectWhere = vi.fn().mockResolvedValueOnce([createApproval("approval-1", "hire_agent", "rejected")]);
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      const db = { select: vi.fn().mockReturnValue({ from: selectFrom }) } as unknown as Db;
      const svc = approvalService(db);
      const result = await svc.reject("approval-1", "board", "not now");

      expect(result.applied).toBe(false);
      expect(result.approval.status).toBe("rejected");
      expect(mockAgentService.terminate).not.toHaveBeenCalled();
    });

    it("still performs side effects when the resolution update is newly applied", async () => {
      const approved = createApproval("approval-1", "hire_agent", "approved");
      const selectWhere = vi.fn().mockResolvedValueOnce([createApproval("approval-1", "hire_agent", "pending")]);
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      const returning = vi.fn().mockResolvedValueOnce([approved]);
      const updateWhere = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where: updateWhere });
      const db = {
        select: vi.fn().mockReturnValue({ from: selectFrom }),
        update: vi.fn().mockReturnValue({ set }),
      } as unknown as Db;
      const svc = approvalService(db);
      const result = await svc.approve("approval-1", "board", "ship it");

      expect(result.applied).toBe(true);
      expect(mockAgentService.activatePendingApproval).toHaveBeenCalledWith("agent-1");
    });
  });

  // --- New Tests for Goal Pursuits ---
  describe("goal pursuit approvals", () => {
    it("should trigger goal_activated wakeup on approve for 'goal_plan' type", async () => {
      const goalPlanApproval = createApproval("approval-1", "goal_plan", "pending", "agent-1", "goal-1");
      const approvedGoalPlan = { ...goalPlanApproval, status: "approved" };

      const selectWhere = vi.fn().mockResolvedValueOnce([goalPlanApproval]);
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      const returning = vi.fn().mockResolvedValueOnce([approvedGoalPlan]);
      const updateWhere = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where: updateWhere });
      const db = {
        select: vi.fn().mockReturnValue({ from: selectFrom }),
        update: vi.fn().mockReturnValue({ set }),
      } as unknown as Db;
      const svc = approvalService(db);
      const result = await svc.approve("approval-1", "board", "Proceed with plan");

      expect(result.applied).toBe(true);
      expect(result.approval.status).toBe("approved");
      expect(mockGoalService.getById).toHaveBeenCalledWith("goal-1");
      expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith("agent-1", {
        source: "automation",
        triggerDetail: "system",
        reason: "goal_activated",
        payload: { goalId: "goal-1", mutation: "activate" },
        contextSnapshot: {
          goalId: "goal-1",
          wakeReason: "goal_activated",
          source: "goal.activated",
        },
      });
    });

    it("should trigger goal_activated wakeup on approve for 'goal_completion' type", async () => {
      const goalCompletionApproval = createApproval("approval-2", "goal_completion", "pending", "agent-1", "goal-2");
      const approvedGoalCompletion = { ...goalCompletionApproval, status: "approved" };
      const selectWhere = vi.fn().mockResolvedValueOnce([goalCompletionApproval]);
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      const returning = vi.fn().mockResolvedValueOnce([approvedGoalCompletion]);
      const updateWhere = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where: updateWhere });
      const db = {
        select: vi.fn().mockReturnValue({ from: selectFrom }),
        update: vi.fn().mockReturnValue({ set }),
      } as unknown as Db;
      const svc = approvalService(db);
      const result = await svc.approve("approval-2", "board", "Confirm completion");

      expect(result.applied).toBe(true);
      expect(result.approval.status).toBe("approved");
      expect(mockGoalService.getById).toHaveBeenCalledWith("goal-2");
      expect(mockGoalService.update).toHaveBeenCalledWith("goal-2", { status: "achieved" });
      expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith("agent-1", {
        source: "automation",
        triggerDetail: "system",
        reason: "goal_work_complete",
        payload: { goalId: "goal-2" },
        contextSnapshot: {
          goalId: "goal-2",
          wakeReason: "goal_work_complete",
          source: "approval.approved",
        },
      });
    });

    it("should trigger goal_activated wakeup on reject for 'goal_plan' type", async () => {
      const goalPlanApproval = createApproval("approval-1", "goal_plan", "pending", "agent-1", "goal-1");
      const rejectedGoalPlan = { ...goalPlanApproval, status: "rejected" };
      const selectWhere = vi.fn().mockResolvedValueOnce([goalPlanApproval]);
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      const returning = vi.fn().mockResolvedValueOnce([rejectedGoalPlan]);
      const updateWhere = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where: updateWhere });
      const db = {
        select: vi.fn().mockReturnValue({ from: selectFrom }),
        update: vi.fn().mockReturnValue({ set }),
      } as unknown as Db;
      const svc = approvalService(db);
      const result = await svc.reject("approval-1", "board", "Not feasible");

      expect(result.applied).toBe(true);
      expect(result.approval.status).toBe("rejected");
      expect(mockGoalService.getById).not.toHaveBeenCalled(); // No goal update needed for rejection
      expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith("agent-1", {
        source: "automation",
        triggerDetail: "system",
        reason: "approval_rejected",
        payload: { goalId: "goal-1", approvalStatus: "rejected", agentId: "agent-1" },
        contextSnapshot: {
          goalId: "goal-1",
          wakeReason: "approval_rejected",
          source: "approval.rejected",
        },
      });
    });

    it("should trigger goal_activated wakeup on reject for 'goal_completion' type", async () => {
      const goalCompletionApproval = createApproval("approval-2", "goal_completion", "pending", "agent-1", "goal-2");
      const rejectedGoalCompletion = { ...goalCompletionApproval, status: "rejected" };
      const selectWhere = vi.fn().mockResolvedValueOnce([goalCompletionApproval]);
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      const returning = vi.fn().mockResolvedValueOnce([rejectedGoalCompletion]);
      const updateWhere = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where: updateWhere });
      const db = {
        select: vi.fn().mockReturnValue({ from: selectFrom }),
        update: vi.fn().mockReturnValue({ set }),
      } as unknown as Db;
      const svc = approvalService(db);
      const result = await svc.reject("approval-2", "board", "Further review needed");

      expect(result.applied).toBe(true);
      expect(result.approval.status).toBe("rejected");
      expect(mockGoalService.getById).not.toHaveBeenCalled(); // No goal update needed for rejection
      expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith("agent-1", {
        source: "automation",
        triggerDetail: "system",
        reason: "approval_rejected",
        payload: { goalId: "goal-2", approvalStatus: "rejected", agentId: "agent-1" },
        contextSnapshot: {
          goalId: "goal-2",
          wakeReason: "approval_rejected",
          source: "approval.rejected",
        },
      });
    });

    it("should trigger goal_activated wakeup on requestRevision for 'goal_plan' type", async () => {
      const goalPlanApproval = createApproval("approval-1", "goal_plan", "pending", "agent-1", "goal-1");
      const revisionRequested = { ...goalPlanApproval, status: "revision_requested" };
      const selectWhere = vi.fn().mockResolvedValueOnce([goalPlanApproval]);
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      const returning = vi.fn().mockResolvedValueOnce([revisionRequested]);
      const updateWhere = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where: updateWhere });
      const db = {
        select: vi.fn().mockReturnValue({ from: selectFrom }),
        update: vi.fn().mockReturnValue({ set }),
      } as unknown as Db;
      const svc = approvalService(db);
      const result = await svc.requestRevision("approval-1", "board", "Provide more details");

      expect(result.applied).toBe(true);
      expect(result.approval.status).toBe("revision_requested");
      expect(mockGoalService.getById).not.toHaveBeenCalled(); // No goal update needed for revision request
      expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith("agent-1", {
        source: "automation",
        triggerDetail: "system",
        reason: "approval_revision_requested",
        payload: { goalId: "goal-1", approvalStatus: "revision_requested", agentId: "agent-1" },
        contextSnapshot: {
          goalId: "goal-1",
          wakeReason: "approval_revision_requested",
          source: "approval.revision_requested",
        },
      });
    });
  });
});
