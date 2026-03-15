import React from 'react';
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ReportCardProps {
  id: string; // Added id for dnd-kit
  company: string;
  topic: string;
  status: "generating" | "done" | "error" | "pending";
  date: string;
  link: string;
  index: number; // For stagger animation
}

const ReportCard: React.FC<ReportCardProps> = ({
  id, // Destructure id
  company,
  topic,
  status,
  date,
  link,
  index,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: id });

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
  };

  const getBadgeVariant = () => {
    switch (status) {
      case 'generating':
        return 'outline'; // Custom styling might be applied via className
      case 'done':
        return 'success';
      case 'error':
        return 'destructive';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  const badgeClassName = status === 'generating' ? 'bg-cyan/20 text-cyan border-none' : '';

  return (
    <motion.div
      ref={setNodeRef} // Apply setNodeRef here
      style={style}    // Apply dnd-kit styles
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0, transition: { delay: index * 0.1 } }}
      exit={{ opacity: 0, y: 12 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-cyan/40 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-cyan/10 relative cursor-grab"
      {...attributes} // Spread dnd-kit attributes
      {...listeners} // Spread dnd-kit listeners
    >
      <div className="font-semibold text-lg">{company}</div>
      <div className="text-sm text-slate-400 mb-2">{topic}</div>
      <div className="text-xs text-slate-500 mb-3">
        Status: <Badge variant={getBadgeVariant()} className={badgeClassName}>
          {status || 'pending'}
        </Badge>
      </div>
      <div className="text-xs text-slate-500 mb-3">Date: {date}</div>
      <div className="flex justify-end absolute bottom-4 right-4">
        <a href={link} className="text-cyan hover:underline flex items-center">
          <ArrowRightIcon className="h-4 w-4" />
        </a>
      </div>
    </motion.div>
  );
};

export default ReportCard;
