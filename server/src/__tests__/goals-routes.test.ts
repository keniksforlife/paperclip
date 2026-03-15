import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@paperclipai/db";
import { goalRoutes } from "../routes/goals.ts";

// Mocked functions and services
const mockLogActivity = vi.fn();
const mockGoalService = {
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  getAncestors: vi.fn(),
  getChildren: vi.fn(),
  getLinkedProjects: vi.fn(),
  getIssuesForGoal: vi.fn(),
  countOpenSubgoals: vi.fn(),
  linkProject: vi.fn(),
  unlinkProject: vi.fn(),
};
const mockActivityService = { list: vi.fn() };
const mockHeartbeatService = { wakeup: vi.fn() };
const mockResolveCeoAgentId = vi.fn(); // Mock this directly

// Single vi.mock call for ../services/index.js
vi.mock("../services/index.js", async () => ({
  ...(await vi.importActual("../services/index.js")), // Import actual module to preserve other exports if needed
  goalService: vi.fn(() => mockGoalService),
  activityService: vi.fn(() => mockActivityService),
  heartbeatService: vi.fn(() => mockHeartbeatService),
  logActivity: mockLogActivity, // Provide the mockLogActivity
  resolveCeoAgentId: mockResolveCeoAgentId, // Provide the mockResolveCeoAgentId
}));

