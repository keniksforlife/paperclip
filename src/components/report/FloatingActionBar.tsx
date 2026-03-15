
import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Download, Share2, Sparkles, Copy } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn utility for class merging

interface FloatingActionBarProps {
  // Potentially pass props for button actions or scroll threshold
  scrollThreshold?: number;
  onExportPDF?: () => void;
  onShare?: () => void;
  onRefineWithAI?: () => void;
  onCopyCitation?: () => void;
}

// Hook to track scroll position. This is a simplified version.
// In a real application, this would be more robust and potentially memoized.
const useScrollPosition = () => {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      setScrollPosition(window.scrollY);
    };
    window.addEventListener('scroll', updatePosition);
    updatePosition(); // Set initial position
    return () => window.removeEventListener('scroll', updatePosition);
  }, []);

  return scrollPosition;
};

export const FloatingActionBar: React.FC<FloatingActionBarProps> = ({
  scrollThreshold = 100,
  onExportPDF,
  onShare,
  onRefineWithAI,
  onCopyCitation,
}) => {
  const scrollY = useScrollPosition();

  // Determine if the bar should be visible based on scroll position
  const isVisible = scrollY > scrollThreshold;

  // Opacity transform for fading effect
  const opacity = useTransform(motion.scrollY, [0, scrollThreshold], [1, 0]);
  // For direct use, we'll use a simpler conditional render or opacity style
  // Let's use opacity for a smooth fade

  // The fixed positioning and background styling would be applied via CSS classes.
  // We'll assume `fixed bottom-0 left-[256px] right-0 on desktop` and `left-0 mobile` structure
  // and apply the fade effect via `opacity` style from framer motion.
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024; // Basic desktop detection
  const sidebarWidth = '256px'; // Example sidebar width

  const barStyle = {
    opacity: isVisible ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    // Conditional positioning for desktop vs mobile
    left: isDesktop ? sidebarWidth : '0',
    right: isDesktop ? '0' : '0',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)', // for Safari compatibility
    backgroundColor: 'rgba(15, 23, 42, 0.9)', // bg-navy/90
    borderTop: '1px solid rgba(255, 255, 255, 0.1)', // border-t border-white/10
  };

  return (
    <AnimatePresence>
      {!isVisible && (
        <motion.div
          className="fixed bottom-0 z-10 w-full border-t border-white/10 backdrop-blur-md bg-navy/90 p-3 flex justify-center items-center gap-3"
          style={{
            left: isDesktop ? sidebarWidth : '0',
            right: isDesktop ? '0' : '0',
            opacity: isVisible ? 0 : 1, // Fade in when scrolled up, fade out when scrolled down
            transition: 'opacity 0.3s ease-in-out',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Button variant="ghost" size="icon-sm" onClick={onExportPDF} aria-label="Export PDF">
            <Download className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onShare} aria-label="Share">
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onRefineWithAI} aria-label="Refine with AI">
            <Sparkles className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onCopyCitation} aria-label="Copy Citation">
            <Copy className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// NOTE: The `useScrollPosition` hook and the desktop detection are simplified for this example.
// In a production environment, consider using a more optimized hook (e.g., from a library)
// and a more robust way to detect desktop vs. mobile, possibly via context or props.
// The `cn` utility is assumed to be available for merging class names if needed.

// Example Usage:
// <FloatingActionBar
//   onExportPDF={() => console.log('Export PDF clicked')}
//   onShare={() => console.log('Share clicked')}
//   onRefineWithAI={() => console.log('Refine with AI clicked')}
//   onCopyCitation={() => console.log('Copy Citation clicked')}
// />
