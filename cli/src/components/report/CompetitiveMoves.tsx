'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';

// Mock data type for competitive moves, adjust as needed
interface CompetitiveMove {
  date: string;
  summary: string;
}

// Mock data for competitive moves - will be replaced by API data
const mockCompetitiveMoves: CompetitiveMove[] = [
  { date: "2026-03-10", summary: "Competitor X launched a new product in the same segment, potentially impacting market share." },
  { date: "2026-03-12", summary: "Competitor Y announced a strategic partnership with a key distributor, strengthening their supply chain." },
  { date: "2026-03-13", summary: "Competitor Z increased their marketing spend by 20% focusing on digital channels." },
];

const CompetitiveMoves: React.FC<{ moves: CompetitiveMove[] }> = ({ moves }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleToggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-semibold mb-4">Competitive Moves</h3>
      <Card className="bg-white/5 border border-white/10">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Key competitive developments and their impact.</CardDescription>
        </CardHeader>
        <CardContent>
          {moves.map((move, index) => (
            <div key={index} className="border-b border-white/10 last:border-b-0 py-4">
              <button
                onClick={() => handleToggleExpand(index)}
                className="flex items-center justify-between w-full cursor-pointer hover:bg-white/5 transition-colors rounded-md p-2"
              >
                <div className="flex items-center space-x-2 text-left flex-1">
                  <span className="text-sm text-slate-400 flex-shrink-0 min-w-[80px]">{move.date}</span>
                  <p className="text-white/90 truncate max-w-lg flex-grow text-sm">
                    {move.summary.substring(0, 80)}{move.summary.length > 80 ? '...' : ''}
                  </p>
                </div>
                <ChevronDown
                  className={`text-slate-400 transition-transform ${expandedIndex === index ? 'rotate-180' : ''}`}
                  size={20}
                />
              </button>
              <AnimatePresence initial={false}>
                {expandedIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 pt-0 pl-12 space-y-2">
                      <p className="text-white/80 text-sm font-light">
                        {move.summary}
                      </p>
                      {/* Placeholder for source info if applicable */}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompetitiveMoves;
