'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExternalLink, ChevronDown, Sparkles, Copy, Download, Share2, TrendingUp, Shield, Globe, AlertTriangle } from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';

// Mock data type for metrics, adjust as needed if ReportData is available globally
interface Metrics {
  competitiveMoves: number;
  strengths: number;
  sources: number;
  riskSignals: number;
}

// Assuming ReportData is available or can be passed down
type ReportDataType = {
  company: string;
  topic: string;
  generatedDate: string;
  metrics: Metrics;
  competitiveMoves: { date: string; summary: string }[];
  swot: { strengths: { item: string; evidence: string }[]; weaknesses: { item: string; evidence: string }[]; opportunities: { item: string; evidence: string }[]; threats: { item: string; evidence: string }[] };
  sources: { url: string; snippet: string; title: string }[];
  alerts: { company: string; topic: string; changeSummary: string; has_new_changes: boolean }[];
};


const MetricsBar: React.FC<{ metrics: Metrics }> = ({ metrics }) => {
  const numberAnimation = (number: number) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [springProps, api] = useSpring(() => ({
      from: { value: 0 },
      to: { value: number },
      config: { duration: 1500, easing: (t: number) => t < 0.5 ? 2*t*t : 1 - 2*(1-t)*(1-t) } // Custom ease for smoother animation
    }));

    useEffect(() => {
      api.start();
    }, [number, api]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <animated.span>{springProps.value.to((val: number) => Math.floor(val))}</animated.span>;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 glassmorphism p-4 border border-white/10 rounded-xl mb-8">
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold text-cyan-300">{numberAnimation(metrics.competitiveMoves)}</div>
        <div className="text-slate-400 uppercase text-sm">Competitive Moves</div>
        <TrendingUp className="mt-2 text-slate-500" size={20} />
      </div>
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold text-cyan-300">{numberAnimation(metrics.strengths)}</div>
        <div className="text-slate-400 uppercase text-sm">Strengths</div>
        <Shield className="mt-2 text-slate-500" size={20} />
      </div>
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold text-cyan-300">{numberAnimation(metrics.sources)}</div>
        <div className="text-slate-400 uppercase text-sm">Sources</div>
        <Globe className="mt-2 text-slate-500" size={20} />
      </div>
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold text-amber-400">{numberAnimation(metrics.riskSignals)}</div>
        <div className="text-slate-400 uppercase text-sm">Risk Signals</div>
        <AlertTriangle className="mt-2 text-amber-500" size={20} />
      </div>
    </div>
  );
};

export default MetricsBar;
