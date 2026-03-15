import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SparklesIcon } from "lucide-react";

interface GenerateModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (company: string, topic: string) => Promise<void>;
  isLoading: boolean;
  initialCompany?: string;
  initialTopic?: string;
}

const GenerateModal: React.FC<GenerateModalProps> = ({
  isOpen,
  onOpenChange,
  onGenerate,
  isLoading,
  initialCompany = '',
  initialTopic = '',
}) => {
  const [company, setCompany] = useState(initialCompany);
  const [topic, setTopic] = useState(initialTopic);

  const handleGenerateClick = () => {
    if (company && topic) {
      onGenerate(company, topic);
    }
  };

  // Reset form when modal is closed and reopened
  React.useEffect(() => {
    if (!isOpen) {
      setCompany(initialCompany);
      setTopic(initialTopic);
    }
  }, [isOpen, initialCompany, initialTopic]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {/* This trigger is a fallback, ideally the page level button will control the modal */}
        <Button variant="default" className="bg-cyan text-navy font-bold hover:bg-cyan-dark">
          <SparklesIcon className="mr-2 h-4 w-4" />
          Generate New Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
        <DialogHeader>
          <DialogTitle>Generate New Report</DialogTitle>
          <DialogDescription>
            Enter details for the report you want to generate.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="company" className="text-right text-slate-300">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Example Company"
              className="col-span-3 bg-white/10 border-white/20 text-white placeholder-slate-500"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="topic" className="text-right text-slate-300">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Market Trends"
              className="col-span-3 bg-white/10 border-white/20 text-white placeholder-slate-500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleGenerateClick}
            disabled={isLoading || !company || !topic}
            className="bg-cyan text-navy font-bold hover:bg-cyan-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating...' : 'Generate Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateModal;
