
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ChevronDown, Sparkles, Copy, Download, Share2, TrendingUp, Shield, Globe, AlertTriangle, GripVertical, BarChart3 } from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';

// Assuming shadcn/ui components are available in @/components/ui
// Assuming Lucide icons are available in lucide-react

// Mock data - replace with actual API calls later
interface ReportData {
  company: string;
  topic: string;
  generatedDate: string;
  sources: { url: string; snippet: string; title: string }[];
  metrics: { competitiveMoves: number; strengths: number; sources: number; riskSignals: number };
  competitiveMoves: { date: string; summary: string }[];
  swot: { strengths: { item: string; evidence: string }[]; weaknesses: { item: string; evidence: string }[]; opportunities: { item: string; evidence: string }[]; threats: { item: string; evidence: string }[] };
  alerts: { company: string; topic: string; changeSummary: string; has_new_changes: boolean }[];
}

const mockReportData: ReportData = {
  company: "Example Corp",
  topic: "Market Analysis Q1 2026",
  generatedDate: "2026-03-14",
  sources: [
    { url: "https://example.com/news1", snippet: "First news snippet...", title: "First News Article" },
    { url: "https://example.com/reportA", snippet: "First report snippet...", title: "Analyst Report A" },
  ],
  metrics: { competitiveMoves: 15, strengths: 10, sources: 100, riskSignals: 5 },
  competitiveMoves: [
    { date: "2026-03-10", summary: "Competitor X launched a new product in the same segment." },
    { date: "2026-03-12", summary: "Competitor Y announced a strategic partnership." },
  ],
  swot: {
    strengths: [{ item: "Strong brand recognition", evidence: "Customer surveys show high brand recall." }],
    weaknesses: [{ item: "Limited international presence", evidence: "Operations mainly domestic." }],
    opportunities: [{ item: "Emerging markets growth", evidence: "Reports indicate rapid expansion potential." }],
    threats: [{ item: "New regulatory changes", evidence: "Potential impact on supply chain." }],
  },
  alerts: [
    { company: "Example Corp", topic: "Market Analysis Q1 2026", changeSummary: "New competitor activity detected.", has_new_changes: true },
    { company: "Competitor X", topic: "Product Launch", changeSummary: "New product announced.", has_new_changes: true },
  ],
};

// --- Component Implementations ---

// Metrics Bar Component
const MetricsBar: React.FC<{ metrics: ReportData['metrics'] }> = ({ metrics }) => {
  const numberAnimation = (number: number) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [springProps, api] = useSpring(() => ({
      from: { value: 0 },
      to: { value: number },
      config: { duration: 1500, easing: (t: number) => t < 0.5 ? 2*t*t : 1 - 2*(1-t)*(1-t) } // Custom ease for smoother animation
    }));

    useEffect(() => {
      api.start();
    }, [number, api]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <animated.span>{springProps.value.to((val: number) => Math.floor(val))}</animated.span>;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 glassmorphism p-4 border border-white/10 rounded-xl mb-8">
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold text-cyan-300">{numberAnimation(metrics.competitiveMoves)}</div>
        <div className="text-slate-400 uppercase text-sm">Competitive Moves</div>
        <TrendingUp className="mt-2 text-slate-500" size={20} />
      </div>
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold text-cyan-300">{numberAnimation(metrics.strengths)}</div>
        <div className="text-slate-400 uppercase text-sm">Strengths</div>
        <Shield className="mt-2 text-slate-500" size={20} />
      </div>
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold text-cyan-300">{numberAnimation(metrics.sources)}</div>
        <div className="text-slate-400 uppercase text-sm">Sources</div>
        <Globe className="mt-2 text-slate-500" size={20} />
      </div>
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold text-amber-400">{numberAnimation(metrics.riskSignals)}</div>
        <div className="text-slate-400 uppercase text-sm">Risk Signals</div>
        <AlertTriangle className="mt-2 text-amber-500" size={20} />
      </div>
    </div>
  );
};

