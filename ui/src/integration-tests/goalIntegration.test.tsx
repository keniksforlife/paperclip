// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../context/ThemeContext";
import { GoalPlanPayload, GoalCompletionPayload, ApprovalPayloadRenderer } from "../components/ApprovalPayload"; // Assuming these are exported from ApprovalPayload
import { type ApprovalRecord } from "../services/approvals"; // Assuming this type is available

// Mock data for goals and approvals
const mockGoal = {
  id: "goal-1",
  companyId: "company-1",
  title: "Test Goal",
  status: "active",
  ownerAgentId: "agent-1",
  reviewPolicy: "owner",
};

const mockApprovalPlan: ApprovalRecord & { payload: any } = {
  id: "approval-plan-1",
  companyId: "company-1",
  type: "goal_plan",
  status: "pending",
  payload: {
    goalId: "goal-1",
    goalTitle: "Test Goal Plan",
    plan: "Detailed plan for the goal.",
    subgoals: [{}],
    projects: [{}],
    issues: [{}, {}],
    agentAssignments: { agent1: "developer", agent2: "reviewer" },
    budgetEstimate: "$500",
  },
  requestedByAgentId: "requester-agent-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockApprovalCompletion: ApprovalRecord & { payload: any } = {
  id: "approval-completion-1",
  companyId: "company-1",
  type: "goal_completion",
  status: "pending",
  payload: {
    goalId: "goal-1",
    goalTitle: "Test Goal Completion",
    outcome: "Achieved",
    report: "All tasks completed.",
    issuesDone: 10,
    issuesTotal: 10,
  },
  requestedByAgentId: "requester-agent-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock a component that might display a goal and its approval
const MockGoalApprovalDisplay = ({ approval }: { approval: ApprovalRecord & { payload: any } }) => (
  <div>
    <h2>Goal: {approval.payload.goalTitle || "Unknown Goal"}</h2>
    <h3>Approval Type: {approval.type}</h3>
    <ApprovalPayloadRenderer type={approval.type} payload={approval.payload} />
  </div>
);

describe("Goal Integration Tests - UI Interactions", () => {
  it("should render GoalPlanPayload correctly within a display component", () => {
    render(
      <ThemeProvider>
        <MockGoalApprovalDisplay approval={mockApprovalPlan} />
      </ThemeProvider>,
    );

    expect(screen.getByText("Test Goal Plan")).toBeInTheDocument();
    expect(screen.getByText("Detailed plan for the goal.")).toBeInTheDocument();
    expect(screen.getByText("1 proposed")).toBeInTheDocument();
    expect(screen.getByText("1 proposed")).toBeInTheDocument(); // Projects
    expect(screen.getByText("2 estimated")).toBeInTheDocument();
    expect(screen.getByText("agent1")).toBeInTheDocument(); // Agent assignments part
    expect(screen.getByText("$500")).toBeInTheDocument();
  });

  it("should render GoalCompletionPayload correctly within a display component", () => {
    render(
      <ThemeProvider>
        <MockGoalApprovalDisplay approval={mockApprovalCompletion} />
      </ThemeProvider>,
    );

    expect(screen.getByText("Test Goal Completion")).toBeInTheDocument();
    expect(screen.getByText("Achieved")).toBeInTheDocument();
    expect(screen.getByText("All tasks completed.")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument(); // Issues Done
    expect(screen.getByText("10")).toBeInTheDocument(); // Issues Total
  });

  // Add more tests here for other goal-related UI interactions if needed
});
