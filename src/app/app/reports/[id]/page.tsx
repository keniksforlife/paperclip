
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { SparklesIcon, BarChartIcon, ArrowRightIcon, DownloadIcon, Share2Icon, CopyIcon, ChevronDownIcon, Search } from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Chip } from "@/components/ui/chip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Custom components (newly created)
import { MetricsBar } from "@/components/report/MetricsBar";
import { CollapsibleCompetitiveMoves } from "@/components/report/CollapsibleCompetitiveMoves";
import { SwotView } from "@/components/report/SwotView";
import { FloatingActionBar } from "@/components/report/FloatingActionBar";
import { AiChatSidebar } from "@/components/report/AiChatSidebar";

// Helper function for class merging (assuming it's defined in @/lib/utils)
function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
}

// Placeholder types (refined to match component props)
interface Metric {
  Icon: LucideIcon;
  value: number;
  label: string;
  iconColor: string;
}

interface SwotItem {
  id: string;
  text: string;
  evidence: string;
  sourceUrl?: string; // Added for FaviconFetcher
}

interface CompetitiveMove {
  id: string;
  date: string;
  description: string;
  sourceUrl: string;
}

interface Alert {
  id: string;
  company: string;
  summary: string;
  link: string;
}

interface ReportData {
  id: string;
  metrics: Metric[];
  competitiveMoves: CompetitiveMove[];
  swot: {
    strengths: SwotItem[];
    weaknesses: SwotItem[];
    opportunities: SwotItem[];
    threats: SwotItem[];
  };
  alerts: Alert[];
}

// Placeholder API call for fetching report data
const getReportData = async (reportId: string): Promise<ReportData> => {
  console.log(`Fetching report data for ID: ${reportId}`);
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock data simulating a report, now structured to match the new components
  return {
    id: reportId,
    metrics: [
      { Icon: ArrowRightIcon, value: 15, label: 'Competitive Moves', iconColor: 'text-cyan-400' },
      { Icon: SparklesIcon, value: 7, label: 'Strengths', iconColor: 'text-emerald-400' },
      { Icon: Globe, value: 12, label: 'Sources', iconColor: 'text-amber-400' },
      { Icon: AlertTriangle, value: 3, label: 'Risk Signals', iconColor: 'text-red-400' },
    ],
    competitiveMoves: [
      {
        id: 'move-1',
        date: '2026-03-15',
        description: 'Competitor X launched a new pricing strategy, undercutting our main offering by 15%. This was reported by TechCrunch.',
        sourceUrl: 'https://www.techcrunch.com/competitor-x-pricing',
      },
      {
        id: 'move-2',
        date: '2026-03-14',
        description: 'Analyst firm Gartner published a new report highlighting our market position. Key finding: Our AI features are leading the pack.',
        sourceUrl: 'https://www.gartner.com/report-on-market-position',
      },
      {
        id: 'move-3',
        date: '2026-03-13',
        description: 'Competitor Z updated their pricing strategy.',
        sourceUrl: 'https://www.z-competitor.com/strategy-update',
      },
    ],
    swot: {
      strengths: [
        { id: 's1', text: 'Strong brand recognition and market presence.', evidence: 'Market surveys show high brand recall and positive sentiment across multiple channels.', sourceUrl: 'https://example.com/source1' },
        { id: 's2', text: 'Innovative product development pipeline.', evidence: 'Recent patent filings and R&D reports indicate a strong pipeline of innovative products expected in the next 18 months.', sourceUrl: 'https://example.com/source2' },
      ],
      weaknesses: [
        { id: 'w1', text: 'Limited distribution channels in emerging markets.', evidence: 'Q4 2025 results and market analysis report show lower than expected growth and limited reach in key APAC regions.', sourceUrl: 'https://example.com/source3' },
      ],
      opportunities: [
        { id: 'o1', text: 'Expansion into the APAC region through strategic partnerships.', evidence: 'Partnership talks mentioned in internal memos indicate potential entry into the APAC market within the next fiscal year.', sourceUrl: 'https://example.com/source4' },
        { id: 'o2', text: 'Growing demand for AI solutions', evidence: 'Industry reports project a 25% CAGR for AI solutions over the next five years, presenting a significant market opportunity.', sourceUrl: 'https://example.com/source7' },
      ],
      threats: [
        { id: 't1', text: 'Increased competition from new agile startups.', evidence: 'Competitor analysis reveals an increasing number of agile startups entering the market with disruptive technologies.', sourceUrl: 'https://example.com/source5' },
        { id: 't2', text: 'Potential regulatory changes impacting the industry.', evidence: 'Industry news and expert analyses indicate potential for new regulatory changes impacting data privacy and AI deployment.', sourceUrl: 'https://example.com/source6' },
      ],
    },
    alerts: [
      { id: 'alert-1', company: 'Example Corp', summary: 'New funding round announced.', link: 'https://example.com' },
      { id: 'alert-2', company: 'Tech Innovators', summary: 'Product launch successful.', link: 'https://techinnovators.com' },
      { id: 'alert-3', company: 'Alpha Dynamics', summary: 'Key executive departure noted.', link: 'https://alphadynamics.com' },
    ],
  };
};

