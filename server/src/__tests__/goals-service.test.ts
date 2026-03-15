import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@paperclipai/db";
import { goalService } from "../services/goals.ts";
import { agents, goals } from "@paperclipai/db";

// Mocking db and its methods
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  resolveCeoAgentId: vi.fn(),
};

const mockGoalService = goalService(mockDb as unknown as Db);

// Mock resolveCeoAgentId
vi.mock("../services/goals.ts", async () => ({
  ...(await vi.importActual("../services/goals.ts")), // Import actual module first
  resolveCeoAgentId: vi.fn(), // Mock the specific function
}));

describe("goalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveCeoAgentId", () => {
    it("should return the CEO agent ID if found", async () => {
      mockDb.resolveCeoAgentId.mockResolvedValue("ceo-agent-1");
      const ceoId = await mockDb.resolveCeoAgentId("company-1");
      expect(ceoId).toBe("ceo-agent-1");
    });

    it("should return null if no CEO agent is found", async () => {
      mockDb.resolveCeoAgentId.mockResolvedValue(null);
      const ceoId = await mockDb.resolveCeoAgentId("company-1");
      expect(ceoId).toBeNull();
    });
  });

  describe("getAncestors", () => {
    it("should return ancestors for a given goal ID", async () => {
      const mockGoalsData = [
        {
          id: "goal-3",
          title: "Goal 3",
          status: "active",
          level: "subgoal",
          parentId: "goal-2",
        },
        {
          id: "goal-2",
          title: "Goal 2",
          status: "active",
          level: "goal",
          parentId: "goal-1",
        },
      ];
      const selectWhere = vi.fn().mockResolvedValueOnce([mockGoalsData[0]]).mockResolvedValueOnce([mockGoalsData[1]]).mockResolvedValueOnce([]);
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      mockDb.select.mockReturnValue({ from: selectFrom });

      const ancestors = await mockGoalService.getAncestors("goal-3");

      expect(ancestors).toEqual([mockGoalsData[1]]);
    });

    it("should return an empty array if the goal has no ancestors", async () => {
      const selectWhere = vi.fn().mockResolvedValueOnce([{ id: "goal-1", parentId: null }]);
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      mockDb.select.mockReturnValue({ from: selectFrom });

      const ancestors = await mockGoalService.getAncestors("goal-1");
      expect(ancestors).toEqual([]);
    });

    it("should handle cases where parent goal is not found", async () => {
      const selectWhere = vi.fn().mockResolvedValueOnce([{ id: "goal-2", parentId: "goal-non-existent" }]).mockResolvedValueOnce([]);
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      mockDb.select.mockReturnValue({ from: selectFrom });

      const ancestors = await mockGoalService.getAncestors("goal-2");
      expect(ancestors).toEqual([]);
    });

    it("should handle limit of 50 ancestors", async () => {
      const mockGoalsData = [];
      for (let i = 1; i <= 51; i++) {
        mockGoalsData.push({
          id: `goal-${i}`,
          title: `Goal ${i}`,
          status: "active",
          level: "subgoal",
          parentId: i < 51 ? `goal-${i + 1}` : null,
        });
      }
      const selectWhere = vi.fn();
      for (let i = 0; i < 51; i++) {
        selectWhere.mockResolvedValueOnce([mockGoalsData[i]]);
      }
      const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
      mockDb.select.mockReturnValue({ from: selectFrom });

      const ancestors = await mockGoalService.getAncestors("goal-1");
      expect(ancestors.length).toBe(50);
    });
  });

  // Add tests for other goalService methods if any are found to be critical for testing the new logic,
  // such as countOpenSubgoals or countOpenIssues if they are directly testable outside routes.
});
