'use client';

import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

// Mock data types for SWOT analysis, adjust as needed
interface SwotItem {
  item: string;
  evidence: string;
}

interface SwotData {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
}

// Mock data for SWOT analysis - will be replaced by API data
const mockSwotData: SwotData = {
  strengths: [
    { item: "Strong brand recognition", evidence: "Customer surveys consistently show high brand recall and positive sentiment across all demographics." },
    { item: "Proprietary technology", evidence: "Patented algorithms provide a significant competitive advantage in data processing efficiency." },
  ],
  weaknesses: [
    { item: "Limited international presence", evidence: "Operations are currently concentrated in North America, missing out on key global growth markets." },
    { item: "Reliance on a single supplier", evidence: "A major component is sourced from a single vendor, posing a supply chain risk." },
  ],
  opportunities: [
    { item: "Emerging markets growth", evidence: "Reports from market analysts indicate rapid expansion potential in Southeast Asia and Latin America." },
    { item: "Strategic partnerships", evidence: "Potential for collaborations with complementary technology providers to expand service offerings." },
  ],
  threats: [
    { item: "New regulatory changes", evidence: "Upcoming data privacy regulations in Europe could impact data collection practices." },
    { item: "Intensifying competition", evidence: "Several new entrants are leveraging aggressive pricing strategies." },
  ],
};

const SwotAnalysis: React.FC<{ swot: SwotData }> = ({ swot }) => {
  const tabColors: Record<string, string> = {
    strengths: 'cyan',
    weaknesses: 'rose',
    opportunities: 'emerald',
    threats: 'amber',
  };

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-semibold mb-4">SWOT Analysis</h3>
      <Card className="bg-white/5 border border-white/10 p-6">
        <Tabs defaultValue="strengths" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="strengths" className="capitalize">Strengths</TabsTrigger>
            <TabsTrigger value="weaknesses" className="capitalize">Weaknesses</TabsTrigger>
            <TabsTrigger value="opportunities" className="capitalize">Opportunities</TabsTrigger>
            <TabsTrigger value="threats" className="capitalize">Threats</TabsTrigger>
          </TabsList>
          {Object.entries(swot).map(([key, items]) => (
            <TabsContent key={key} value={key} className="space-y-4">
              {(items as SwotItem[]).map((item, index) => (
                <Card key={index} className={`bg-white/5 border ${
                  key === 'strengths' ? 'border-cyan-500' :
                  key === 'weaknesses' ? 'border-rose-500' :
                  key === 'opportunities' ? 'border-emerald-500' :
                  'border-amber-500'
                }`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-lg font-medium">
                      {item.item}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white p-1 h-auto w-auto">
                            <ExternalLink size={16} />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[700px] bg-navy border-white/10">
                          <DialogHeader>
                            <DialogTitle>Evidence for: {item.item}</DialogTitle>
                            <DialogDescription>Detailed evidence supporting the SWOT item.</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <p className="text-white/80">{item.evidence}</p>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardTitle>
                    <CardDescription className={`text-${tabColors[key]}-400 capitalize`}>{key}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">{item.evidence}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
};

export default SwotAnalysis;
