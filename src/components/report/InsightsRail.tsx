
import React from 'react';
import { SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Define the Alert interface based on usage in page.tsx
interface Alert {
  id: string;
  company: string;
  summary: string;
  link: string;
}

interface InsightsRailProps {
  alerts: Alert[];
}

export const InsightsRail: React.FC<InsightsRailProps> = ({ alerts }) => {
  return (
    <Card className="p-4 border border-border space-y-3">
      <CardHeader className="p-0 flex flex-col space-y-1.5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Today's Insights
        </h3>
        <Separator />
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No new intelligence today.</p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                <div className="flex-1 min-w-0"> {/* flex-1 and min-w-0 for better text wrapping */} 
                  <p className="text-sm font-medium truncate">{alert.company}</p> {/* Use truncate for company name */} 
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {alert.summary}
                  </p>
                  <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => window.open(alert.link, '_blank')}> 
                    View Report
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
