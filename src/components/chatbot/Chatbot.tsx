
'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { faqChatbot, type FaqChatbotInput, type FaqChatbotOutput } from '@/ai/flows/faq-chatbot-flow';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { id: 'initial-bot-message', text: "Hello! I'm Arjuna, your Acharya assistant. How can I help you today?", sender: 'bot' }
      ]);
    }
  }, [isOpen, messages.length]); // Added messages.length to dependencies to re-trigger if messages get cleared while open

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputValue,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const input: FaqChatbotInput = { question: userMessage.text };
      const response: FaqChatbotOutput = await faqChatbot(input);
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: response.answer,
        sender: 'bot',
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'Close chatbot' : 'Open chatbot'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-80 h-[28rem] shadow-xl z-50 flex flex-col rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
            <CardTitle className="text-lg flex items-center">
              <Bot className="h-5 w-5 mr-2 text-primary" /> Arjuna
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-grow p-0 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="p-4 space-y-3">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      'p-2.5 rounded-lg max-w-[85%] text-sm shadow-sm',
                      msg.sender === 'user' ? 'bg-primary text-primary-foreground ml-auto rounded-br-none' : 'bg-muted text-foreground rounded-bl-none'
                    )}
                  >
                    {msg.text}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center justify-start p-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                    <span className="text-xs text-muted-foreground">Arjuna is typing...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-3 border-t">
            <form onSubmit={handleSubmit} className="flex w-full space-x-2">
              <Input
                type="text"
                placeholder="Ask Arjuna..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                className="flex-grow h-9"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" className="h-9 w-9" disabled={isLoading || !inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
