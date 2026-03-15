'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ChevronDown, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface AiChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AiChatSidebar: React.FC<AiChatSidebarProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { role: 'user', content: input }]);
      setInput('');
      // Placeholder for AI response - in a real app, this would be an API call
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'ai', content: 'AI refinement coming soon...' }]);
      }, 1000);
    }
  };

  useEffect(() => {
    // Auto-scroll to the bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <motion.div
      className="fixed top-0 right-0 h-full bg-navy/95 border-l border-white/10 p-4 shadow-lg z-40"
      style={{ width: '360px', x: isOpen ? 0 : '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      initial={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold flex items-center">
          <Sparkles className="mr-2 text-cyan-400" size={24} /> AI Refinement
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronDown className="h-6 w-6 text-slate-400 hover:text-white rotate-90" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100%-100px)] mb-4" ref={scrollAreaRef}>
        <div className="space-y-4 pr-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs p-3 rounded-lg \${msg.role === 'user' ? 'bg-cyan-500 text-navy' : 'bg-white/5 text-white/90'}`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex absolute bottom-4 right-4 w-[calc(100%-32px)]">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for refinement..."
          className="flex-1 mr-2 bg-white/10 border-white/20 text-white"
          onKeyPress={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <Button onClick={handleSend} className="bg-cyan-500 text-navy hover:bg-cyan-600">Send</Button>
      </div>
    </motion.div>
  );
};

export default AiChatSidebar;
