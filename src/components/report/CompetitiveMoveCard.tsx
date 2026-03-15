
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface CompetitiveMoveCardProps {
  index: number; // Index for potential styling or ordering
  date: string;
  summary: string;
  link: string;
}

export const CompetitiveMoveCard: React.FC<CompetitiveMoveCardProps> = ({
  index,
  date,
  summary,
  link,
}) => {
  return (
    <Card className="glassmorphism p-4 border border-border">
      <CardHeader className="p-0 mb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-mono">{date}</span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" /> Source
          </a>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {summary}
        </p>
      </CardContent>
    </Card>
  );
};

// Example Usage (as seen in src/app/app/reports/[id]/page.tsx):
// import { CompetitiveMoveCard } from '@/components/report/CompetitiveMoveCard';
// ... inside the map loop for reportData.competitiveMoves ...
// <CompetitiveMoveCard
//   key={move.id}
//   index={index}
//   date={move.date}
//   summary={move.summary}
//   link={move.link}
// />
