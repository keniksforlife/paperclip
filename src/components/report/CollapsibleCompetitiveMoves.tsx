
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image'; // Assuming Next.js Image component for favicons

interface CompetitiveMove {
  id: string;
  date: string;
  description: string;
  sourceUrl: string;
  sourceFavicon?: string; // URL for the favicon
}

interface CompetitiveMovesListProps {
  moves: CompetitiveMove[];
}

const FaviconFetcher: React.FC<{ url: string; alt: string }> = ({
  url,
  alt,
}) => {
  // Basic favicon URL generation. More robust solution might be needed.
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;

  // Fallback if favicon can't be fetched or displayed
  const onError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Optionally set a default favicon or hide the image
    (e.target as HTMLImageElement).style.display = 'none';
  };

  return (
    <Image
      src={faviconUrl}
      alt={`${alt} favicon`}
      width={16}
      height={16}
      className="rounded-full"
      onError={onError}
      unoptimized // Mark as unoptimized since it's an external URL for favicons
    />
  );
};

export const CollapsibleCompetitiveMoves: React.FC<CompetitiveMovesListProps> = ({
  moves,
}) => {
  const [openMoveId, setOpenMoveId] = useState<string | null>(null);

  const toggleMove = (id: string) => {
    setOpenMoveId(openMoveId === id ? null : id);
  };

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Competitive Moves
      </h3>
      <Separator />
      <div className="space-y-3">
        {moves.map((move) => (
          <Collapsible
            key={move.id}
            open={openMoveId === move.id}
            onOpenChange={(isOpen) => {
              if (isOpen) {
                setOpenMoveId(move.id);
              } else {
                setOpenMoveId(null);
              }
            }}
            className="w-full border border-border rounded-md p-3"
          >
            <div className="flex items-center justify-between space-x-4 mb-2">
              <div className="flex items-center gap-2">
                <FaviconFetcher url={move.sourceUrl} alt={move.sourceUrl} />
                <span className="text-xs text-muted-foreground">{move.date}</span>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1 min-w-[60px]">
                  <motion.span
                    animate={{ rotate: openMoveId === move.id ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="inline-block"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.span>
                  <span className="ml-1 text-xs">
                    {openMoveId === move.id ? 'Hide' : 'Show'}
                  </span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>{move.description}</p>
                <Button variant="link" size="sm" className="p-0" onClick={() => window.open(move.sourceUrl, '_blank')}>Source: {new URL(move.sourceUrl).hostname}</Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
};

// Example Usage (for demonstration purposes, this would be passed data from the parent component)
// const sampleMoves = [
//   {
//     id: 'move-1',
//     date: '2024-01-15',
//     description: 'Competitor X launched a new pricing strategy, undercutting our main offering by 15%. This was reported by TechCrunch.',
//     sourceUrl: 'https://www.techcrunch.com/competitor-x-pricing'
//   },
//   {
//     id: 'move-2',
//     date: '2024-01-14',
//     description: 'Analyst firm Gartner published a new report highlighting our market position. Key finding: Our AI features are leading the pack.',
//     sourceUrl: 'https://www.gartner.com/report-on-market-position'
//   }
// ];

// <CompetitiveMovesList moves={sampleMoves} />
