'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardComparator, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Chip } from "@/components/ui/chip";
import { SparklesIcon, BarChartIcon, ArrowRightIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

// Import custom components
import ReportCard from "@/components/dashboard/ReportCard";
import GenerateModal from "@/components/dashboard/GenerateModal";
import InsightsRail from "@/components/dashboard/InsightsRail";

// Define Report type
interface Report {
  id: string;
  company: string;
  topic: string;
  status: "generating" | "done" | "error" | "pending";
  link: string;
  // Add date for display in ReportCard
  date: string;
}

// Define Alert type
interface Alert {
  id: string;
  company: string;
  summary: string;
  link: string;
}

// Placeholder API Calls
const generateReport = async (company: string, topic: string): Promise<Report> => {
  console.log(`Generating report for ${company} on ${topic}...`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  const newReportId = `report-${Date.now()}`;
  return {
    id: newReportId,
    company: company || 'Unknown Company',
    topic: topic || 'Market Analysis',
    status: 'generating',
    link: '#',
    date: new Date().toLocaleDateString(),
  };
};

const listAlerts = async (): Promise<Alert[]> => {
  console.log("Listing alerts...");
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { id: 'alert-1', company: 'Example Corp', summary: 'New funding round announced.', link: '#' },
    { id: 'alert-2', company: 'Tech Innovators', summary: 'Product launch successful.', link: '#' },
    { id: 'alert-3', company: 'Alpha Dynamics', summary: 'Key executive departure noted.', link: '#' },
  ];
};

const fetchInitialReports = async (): Promise<Report[]> => {
  await new Promise(resolve => setTimeout(resolve, 700));
  return [
    { id: 'report-1', company: 'Stripe', topic: 'Payment Processing Trends', status: 'done', link: '#', date: '2026-03-14' },
    { id: 'report-2', company: 'OpenAI', topic: 'LLM Advancements', status: 'error', link: '#', date: '2026-03-13' },
    { id: 'report-3', company: 'Salesforce', topic: 'CRM Market Share', status: 'pending', link: '#', date: '2026-03-12' },
  ];
};

// Utility for localStorage persistence of order
const saveOrderToLocalStorage = (order: string[]) => {
  localStorage.setItem('competeiq-watchlist-order', JSON.stringify(order));
};

const loadOrderFromLocalStorage = (): string[] => {
  const savedOrder = localStorage.getItem('competeiq-watchlist-order');
  return savedOrder ? JSON.parse(savedOrder) : [];
};

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalCompany, setModalCompany] = useState('');
  const [modalTopic, setModalTopic] = useState('');

  // Dnd-kit setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardComparator,
    })
  );

  // Load initial reports and reorder them based on localStorage
  useEffect(() => {
    const loadData = async () => {
      const fetchedReports = await fetchInitialReports();
      const savedOrder = loadOrderFromLocalStorage();

      // Reorder reports based on saved order, putting unsaved ones at the end
      const orderedReports = savedOrder
        .map(id => fetchedReports.find(report => report.id === id))
        .filter((report): report is Report => report !== undefined)
        .concat(fetchedReports.filter(report => !savedOrder.includes(report.id)));
      
      setReports(orderedReports);
      const fetchedAlerts = await listAlerts();
      setAlerts(fetchedAlerts);
    };
    loadData();
  }, []);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const newReport = await generateReport(modalCompany, modalTopic);
      setReports(prevReports => {
        const updatedReports = [newReport, ...prevReports];
        saveOrderToLocalStorage(updatedReports.map(r => r.id)); // Save new order
        return updatedReports;
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (companyName: string) => {
    setModalCompany(companyName);
    setModalTopic(''); // Clear topic when suggestion is clicked
    setIsModalOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setReports((currentReports) => {
        const oldIndex = currentReports.findIndex((report) => report.id === active.id);
        const newIndex = currentReports.findIndex((report) => report.id === over?.id);
        const newOrder = arrayMove(currentReports, oldIndex, newIndex);
        saveOrderToLocalStorage(newOrder.map(r => r.id)); // Save new order to localStorage
        return newOrder;
      });
    }
  };

  const smartSuggestions = [
    { name: 'Stripe', id: 'stripe' },
    { name: 'OpenAI', id: 'openai' },
    { name: 'Salesforce', id: 'salesforce' },
    { name: 'HubSpot', id: 'hubspot' },
    { name: 'Notion', id: 'notion' },
  ];

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Reset form values when modal closes
    setModalCompany('');
    setModalTopic('');
  };

  return (
    <div className="min-h-screen bg-navy text-slate-200 p-6">
      {/* Hero Section */}
      <section className="mb-8">
        <div className="text-4xl font-bold font-geist text-slate-200 mb-2">AI Intelligence Hub</div>
        <div className="text-lg text-slate-400 mb-6">Monitor competitors. Detect moves. Stay ahead.</div>
        <GenerateModal
          isOpen={isModalOpen}
          onOpenChange={handleModalClose}
          onGenerate={handleGenerateReport}
          isLoading={isLoading}
          initialCompany={modalCompany}
          initialTopic={modalTopic}
        />
      </section>

      {/* Smart Suggestions Strip */}
      <section className="mb-8 flex overflow-x-auto space-x-3 pb-3 scrollbar-hide">
        {smartSuggestions.map(suggestion => (
          <Chip
            key={suggestion.id}
            onClick={() => handleSuggestionClick(suggestion.name)}
            className="cursor-pointer"
          >
            {suggestion.name}
          </Chip>
        ))}
      </section>

      {/* Main Content Area: Watchlist Grid and Insights Rail */}
      <main className="flex flex-col lg:flex-row gap-8">
        {/* Watchlist Grid */}
        <section className="flex-1 lg:w-2/3">
          <div className="text-2xl font-semibold mb-4 flex justify-between items-center">
            Watchlist
            {/* Drag handle icon could be placed here if needed */}
          </div>
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            sensors={sensors}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={reports.map(report => report.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.length === 0 ? (
                  <div className="col-span-full text-center py-10">
                    <BarChartIcon className="mx-auto h-12 w-12 text-slate-700 mb-4" />
                    <div className="text-xl font-semibold mb-2">No reports yet</div>
                    <Button variant="outline" onClick={() => setIsModalOpen(true)} className="border-white/10 text-cyan hover:border-cyan">
                      Create Report
                    </Button>
                  </div>
                ) : (
                  reports.map((report, index) => (
                    <ReportCard
                      key={report.id}
                      id={report.id} // Pass id for dnd-kit
                      index={index} // Pass index for animation
                      company={report.company}
                      topic={report.topic}
                      status={report.status || 'pending'}
                      date={report.date}
                      link={report.link}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* Insights Rail */}
        <InsightsRail alerts={alerts} />
      </main>
    </div>
  );
}
