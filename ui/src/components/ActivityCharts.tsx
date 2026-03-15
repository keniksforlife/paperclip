import type { HeartbeatRun } from "@paperclipai/shared";
import { ResponsiveBar } from '@nivo/bar'; // Import Nivo bar chart
import { BarDatum, Datum } from "@nivo/core"; // Import Nivo types for better type safety

/* ---- Utilities ---- */

export function getLast14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ---- Sub-components ---- */

// This component is no longer directly used as Nivo's axisBottom handles labels, but kept for reference if needed.
// function DateLabels({ days }: { days: string[] }) {
//   return (
//     <div className="flex gap-[3px] mt-1.5">
//       {days.map((day, i) => (
//         <div key={day} className="flex-1 text-center">
//           {(i === 0 || i === 6 || i === 13) ? (
//             <span className="text-[9px] text-muted-foreground tabular-nums">{formatDayLabel(day)}</span>
//           ) : null}
//         </div>
//       ))}
//     </div>
//   );
// }

interface ChartLegendItem {
  color: string;
  label: string;
}

function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-2">
      {items.map(item => (
        <span key={item.label} className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {subtitle && <span className="text-[10px] text-muted-foreground/60">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

/* ---- Chart Components ---- */

export function RunActivityChart({ runs }: { runs: HeartbeatRun[] }) {
  const days = getLast14Days();

  const grouped = new Map<string, { succeeded: number; failed: number; other: number }>();
  for (const day of days) grouped.set(day, { succeeded: 0, failed: 0, other: 0 });
  for (const run of runs) {
    const day = new Date(run.createdAt).toISOString().slice(0, 10);
    const entry = grouped.get(day);
    if (!entry) continue;
    if (run.status === "succeeded") entry.succeeded++;
    else if (run.status === "failed" || run.status === "timed_out") entry.failed++;
    else entry.other++;
  }

  // Transform data for Nivo
  const transformedData = days.map(day => ({
    day: day,
    succeeded: grouped.get(day)?.succeeded ?? 0,
    failed: grouped.get(day)?.failed ?? 0,
    other: grouped.get(day)?.other ?? 0,
  }));

  const hasData = transformedData.some(d => d.succeeded + d.failed + d.other > 0);

  if (!hasData) return <p className="text-xs text-muted-foreground">No runs yet</p>;

  // Nivo chart configuration
  const nivoChartProps = {
    data: transformedData as BarDatum[], // Explicitly cast to BarDatum
    keys: ['succeeded', 'failed', 'other'] as const, 
    indexBy: 'day' as keyof BarDatum,
    margin: { top: 10, right: 0, bottom: 50, left: 40 }, // Increased bottom margin for axis labels and legend
    padding: 0.3,
    colors: ({ id }) => {
      if (id === 'succeeded') return '#22c55e'; // emerald-500
      if (id === 'failed') return '#ef4444'; // red-500
      if (id === 'other') return '#6b7280'; // neutral-500
      return '#ccc'; // fallback
    },
    colorBy: 'id' as keyof BarDatum,
    borderColor: { from: 'color', modifiers: [['darker', 0.1]] },
    axisTop: null,
    axisRight: null,
    axisLeft: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      tickValues: 5, // Limit to 5 ticks for better readability
      format: (v: number) => Math.round(v), // Ensure integer display
    },
    enableGridY: false, // Disable Y-axis grid lines
    animate: true,
    motionConfig: { damping: 9, stiffness: 90 },
    legends: [
      {
        dataFrom: 'keys',
        anchor: 'bottom',
        direction: 'row',
        justify: false,
        translateX: 0,
        translateY: 40, // Position below the chart
        itemsSpacing: 10,
        itemWidth: 70,
        itemHeight: 20,
        itemDirection: 'left-to-right',
        itemOpacity: 0.85,
        symbolSize: 12,
        symbolShape: 'circle',
        effects: [
          {
            on: 'hover',
            style: {
              itemOpacity: 1,
            },
          },
        ],
      },
    ],
    // Customizing x-axis labels to show only specific days
    axisBottom: {
      orient: 'bottom',
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      // Specify which ticks to display based on their index in the 'days' array
      tickValues: [0, 6, 13], // Indices for the days array (0, 7th, 14th day)
      // Format the tick value (which is the day string in this case)
      format: (value) => formatDayLabel(value),
    },
  };

  return (
    <div className="h-40"> {/* Container for responsiveness */}
      <ResponsiveBar {...nivoChartProps} />
    </div>
  );
}

const priorityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#6b7280",
};

const priorityOrder = ["critical", "high", "medium", "low"] as const;

// Define the type for the data expected by PriorityChart
interface PriorityIssue {
  priority: string;
  createdAt: Date;
}

export function PriorityChart({ issues }: { issues: PriorityIssue[] }) {
  const days = getLast14Days();
  // Initialize map with all days and priorities, setting counts to 0
  const grouped = new Map<string, Record<string, number>>();
  for (const day of days) {
    grouped.set(day, { critical: 0, high: 0, medium: 0, low: 0 });
  }

  // Populate the map with issue counts
  for (const issue of issues) {
    const day = new Date(issue.createdAt).toISOString().slice(0, 10);
    const entry = grouped.get(day);
    if (!entry) continue; // Should not happen with pre-initialization, but good practice
    // Ensure the priority is one of the expected ones before incrementing
    if (issue.priority in entry) {
      entry[issue.priority]++;
    }
  }

  // Transform data for Nivo ResponsiveBar
  const transformedData = days.map(day => {
    const entry = grouped.get(day)!;
    return {
      day: day,
      critical: entry.critical,
      high: entry.high,
      medium: entry.medium,
      low: entry.low,
    };
  });

  const totalIssuesPerDay = Array.from(grouped.values()).map(v => Object.values(v).reduce((a, b) => a + b, 0));
  const maxValue = Math.max(...totalIssuesPerDay, 1);
  const hasData = totalIssuesPerDay.some(count => count > 0);

  if (!hasData) return <p className="text-xs text-muted-foreground">No issues</p>;

  // Nivo chart configuration for PriorityChart
  const nivoChartProps = {
    data: transformedData as BarDatum[],
    keys: priorityOrder as readonly (keyof BarDatum)[],
    indexBy: 'day' as keyof BarDatum,
    margin: { top: 10, right: 0, bottom: 50, left: 40 },
    padding: 0.3,
    colors: ({ id }) => {
      // Map keys to their respective colors
      return priorityColors[id as keyof typeof priorityColors] || '#ccc'; // Fallback color
    },
    colorBy: 'id' as keyof BarDatum,
    borderColor: { from: 'color', modifiers: [['darker', 0.1]] },
    axisTop: null,
    axisRight: null,
    axisLeft: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      tickValues: 5, // Limit ticks for readability
      format: (v: number) => Math.round(v),
    },
    enableGridY: false, // Disable Y-axis grid lines
    animate: true,
    motionConfig: { damping: 9, stiffness: 90 },
    legends: [
      {
        dataFrom: 'keys' as 'id' | 'data'
        anchor: 'bottom',
        direction: 'row',
        justify: false,
        translateX: 0,
        translateY: 40,
        itemsSpacing: 10,
        itemWidth: 70,
        itemHeight: 20,
        itemDirection: 'left-to-right',
        itemOpacity: 0.85,
        symbolSize: 12,
        symbolShape: 'circle',
        effects: [
          {
            on: 'hover',
            style: {
              itemOpacity: 1,
            },
          },
        ],
      },
    ],
    axisBottom: {
      orient: 'bottom',
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      tickValues: [0, 6, 13], // Indices for the days array
      format: (value) => formatDayLabel(value),
    },
  };

  return (
    <div className="h-40"> {/* Container for responsiveness */}
      <ResponsiveBar {...nivoChartProps} />
      {/* The original DateLabels call is replaced by Nivo's axisBottom configuration. */}
    </div>
  );
}

const statusColors: Record<string, string> = {
  todo: "#3b82f6",
  in_progress: "#8b5cf6",
  in_review: "#a855f7",
  done: "#10b981",
  blocked: "#ef4444",
  cancelled: "#6b7280",
  backlog: "#64748b",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  blocked: "Blocked",
  cancelled: "Cancelled",
  backlog: "Backlog",
};

// Define the type for the data expected by IssueStatusChart
interface StatusIssue {
  status: string;
  createdAt: Date;
}

export function IssueStatusChart({ issues }: { issues: StatusIssue[] }) {
  const days = getLast14Days();
  const allStatuses = new Set<string>();
  const grouped = new Map<string, Record<string, number>>();
  
  // Initialize map with all days and an empty object for each day
  for (const day of days) {
    grouped.set(day, {});
  }

  // Populate the map with issue counts per status and collect all unique statuses
  for (const issue of issues) {
    const day = new Date(issue.createdAt).toISOString().slice(0, 10);
    const entry = grouped.get(day);
    if (!entry) continue; // Should not happen with pre-initialization

    entry[issue.status] = (entry[issue.status] ?? 0) + 1;
    allStatuses.add(issue.status);
  }

  // Determine the order of statuses for the legend, filtering out statuses not present
  const statusOrder = ["todo", "in_progress", "in_review", "done", "blocked", "cancelled", "backlog"].filter(s => allStatuses.has(s));
  
  // Transform data for Nivo ResponsiveBar
  const transformedData = days.map(day => {
    const entry = grouped.get(day)!;
    const nivoEntry: Record<string, number | string> = { day }; // Start with day
    statusOrder.forEach(status => {
      nivoEntry[status] = entry[status] ?? 0; // Add each status count, default to 0 if not present
    });
    return nivoEntry;
  });

  // Calculate maxValue for y-axis scaling
  const maxValue = Math.max(...Array.from(grouped.values()).map(v => Object.values(v).reduce((a, b) => a + b, 0)), 1);
  const hasData = allStatuses.size > 0 && transformedData.some(d => Object.values(d).some(val => typeof val === 'number' && val > 0));

  if (!hasData) return <p className="text-xs text-muted-foreground">No issues</p>;

  // Nivo chart configuration for IssueStatusChart
  const nivoChartProps = {
    data: transformedData as BarDatum[],
    // Dynamically create keys based on statusOrder to ensure all present statuses are included
    keys: statusOrder as readonly (keyof BarDatum)[],
    indexBy: 'day' as keyof BarDatum,
    margin: { top: 10, right: 0, bottom: 50, left: 40 },
    padding: 0.3,
    colors: ({ id }) => {
      // Map status keys to their respective colors
      return statusColors[id as keyof typeof statusColors] || '#ccc'; // Fallback color
    },
    colorBy: 'id' as keyof BarDatum,
    borderColor: { from: 'color', modifiers: [['darker', 0.1]] },
    axisTop: null,
    axisRight: null,
    axisLeft: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      tickValues: 5, // Limit ticks for readability
      format: (v: number) => Math.round(v),
    },
    enableGridY: false, // Disable Y-axis grid lines
    animate: true,
    motionConfig: { damping: 9, stiffness: 90 },
    legends: [
      {
        dataFrom: 'keys' as 'id' | 'data'
        anchor: 'bottom',
        direction: 'row',
        justify: false,
        translateX: 0,
        translateY: 40,
        itemsSpacing: 10,
        itemWidth: 70,
        itemHeight: 20,
        itemDirection: 'left-to-right',
        itemOpacity: 0.85,
        symbolSize: 12,
        symbolShape: 'circle',
        effects: [
          {
            on: 'hover',
            style: {
              itemOpacity: 1,
            },
          },
        ],
      },
    ],
    axisBottom: {
      orient: 'bottom',
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      tickValues: [0, 6, 13], // Indices for the days array
      format: (value) => formatDayLabel(value),
    },
  };

  return (
    <div className="h-40"> {/* Container for responsiveness */}
      <ResponsiveBar {...nivoChartProps} />
      {/* Original DateLabels replaced by Nivo's axisBottom configuration. */}
    </div>
  );
}

