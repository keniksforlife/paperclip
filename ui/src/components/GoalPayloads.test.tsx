// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../context/ThemeContext"; // Adjust path as necessary
import { GoalPlanPayload, GoalCompletionPayload } from "./ApprovalPayload"; // Assuming these are exported from ApprovalPayload

describe("GoalPlanPayload", () => {
  it("renders correctly with minimal payload", () => {
    const payload = { goalTitle: "Test Goal", plan: "This is a plan" };
    render(
      <ThemeProvider>
        <GoalPlanPayload payload={payload} />
      </ThemeProvider>,
    );
    expect(screen.getByText("Test Goal")).toBeInTheDocument();
    expect(screen.getByText("This is a plan")).toBeInTheDocument();
  });

  it("renders subgoal, project, and issue counts", () => {
    const payload = {
      goalTitle: "Test Goal",
      plan: "This is a plan",
      subgoals: [{}],
      projects: [{}],
      issues: [{}, {}],
    };
    render(
      <ThemeProvider>
        <GoalPlanPayload payload={payload} />
      </ThemeProvider>,
    );
    expect(screen.getByText("1 proposed")).toBeInTheDocument();
    expect(screen.getByText("2 proposed")).toBeInTheDocument();
    expect(screen.getByText("2 estimated")).toBeInTheDocument();
  });

  it("renders agent assignments correctly", () => {
    const payload = {
      goalTitle: "Test Goal",
      agentAssignments: { agent1: "role1", agent2: "role2" },
    };
    render(
      <ThemeProvider>
        <GoalPlanPayload payload={payload} />
      </ThemeProvider>,
    );
    expect(screen.getByText("agent1")).toBeInTheDocument();
    expect(screen.getByText("role1")).toBeInTheDocument();
    expect(screen.getByText("agent2")).toBeInTheDocument();
    expect(screen.getByText("role2")).toBeInTheDocument();
  });

  it("renders budget estimate correctly", () => {
    const payload = { goalTitle: "Test Goal", budgetEstimate: "$100" };
    render(
      <ThemeProvider>
        <GoalPlanPayload payload={payload} />
      </ThemeProvider>,
    );
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("renders raw payload when no specific fields are present", () => {
    const payload = { rawData: "some raw data" };
    render(
      <ThemeProvider>
        <GoalPlanPayload payload={payload} />
      </ThemeProvider>,
    );
    // Expecting the JSON string representation of the payload to be visible
    expect(screen.getByText(JSON.stringify(payload, null, 2))).toBeInTheDocument();
  });
});

describe("GoalCompletionPayload", () => {
  it("renders correctly with minimal payload", () => {
    const payload = { goalTitle: "Test Goal", outcome: "Achieved" };
    render(
      <ThemeProvider>
        <GoalCompletionPayload payload={payload} />
      </ThemeProvider>,
    );
    expect(screen.getByText("Test Goal")).toBeInTheDocument();
    expect(screen.getByText("Achieved")).toBeInTheDocument();
  });

  it("renders issue counts correctly", () => {
    const payload = { goalTitle: "Test Goal", outcome: "Complete", issuesDone: 3, issuesTotal: 5 };
    render(
      <ThemeProvider>
        <GoalCompletionPayload payload={payload} />
      </ThemeProvider>,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders report correctly", () => {
    const payload = { goalTitle: "Test Goal", report: "All tasks completed successfully." };
    render(
      <ThemeProvider>
        <GoalCompletionPayload payload={payload} />
      </ThemeProvider>,
    );
    expect(screen.getByText("All tasks completed successfully.")).toBeInTheDocument();
  });

  it("renders raw payload when no specific fields are present", () => {
    const payload = { rawCompletionData: "completion data" };
    render(
      <ThemeProvider>
        <GoalCompletionPayload payload={payload} />
      </ThemeProvider>,
    );
    // Expecting the JSON string representation of the payload to be visible
    expect(screen.getByText(JSON.stringify(payload, null, 2))).toBeInTheDocument();
  });
});