// Mock logger separately as it's from a different module
vi.mock("../middleware/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use("/goals", goalRoutes(mockDb as unknown as Db));

const mockGoal = {
  id: "goal-1",
  companyId: "company-1",
  title: "Test Goal",
  description: "Goal description",
  status: "active",
  level: "goal",
  ownerAgentId: "agent-1",
  reviewPolicy: "owner",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("goalRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations that can be overridden per test
    mockGoalService.getById.mockResolvedValue(mockGoal);
    mockGoalService.create.mockResolvedValue(mockGoal);
    mockGoalService.update.mockResolvedValue({ ...mockGoal, status: "active" });
    mockGoalService.remove.mockResolvedValue(mockGoal);
    mockGoalService.getAncestors.mockResolvedValue([]);
    mockGoalService.getChildren.mockResolvedValue([]);
    mockGoalService.getLinkedProjects.mockResolvedValue([]);
    mockGoalService.getIssuesForGoal.mockResolvedValue([]);
    mockActivityService.list.mockResolvedValue([]);
    mockResolveCeoAgentId.mockResolvedValue("ceo-agent-1");
    mockHeartbeatService.wakeup.mockResolvedValue({ runId: "run-123" });
  });

  describe("GET /goals/:id", () => {
    it("should return a goal by ID", async () => {
      const response = await request(app).get("/goals/goal-1");
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGoal);
      expect(mockGoalService.getById).toHaveBeenCalledWith("goal-1");
    });

    it("should return 404 if goal not found", async () => {
      mockGoalService.getById.mockResolvedValue(null);
      const response = await request(app).get("/goals/non-existent-goal");
      expect(response.status).toBe(404);
      expect(mockGoalService.getById).toHaveBeenCalledWith("non-existent-goal");
    });
  });

  describe("GET /goals/:id/heartbeat-context", () => {
    it("should return goal heartbeat context", async () => {
      const mockAncestors = [{ id: "goal-2", title: "Parent Goal" }];
      const mockIssues = [{ id: "issue-1", title: "Issue 1" }];
      mockGoalService.getAncestors.mockResolvedValue(mockAncestors);
      mockGoalService.getIssuesForGoal.mockResolvedValue(mockIssues);

      const response = await request(app).get("/goals/goal-1/heartbeat-context");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        goal: expect.any(Object),
        ancestors: mockAncestors,
        children: [],
        linkedProjects: [],
        issues: mockIssues,
        recentActivity: [],
      });
      expect(mockGoalService.getById).toHaveBeenCalledWith("goal-1");
      expect(mockGoalService.getAncestors).toHaveBeenCalledWith("goal-1");
      expect(mockGoalService.getIssuesForGoal).toHaveBeenCalledWith("goal-1");
    });
  });

  describe("POST /companies/:companyId/goals", () => {
    it("should create a new goal", async () => {
      const newGoalData = {
        title: "New Goal",
        description: "New Goal Description",
        level: "goal",
        ownerAgentId: "agent-2",
      };
      mockGoalService.create.mockResolvedValue({ ...mockGoal, ...newGoalData });

      const response = await request(app).post("/companies/company-1/goals").send(newGoalData);
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ ...mockGoal, ...newGoalData });
      expect(mockGoalService.create).toHaveBeenCalledWith("company-1", newGoalData);
      expect(mockLogActivity).toHaveBeenCalledWith(expect.anything(), {
        companyId: "company-1",
        actorType: "user",
        actorId: "user-1",
        agentId: "agent-id-from-context",
        action: "goal.created",
        entityType: "goal",
        entityId: expect.any(String),
        details: { title: "New Goal" },
      });
    });
  });

  describe("PATCH /goals/:id", () => {
    it("should update an existing goal", async () => {
      const updateData = { status: "completed", description: "Updated description" };
      const updatedGoal = { ...mockGoal, ...updateData };
      mockGoalService.update.mockResolvedValue(updatedGoal);

      const response = await request(app).patch("/goals/goal-1").send(updateData);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedGoal);
      expect(mockGoalService.update).toHaveBeenCalledWith("goal-1", updateData);
      expect(mockLogActivity).toHaveBeenCalledWith(expect.anything(), {
        companyId: "company-1",
        actorType: "user",
        actorId: "user-1",
        agentId: "agent-id-from-context",
        action: "goal.updated",
        entityType: "goal",
        entityId: "goal-1",
        details: updateData,
      });
    });

    it("should trigger goal_activated wakeup when status changes to active", async () => {
      const updatedGoal = { ...mockGoal, status: "active" };
      mockGoalService.update.mockResolvedValue(updatedGoal);
      mockGoalService.getById.mockResolvedValueOnce(mockGoal); // Existing goal
      mockGoalService.getById.mockResolvedValue(updatedGoal); // Updated goal

      const response = await request(app).patch("/goals/goal-1").send({ status: "active" });
      expect(response.status).toBe(200);
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

    it("should trigger goal_work_complete wakeup when subgoal achieves and parent has no open subgoals", async () => {
      const updatedGoal = { ...mockGoal, status: "achieved", parentId: "goal-parent-1" };
      mockGoalService.update.mockResolvedValue(updatedGoal);
      mockGoalService.getById.mockResolvedValueOnce(mockGoal); // Existing goal
      mockGoalService.getById.mockResolvedValue(updatedGoal); // Updated goal
      mockGoalService.countOpenSubgoals.mockResolvedValue(0);
      mockGoalService.getById.mockResolvedValueOnce({ id: "goal-parent-1", companyId: "company-1", ownerAgentId: "agent-parent-1" }); // Parent goal data

      const response = await request(app).patch("/goals/goal-1").send({ status: "achieved" });
      expect(response.status).toBe(200);
      expect(mockGoalService.countOpenSubgoals).toHaveBeenCalledWith("goal-parent-1");
      expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith("agent-parent-1", {
        source: "automation",
        triggerDetail: "system",
        reason: "goal_work_complete",
        payload: { goalId: "goal-parent-1" },
        contextSnapshot: {
          goalId: "goal-parent-1",
          wakeReason: "goal_work_complete",
          source: "goal.subgoal_completed",
        },
      });
    });

    it("should not trigger wakeup if parent has open subgoals", async () => {
      const updatedGoal = { ...mockGoal, status: "achieved", parentId: "goal-parent-1" };
      mockGoalService.update.mockResolvedValue(updatedGoal);
      mockGoalService.getById.mockResolvedValueOnce(mockGoal);
      mockGoalService.getById.mockResolvedValue(updatedGoal);
      mockGoalService.countOpenSubgoals.mockResolvedValue(1); // Simulate open subgoals

      const response = await request(app).patch("/goals/goal-1").send({ status: "achieved" });
      expect(response.status).toBe(200);
      expect(mockHeartbeatService.wakeup).not.toHaveBeenCalled();
    });

    it("should use CEO agent if parent goal has no ownerAgentId", async () => {
      const updatedGoal = { ...mockGoal, status: "achieved", parentId: "goal-parent-1" };
      mockGoalService.update.mockResolvedValue(updatedGoal);
      mockGoalService.getById.mockResolvedValueOnce(mockGoal);
      mockGoalService.getById.mockResolvedValue(updatedGoal);
      mockGoalService.countOpenSubgoals.mockResolvedValue(0);
      mockGoalService.getById.mockResolvedValueOnce({ id: "goal-parent-1", companyId: "company-1", ownerAgentId: null }); // Parent goal has no owner
      mockResolveCeoAgentId.mockResolvedValue("ceo-agent-1"); // Mock CEO resolution

      const response = await request(app).patch("/goals/goal-1").send({ status: "achieved" });
      expect(response.status).toBe(200);
      expect(mockResolveCeoAgentId).toHaveBeenCalledWith("company-1");
      expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith("ceo-agent-1", expect.any(Object));
    });
  });

  describe("POST /goals/:id/pursue", () => {
    it("should pursue an active goal and assign CEO if owner is null", async () => {
      const goalToPursue = { ...mockGoal, ownerAgentId: null };
      mockGoalService.getById.mockResolvedValue(goalToPursue);
      mockResolveCeoAgentId.mockResolvedValue("ceo-agent-1");
      mockGoalService.update.mockResolvedValue({ ...goalToPursue, ownerAgentId: "ceo-agent-1" });

      const response = await request(app).post("/goals/goal-1/pursue");
      expect(response.status).toBe(200);
      expect(response.body.ownerAgentId).toBe("ceo-agent-1");
      expect(mockResolveCeoAgentId).toHaveBeenCalledWith("company-1");
      expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith("ceo-agent-1", {
        source: "automation",
        triggerDetail: "system",
        reason: "goal_activated",
        payload: { goalId: "goal-1", mutation: "pursue" },
        contextSnapshot: {
          goalId: "goal-1",
          wakeReason: "goal_activated",
          source: "goal.pursued",
        },
      });
    });

    it("should pursue a goal with an existing owner and trigger wakeup", async () => {
      mockGoalService.getById.mockResolvedValue(mockGoal);

      const response = await request(app).post("/goals/goal-1/pursue");
      expect(response.status).toBe(200);
      expect(mockResolveCeoAgentId).not.toHaveBeenCalled();
      expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith("agent-1", {
        source: "automation",
        triggerDetail: "system",
        reason: "goal_activated",
        payload: { goalId: "goal-1", mutation: "pursue" },
        contextSnapshot: {
          goalId: "goal-1",
          wakeReason: "goal_activated",
          source: "goal.pursued",
        },
      });
    });

    it("should return 409 for pursuing an achieved goal", async () => {
      mockGoalService.getById.mockResolvedValue({ ...mockGoal, status: "achieved" });
      const response = await request(app).post("/goals/goal-1/pursue");
      expect(response.status).toBe(409);
    });

    it("should return 409 for pursuing a cancelled goal", async () => {
      mockGoalService.getById.mockResolvedValue({ ...mockGoal, status: "cancelled" });
      const response = await request(app).post("/goals/goal-1/pursue");
      expect(response.status).toBe(409);
    });

    it("should return 422 if no CEO agent is found for an unowned goal", async () => {
      mockGoalService.getById.mockResolvedValue({ ...mockGoal, ownerAgentId: null });
      mockResolveCeoAgentId.mockResolvedValue(null);
      const response = await request(app).post("/goals/goal-1/pursue");
      expect(response.status).toBe(422);
    });
  });

  describe("DELETE /goals/:id", () => {
    it("should delete a goal", async () => {
      const response = await request(app).delete("/goals/goal-1");
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGoal);
      expect(mockGoalService.remove).toHaveBeenCalledWith("goal-1");
      expect(mockLogActivity).toHaveBeenCalledWith(expect.anything(), {
        companyId: "company-1",
        actorType: "user",
        actorId: "user-1",
        agentId: "agent-id-from-context",
        action: "goal.deleted",
        entityType: "goal",
        entityId: "goal-1",
      });
    });
  });
});
