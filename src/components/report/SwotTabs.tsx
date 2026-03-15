import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SwotItem {
  id: string;
  text: string;
  evidence?: string;
}

interface SwotTabsProps {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
}

const SwotTabs: React.FC<SwotTabsProps> = ({
  strengths,
  weaknesses,
  opportunities,
  threats,
}) => {
  const [isEvidenceDialogOpen, setIsEvidenceDialogOpen] = useState(false);
  const [evidenceText, setEvidenceText] = useState('');

  const handleEvidenceClick = (evidence?: string) => {
    setEvidenceText(evidence || 'No evidence provided.');
    setIsEvidenceDialogOpen(true);
  };

  const renderSwotList = (items: SwotItem[]) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center text-slate-500 py-4">No items in this category.</div>
      ) : (
        items.map((item) => (
          <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
            <div className="flex-1 mr-3 overflow-hidden">
              <p className="text-sm text-slate-300 truncate">{item.text}</p>
            </div>
            {item.evidence && (
              <Dialog open={isEvidenceDialogOpen && evidenceText === (item.evidence || '')} onOpenChange={setIsEvidenceDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={() => handleEvidenceClick(item.evidence)}
                    className="border-cyan/40 text-cyan hover:bg-cyan/10"
                  > 
                    Evidence
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Evidence</DialogTitle>
                    <DialogDescription>Details related to the SWOT item.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-slate-300 text-sm leading-relaxed">{evidenceText}</p>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setIsEvidenceDialogOpen(false)} variant="ghost" className="text-slate-400">Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <section className="mb-8">
      <Tabs defaultValue="strengths" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="strengths" className="text-cyan data-[state=active]:bg-cyan data-[state=active]:text-navy data-[state=active]:shadow-inner
            focus:outline-none focus:ring-2 focus:ring-cyan/50
          ">
            Strengths
          </TabsTrigger>
          <TabsTrigger value="weaknesses" className="text-rose data-[state=active]:bg-rose data-[state=active]:text-navy data-[state=active]:shadow-inner
            focus:outline-none focus:ring-2 focus:ring-rose/50
          ">
            Weaknesses
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="text-emerald data-[state=active]:bg-emerald data-[state=active]:text-navy data-[state=active]:shadow-inner
            focus:outline-none focus:ring-2 focus:ring-emerald/50
          ">
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="threats" className="text-amber data-[state=active]:bg-amber data-[state=active]:text-navy data-[state=active]:shadow-inner
            focus:outline-none focus:ring-2 focus:ring-amber/50
          ">
            Threats
          </TabsTrigger>
        </TabsList>
        <TabsContent value="strengths">{renderSwotList(strengths)}</TabsContent>
        <TabsContent value="weaknesses">{renderSwotList(weaknesses)}</TabsContent>
        <TabsContent value="opportunities">{renderSwotList(opportunities)}</TabsContent>
        <TabsContent value="threats">{renderSwotList(threats)}</TabsContent>
      </Tabs>
    </section>
  );
};

export default SwotTabs;
