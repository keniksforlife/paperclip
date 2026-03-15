
import React, { useState, useEffect } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LucideIcon } from 'lucide-react';

// Placeholder for icons - actual icons will be imported based on requirements
import { TrendingUp, Shield, Globe, AlertTriangle } from 'lucide-react';

// Define types for the metrics
interface MetricTileProps {
  label: string;
  count: number;
  Icon: LucideIcon;
  iconColor: string;
  animateToValue: number;
}

const MetricTile: React.FC<MetricTileProps> = ({
  label,
  Icon,
  iconColor,
  animateToValue,
}) => {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 20,
  });
  const count = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    spring.set(animateToValue);
  }, [animateToValue, spring]);

  return (
    <Card className="glassmorphism min-w-[150px]">
      <CardContent className="p-4 flex items-center space-x-4">
        <Icon className={`h-8 w-8 ${iconColor}`} />
        <div className="flex flex-col">
          <CardTitle className="text-xl font-bold">
            <motion.span>{count}</motion.span>
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            {label}
          </CardDescription>
        </div>
      </CardContent>
    </Card>
  );
};

interface MetricsBarProps {
  data: {
    competitiveMoves: number;
    strengths: number;
    sources: number;
    riskSignals: number;
  };
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  data,
}) => {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Hero Metrics
      </h3>
      <Separator />
      <div className="flex flex-wrap gap-4 justify-center md:justify-start">
        <MetricTile
          label="Competitive Moves"
          Icon={TrendingUp}
          iconColor="text-cyan-400"
          animateToValue={data.competitiveMoves}
        />
        <MetricTile
          label="Strengths"
          Icon={Shield}
          iconColor="text-emerald-400"
          animateToValue={data.strengths}
        />
        <MetricTile
          label="Sources"
          Icon={Globe}
          iconColor="text-amber-400"
          animateToValue={data.sources}
        />
        <MetricTile
          label="Risk Signals"
          Icon={AlertTriangle}
          iconColor="text-red-400"
          animateToValue={data.riskSignals}
        />
      </div>
    </section>
  );
};

// Placeholder for glassmorphism styling - this would typically be in a global CSS or Tailwind config
// For demonstration, we'll assume it's applied via a class.
// Example CSS (not to be added directly here, but for context):
// .glassmorphism {
//   background: rgba(255, 255, 255, 0.05);
//   backdrop-filter: blur(5px);
//   -webkit-backdrop-filter: blur(5px);
//   border: 1px solid rgba(255, 255, 255, 0.1);
// }