export default function ReportViewPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for AiChatSidebar scroll

  // Mock AI response function
  const handleSendMessageToAI = async (message: string): Promise<string> => {
    console.log("AI Chat: Message received -", message);
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate AI thinking
    return `AI Response to: "${message}". This is a placeholder response.`;
  };

  // Handlers for FloatingActionBar buttons
  const handleExportPDF = () => console.log('Export PDF clicked');
  const handleShare = () => console.log('Share clicked');
  const handleRefineWithAI = () => setIsAiChatOpen(true);
  const handleCopyCitation = () => console.log('Copy Citation clicked');

  useEffect(() => {
    // Assuming we get reportId from URL params, but using a mock ID for now
    const reportId = "mock-report-id"; 
    const loadReport = async () => {
      setIsLoading(true);
      try {
        const data = await getReportData(reportId);
        setReportData(data);
      } catch (error) {
        console.error("Failed to load report data:", error);
        // Handle error state, e.g., show an error message
      } finally {
        setIsLoading(false);
      }
    };
    loadReport();
  }, []);

  // Render loading or error states
  if (isLoading) {
    // Using a PageSkeleton from DesignGuide for better visual feedback
    return (
      <div className="p-6">
        <PageSkeleton variant="detail" /> 
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-lg text-red-500">Could not load report.</p>
      </div>
    );
  }

  return (
    // Added a container for the entire page content to manage scroll and AI sidebar positioning
    <div className="relative min-h-screen bg-background text-foreground p-6">
      {/* Header Section with Report Title */}
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold font-geist text-foreground">Report: {reportData.id}</h1>
          {/* Potentially add report topic or other metadata here */}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col lg:flex-row gap-8 pb-24"> {/* Increased pb for floating action bar clearance */}
        {/* Left Panel: Metrics, Competitive Moves, SWOT Tabs */}
        <div className="flex-1 space-y-8">
          {/* Metrics Bar */}
          <MetricsBar
            data={{ // Correctly pass data structure to MetricsBar
              competitiveMoves: reportData.metrics[0].value,
              strengths: reportData.metrics[1].value,
              sources: reportData.metrics[2].value,
              riskSignals: reportData.metrics[3].value,
            }}
          />

          {/* Collapsible Competitive Moves */}
          <CollapsibleCompetitiveMoves
            moves={reportData.competitiveMoves.map(move => ({
              id: move.id,
              date: move.date,
              description: move.summary, // Use summary as description for the card
              sourceUrl: move.link,
            }))}
          />

          {/* SWOT Tabs */}
          <SwotView
            strengths={reportData.swot.strengths}
            weaknesses={reportData.swot.weaknesses}
            opportunities={reportData.swot.opportunities}
            threats={reportData.swot.threats}
          />
        </div>

        {/* Right Panel: Insights Rail */}
        <aside className="lg:w-1/3">
          {/* Assuming InsightsRail component exists and accepts alerts prop */}
          {/* If not, this will need to be created or this section removed/modified */}
          <div className="border border-border rounded-md p-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Today's Insights
            </h3>
            <Separator />
            {reportData.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No new intelligence today.</p>
            ) : (
              <ul className="space-y-3">
                {reportData.alerts.map((alert) => (
                  <li key={alert.id} className="flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4 text-cyan-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.company}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {alert.summary}
                      </p>
                      <Button variant="link" size="sm" className="p-0" onClick={() => window.open(alert.link, '_blank')}>View Report</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>

      {/* Floating Action Bar - positioned absolutely relative to the page container */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none">
        <div className="w-full max-w-screen-lg mx-auto px-6">
          <FloatingActionBar 
            onExportPDF={handleExportPDF}
            onShare={handleShare}
            onRefineWithAI={handleRefineWithAI}
            onCopyCitation={handleCopyCitation}
            scrollThreshold={100} // Example threshold
          />
        </div>
      </div>

      {/* AI Chat Sidebar - managed by state */} 
      <AiChatSidebar
        initialMessages={[{ id: 'welcome', text: 'Hello! How can I help you refine this report?', sender: 'ai' }]} // Pass initial messages
        placeholder='Ask AI to refine report...' // Custom placeholder
        onSendMessage={handleSendMessageToAI}
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
      />
    </div>
  );
}

// Placeholder for PageSkeleton, assuming it exists and takes a variant prop
const PageSkeleton = ({ variant }: { variant: 'list' | 'detail' }) => (
  <div className="border border-border rounded-md p-4 space-y-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-8 w-48 bg-muted rounded"></div>
      <div className="h-6 w-16 bg-muted rounded"></div>
    </div>
    <Separator />
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 bg-muted rounded-full"></div>
        <div className="h-4 w-32 bg-muted rounded"></div>
      </div>
      <div className="h-4 w-full bg-muted rounded"></div>
      <div className="flex gap-2">
        <div className="h-8 w-24 bg-muted rounded"></div>
        <div className="h-8 w-24 bg-muted rounded"></div>
      </div>
    </div>
    <Separator />
    {variant === 'detail' && (
      <>
        <div className="h-5 w-32 bg-muted rounded"></div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-1/2 bg-muted rounded"></div>
        </div>
      </>
    )}
  </div>
);
