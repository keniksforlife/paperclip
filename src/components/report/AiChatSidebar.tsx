
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LucideIcon } from 'lucide-react'; // Not directly used in this component, but good to have

// --- Interfaces ---

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

interface AiChatSidebarProps {
  initialMessages?: ChatMessage[];
  placeholder?: string;
  onSendMessage: (message: string) => Promise<string>;
  isOpen: boolean; // Add isOpen prop
  onClose: () => void; // Add onClose prop
}

// --- Components ---

// Component for a single chat message bubble
const ChatMessageBubble: React.FC<ChatMessage> = ({
  text,
  sender,
}) => {
  const isUser = sender === 'user';
  return (
    <div
      className={cn(
        'flex w-full my-2',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg shadow-md',
          isUser
            ? 'bg-cyan-500 text-white rounded-tr-none'
            : 'bg-white/5 text-muted-foreground rounded-tl-none'
        )}
      >
        <p className="text-sm break-words">
          {text}
        </p>
      </div>
    </div>
  );
};

export const AiChatSidebar: React.FC<AiChatSidebarProps> = ({
  initialMessages = [],
  placeholder = 'AI refinement coming soon...', // Default placeholder
  onSendMessage,
  isOpen, // Receive isOpen prop
  onClose, // Receive onClose prop
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponseText = await onSendMessage(newUserMessage.text);
      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        text: aiResponseText,
        sender: 'ai',
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        text: 'Sorry, I could not process your request. Please try again.',
        sender: 'ai',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Framer motion configuration for slide-in animation
  const sidebarVariants = {
    hidden: {
      x: '100%',
      opacity: 0,
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    },
    exit: {
      x: '100%',
      opacity: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    },
  };

  return (
    // Use AnimatePresence to control mounting/unmounting with animations
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border p-4 shadow-lg flex flex-col z-50"
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Refine with AI</CardTitle>
                {/* Use the onClose prop here */} 
                <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close AI Chat">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </Button>
              </div>
              <CardDescription>Get AI-powered insights and suggestions.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 pt-4">
              <ScrollArea className="h-full w-full pr-3" ref={scrollAreaRef as any}>
                {messages.map((msg) => (
                  <ChatMessageBubble key={msg.id} {...msg} />
                ))}
                {isLoading && (
                  <ChatMessageBubble
                    id="loading-indicator"
                    text="AI is thinking..."
                    sender="ai"
                  />
                )}
              </ScrollArea>
            </CardContent>
            <CardFooter>
              <div className="flex items-center w-full gap-2">
                <Textarea
                  placeholder={placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  className="flex-grow resize-none min-h-[40px]"
                  disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={isLoading || input.trim() === ''}>
                  Send
                </Button>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Helper function for class merging (assuming it's defined in @/lib/utils)
function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
}
