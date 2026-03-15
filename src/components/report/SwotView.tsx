
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LucideIcon, ExternalLink, Search } from 'lucide-react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// --- Interfaces ---

interface SwotItem {
  id: string;
  text: string;
  evidence: string;
}

interface SwotCategoryProps {
  title: string;
  items: SwotItem[];
  tabColorClass: string;
}

// --- Components ---

// Component to display a single SWOT item with a Dialog for evidence
const SwotItemDisplay: React.FC<SwotItem & { tabColorClass: string }> = ({
  id,
  text,
  evidence,
  tabColorClass,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <div
        className="flex items-center justify-between p-3 border border-border rounded-md mb-2 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={handleOpenDialog}
      >
        <p className="text-sm text-muted-foreground flex-grow mr-4">
          {text.length > 80 ? text.substring(0, 77) + '...' : text}
        </p>
        <Button variant="ghost" size="sm" className="p-1 min-w-[60px]">
          <motion.span
            animate={{ scale: dialogOpen ? 1.2 : 1 }}
            transition={{ duration: 0.2 }}
            className="inline-block"
          >
            <Search className={`h-4 w-4 ${tabColorClass.replace('text-', 'text-')}`} /> {/* Use appropriate color */}
          </Motion.span>
          <span className="ml-1 text-xs">Evidence</span>
        </Button>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className={`${tabColorClass} mb-1`}>Evidence for: {text.length > 50 ? text.substring(0, 47) + '...' : text}</DialogTitle>
            <DialogDescription>Details regarding the selected point.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm font-medium">Source Snippet:</p>
            <div className="rounded-md border border-border p-3 bg-accent/30">
              <p className="text-xs text-muted-foreground break-words">{evidence}</p>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <Button variant="link" size="sm" className="p-0" onClick={() => console.log('Open source URL action') /* TODO: Add actual source URL */}>
                View Source
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Component for a single SWOT category (e.g., Strengths, Weaknesses)
const SwotCategory: React.FC<SwotCategoryProps> = ({
  title,
  items,
  tabColorClass,
}) => {
  return (
    <div className="space-y-3 mt-4">
      <h4 className="text-sm font-medium">{title}</h4>
      {items.map((item) => (
        <SwotItemDisplay
          key={item.id}
          {...item}
          tabColorClass={tabColorClass}
        />
      ))}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No items found for this category.</p>
      )}
    </div>
  );
};

interface SwotViewProps {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
}

export const SwotView: React.FC<SwotViewProps> = ({
  strengths,
  weaknesses,
  opportunities,
  threats,
}) => {
  // Define tab colors based on the requirements
  const tabColors = {
    strengths: 'text-cyan-400',
    weaknesses: 'text-rose-400',
    opportunities: 'text-emerald-400',
    threats: 'text-amber-400',
  };

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        SWOT Analysis
      </h3>
      <Separator />
      <Tabs defaultValue="strengths" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="strengths" className={tabColors.strengths}>
            Strengths
          </TabsTrigger>
          <TabsTrigger value="weaknesses" className={tabColors.weaknesses}>
            Weaknesses
          </TabsTrigger>
          <TabsTrigger value="opportunities" className={tabColors.opportunities}>
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="threats" className={tabColors.threats}>
            Threats
          </TabsTrigger>
        </TabsList>
        <TabsContent value="strengths">
          <SwotCategory title="Strengths" items={strengths} tabColorClass={tabColors.strengths} />
        </TabsContent>
        <TabsContent value="weaknesses">
          <SwotCategory title="Weaknesses" items={weaknesses} tabColorClass={tabColors.weaknesses} />
        </TabsContent>
        <TabsContent value="opportunities">
          <SwotCategory title="Opportunities" items={opportunities} tabColorClass={tabColors.opportunities} />
        </TabsContent>
        <TabsContent value="threats">
          <SwotCategory title="Threats" items={threats} tabColorClass={tabColors.threats} />
        </TabsContent>
      </Tabs>
    </section>
  );
};

// Example Usage (This data would typically come from an API or parent component)
// const sampleSwotData = {
//   strengths: [
//     { id: 's1', text: 'Strong brand recognition and market presence.', evidence: 'Report mentions high brand recall...', sourceUrl: 'https://example.com/source1' },
//     { id: 's2', text: 'Innovative product development pipeline.', evidence: 'Recent patent filings indicate...', sourceUrl: 'https://example.com/source2' },
//   ],
//   weaknesses: [
//     { id: 'w1', text: 'Limited distribution channels in emerging markets.', evidence: 'Market analysis report shows...', sourceUrl: 'https://example.com/source3' },
//   ],
//   opportunities: [
//     { id: 'o1', text: 'Expansion into the APAC region through strategic partnerships.', evidence: 'Partnership talks mentioned in...', sourceUrl: 'https://example.com/source4' },
//   ],
//   threats: [
//     { id: 't1', text: 'Increased competition from new agile startups.', evidence: 'Competitor analysis reveals...', sourceUrl: 'https://example.com/source5' },
//     { id: 't2', text: 'Potential regulatory changes impacting the industry.', evidence: 'Industry news indicates...', sourceUrl: 'https://example.com/source6' },
//   ],
// };

// <SwotView {...sampleSwotData} />
