'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Copy, Download, Share2 } from 'lucide-react';

// Mock data type for report data, adjust as needed
interface ReportData {
  company: string;
  topic: string;
  generatedDate: string;
  // ... other properties
}

interface FloatingActionBarProps {
  reportData: ReportData;
  openAiSidebar: () => void;
}

const FloatingActionBar: React.FC<FloatingActionBarProps> = ({ reportData, openAiSidebar }) => {
  const actionBarRef = useRef<HTMLDivElement>(null);
  // Using a placeholder element to track scroll, as the action bar is fixed
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef, // Track scroll relative to the main content area
    offset: ["start end", "end end"], // start of the element to the end of the viewport, end of the element to the end of the viewport
  });

  const y = useTransform(scrollYProgress, [0, 0.5, 1], [0, -50, 0]); // Animate in/out based on scroll
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]); // Fade out as user scrolls down

  const handleCopyCitation = () => {
    const citation = `CompeteIQ Report: ${reportData.company} - ${reportData.topic}. Generated ${reportData.generatedDate}.`;
    navigator.clipboard.writeText(citation).then(() => {
      console.log('Citation copied!');
      // TODO: Implement UI feedback for copied citation
    }).catch(err => {
      console.error('Failed to copy citation: ', err);
    });
  };

  return (
    <>
      {/* Invisible element to track scroll position for the floating bar */}
      <div ref={targetRef} className="absolute top-0 left-0 right-0 h-[1px]"></div>

      <motion.div
        ref={actionBarRef}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 backdrop-blur-md bg-navy/90 border-t border-white/10"
        style={{
          left: '256px', // Corresponds to sidebar width
          right: '0px',
          '@media (max-width: 768px)': { left: '0px' }, // Mobile layout
          y,
          opacity: opacity, // Use opacity transform
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
    </>
  );
};

export default FloatingActionBar;