// Competitive Moves Component
const CompetitiveMoves: React.FC<{ moves: ReportData['competitiveMoves'] }> = ({ moves }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleToggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-semibold mb-4">Competitive Moves</h3>
      {moves.map((move, index) => (
        <div key={index} className="border-b border-white/10 last:border-b-0">
          <button
            onClick={() => handleToggleExpand(index)}
            className="flex items-center justify-between w-full p-4 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-2 text-left">
              <span className="text-sm text-slate-400 flex-shrink-0">{move.date}</span>
              <p className="text-white/90 truncate max-w-xl flex-grow">{move.summary}</p>
            </div>
            <ChevronDown
              className={`text-slate-400 transition-transform \${expandedIndex === index ? 'rotate-180' : ''}`}
              size={20}
            />
          </button>
          <AnimatePresence initial={false}>
            {expandedIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0">
                  <p className="text-white/80 text-sm">{move.summary}</p>
                  {/* Placeholder for source info if applicable */}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

// SWOT Tabs Component
const SwotAnalysis: React.FC<{ swot: ReportData['swot'] }> = ({ swot }) => {
  const tabColors: Record<string, string> = {
    strengths: 'cyan',
    weaknesses: 'rose',
    opportunities: 'emerald',
    threats: 'amber',
  };

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-semibold mb-4">SWOT Analysis</h3>
      <Tabs defaultValue="strengths" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="strengths" className="capitalize">Strengths</TabsTrigger>
          <TabsTrigger value="weaknesses" className="capitalize">Weaknesses</TabsTrigger>
          <TabsTrigger value="opportunities" className="capitalize">Opportunities</TabsTrigger>
          <TabsTrigger value="threats" className="capitalize">Threats</TabsTrigger>
        </TabsList>
        {Object.entries(swot).map(([key, items]) => (
          <TabsContent key={key} value={key} className="mt-6 space-y-4">
            {(items as any[]).map((item: any, index: number) => (
              <Card key={index} className={`bg-white/5 border ${
                key === 'strengths' ? 'border-cyan-500' :
                key === 'weaknesses' ? 'border-rose-500' :
                key === 'opportunities' ? 'border-emerald-500' :
                'border-amber-500'
              }`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {item.item}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                          <ExternalLink size={18} />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[700px] bg-navy border-white/10">
                        <DialogHeader>
                          <DialogTitle>Evidence for: {item.item}</DialogTitle>
                          <DialogDescription>Detailed evidence supporting the SWOT item.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <p>{item.evidence}</p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                  <CardDescription className={`text-${tabColors[key]}-400`}>Evidence</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{item.evidence}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

// Floating Action Bar Component
const FloatingActionBar: React.FC<{ reportData: ReportData; openAiSidebar: () => void }> = ({ reportData, openAiSidebar }) => {
  const actionBarRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: actionBarRef,
    offset: ["start end", "end end"] // start of the element to the end of the viewport, end of the element to the end of the viewport
  });

  const y = useTransform(scrollYProgress, [0, 0.5, 1], [0, -50, 0]); // Animate in/out based on scroll

  const handleCopyCitation = () => {
    const citation = `CompeteIQ Report: \${reportData.company} - \${reportData.topic}. Generated \${reportData.generatedDate}.`;
    navigator.clipboard.writeText(citation).then(() => {
      console.log('Citation copied!');
      // TODO: Implement UI feedback for copied citation
    }).catch(err => {
      console.error('Failed to copy citation: ', err);
    });
  };

  return (
    <motion.div
      ref={actionBarRef}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 backdrop-blur-md bg-navy/90 border-t border-white/10"
      style={{
        left: '256px', // Corresponds to sidebar width
        right: '0px',
        '@media (max-width: 768px)': { left: '0px' }, // Mobile layout
        y, // Use framer-motion's y transform for animation
        opacity: scrollYProgress // Fade in/out based on scroll
      }}
    >
      <div className="flex justify-between items-center max-w-screen-lg mx-auto">
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={handleCopyCitation} title="Copy Citation">
            <Copy className="h-5 w-5 text-slate-400 hover:text-white" />
          </Button>
          <Button variant="ghost" size="icon" title="Export PDF">
            <Download className="h-5 w-5 text-slate-400 hover:text-white" />
          </Button>
          <Button variant="ghost" size="icon" title="Share">
            <Share2 className="h-5 w-5 text-slate-400 hover:text-white" />
          </Button>
          <Button variant="ghost" size="icon" onClick={openAiSidebar} title="Refine with AI">
            <Sparkles className="h-5 w-5 text-slate-400 hover:text-white" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// AI Chat Sidebar Component
const AiChatSidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { role: 'user', content: input }]);
      setInput('');
      // Placeholder for AI response
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'ai', content: 'AI refinement coming soon...' }]);
      }, 1000);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <motion.div
      className="fixed top-0 right-0 h-full bg-navy/95 border-l border-white/10 p-4 shadow-lg z-40"
      style={{ width: '360px', x: isOpen ? 0 : '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      initial={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold flex items-center">
          <Sparkles className="mr-2 text-cyan-400" size={24} /> AI Refinement
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronDown className="h-6 w-6 text-slate-400 hover:text-white rotate-90" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100%-100px)] mb-4" ref={scrollAreaRef}>
        <div className="space-y-4 pr-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs p-3 rounded-lg \${msg.role === 'user' ? 'bg-cyan-500 text-navy' : 'bg-white/5 text-white/90'}`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex absolute bottom-4 right-4 w-[calc(100%-32px)]">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for refinement..."
          className="flex-1 mr-2 bg-white/10 border-white/20 text-white"
          onKeyPress={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <Button onClick={handleSend} className="bg-cyan-500 text-navy hover:bg-cyan-600">Send</Button>
      </div>
    </motion.div>
  );
};

// Placeholder for Dashboard components if needed elsewhere
const InsightsRail: React.FC<{ alerts: ReportData['alerts'] }> = ({ alerts }) => {
  return (
    <div className="mt-16 p-6 bg-white/5 border border-white/10 rounded-lg">
      <h3 className="text-2xl font-semibold mb-4 flex items-center">
        <BarChart3 className="mr-2 h-6 w-6 text-cyan-400" /> Today's Insights
      </h3>
      {alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert, index) => (
            <div key={index} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white/90">{alert.company} - {alert.topic}</p>
                <p className="text-xs text-slate-400">{alert.changeSummary}</p>
              </div>
              {alert.has_new_changes && <Badge variant="outline" className="border-cyan-500 text-cyan-400">New</Badge>}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-500 py-8">
          <Sparkles className="h-12 w-12 mb-4" />
          <p>No new intelligence today</p>
        </div>
      )}
    </div>
  );
};


const ReportPage: React.FC<{ params: { id: string } }> = ({ params }) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Fetch report data
  useEffect(() => {
    // In a real app, fetch from API: `/api/reports/${params.id}`
    // For now, use mock data
    setReportData(mockReportData);
    setLoading(false);
    setError(null); // Clear any previous errors
  }, [params.id]);

  const handleCopyCitation = () => {
    if (!reportData) return;
    const citation = `CompeteIQ Report: \${reportData.company} - \${reportData.topic}. Generated \${reportData.generatedDate}.`;
    navigator.clipboard.writeText(citation).then(() => {
      console.log('Citation copied!');
      // TODO: Implement UI feedback for copied citation
    }).catch(err => {
      console.error('Failed to copy citation: ', err);
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 pt-16 animate-pulse">
        <div className="h-10 bg-slate-700 rounded-lg w-1/4 mb-6"></div>
        <div className="h-4 bg-slate-700 rounded w-1/3 mb-8"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-slate-700 rounded-xl mb-8 h-32"></div>
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="border border-slate-700 rounded p-6 mb-8 h-48"></div>
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 h-64">
          <div className="rounded-xl border border-slate-700 h-full"></div>
          <div className="rounded-xl border border-slate-700 h-full"></div>
          <div className="rounded-xl border border-slate-700 h-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto p-8 pt-16 text-red-500">Error loading report: {error}</div>;
  }

  if (!reportData) {
    return <div className="container mx-auto p-8 pt-16">No report data available.</div>;
  }

  return (
    <div ref={mainContentRef} className="container mx-auto p-8 pt-16">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-cyan-300">{reportData.company}</h1>
          <p className="text-xl text-slate-400">{reportData.topic}</p>
        </div>
        <div className="flex space-x-4">
          <Button onClick={() => setAiSidebarOpen(true)} className="bg-cyan-500 text-navy hover:bg-cyan-600">
            <Sparkles className="mr-2 h-5 w-5" /> Refine with AI
          </Button>
          <Button variant="outline" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10">
            <ExternalLink className="mr-2 h-5 w-5" /> View Sources
          </Button>
        </div>
      </div>

      <MetricsBar metrics={reportData.metrics} />
      <CompetitiveMoves moves={reportData.competitiveMoves} />
      <SwotAnalysis swot={reportData.swot} />
      
      <div className="mt-16">
        <h3 className="text-2xl font-semibold mb-4">Related Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportData.sources.map((source, index) => (
            <Card key={index} className="bg-white/5 border border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline">
                    <ExternalLink className="mr-2 h-4 w-4 text-cyan-400" />
                    <span className="text-white/90">{source.title}</span>
                  </a>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={handleCopyCitation}>
                    <Copy size={16} />
                  </Button>
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">{new URL(source.url).hostname}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">{source.snippet}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Render AI Chat Sidebar */}
      <AiChatSidebar isOpen={aiSidebarOpen} onClose={() => setAiSidebarOpen(false)} />

      {/* Floating Action Bar - needs careful positioning and scroll handling */}
      <FloatingActionBar reportData={reportData} openAiSidebar={() => setAiSidebarOpen(true)} />
    </div>
  );
};

export default ReportPage;