export function SuccessRateChart({ runs }: { runs: HeartbeatRun[] }) {
  const days = getLast14Days();
  const grouped = new Map<string, { succeeded: number; total: number }>();
  for (const day of days) grouped.set(day, { succeeded: 0, total: 0 });
  for (const run of runs) {
    const day = new Date(run.createdAt).toISOString().slice(0, 10);
    const entry = grouped.get(day);
    if (!entry) continue;
    entry.total++;
    if (run.status === "succeeded") entry.succeeded++;
  }

  const hasData = Array.from(grouped.values()).some(v => v.total > 0);
  if (!hasData) return <p className="text-xs text-muted-foreground">No runs yet</p>;

  return (
    <div>
      <div className="flex items-end gap-[3px] h-20">
        {days.map(day => {
          const entry = grouped.get(day)!;
          const rate = entry.total > 0 ? entry.succeeded / entry.total : 0;
          const color = entry.total === 0 ? undefined : rate >= 0.8 ? "#10b981" : rate >= 0.5 ? "#eab308" : "#ef4444";
          return (
            <div key={day} className="flex-1 h-full flex flex-col justify-end" title={`${day}: ${entry.total > 0 ? Math.round(rate * 100) : 0}% (${entry.succeeded}/${entry.total})`}>
              {entry.total > 0 ? (
                <div style={{ height: `${rate * 100}%`, minHeight: 2, backgroundColor: color }} />
              ) : (
                <div className="bg-muted/30 rounded-sm" style={{ height: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <DateLabels days={days} />
    </div>
  );
}
