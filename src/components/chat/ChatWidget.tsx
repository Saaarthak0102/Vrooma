"use client";

import React, { useState } from "react";
import { MessageSquare, X, Send, Sparkles, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "Namaste! Welcome to Vrooma Lucknow. How may I assist you with models, test drives, or on-road prices today?",
      time: "Just now",
    },
  ]);

  const quickPrompts = [
    "What is the on-road price of Model H in Lucknow?",
    "Book a home test drive for Model C",
    "Show certified used cars under ₹8 lakh",
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text,
      time: "Now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Scripted placeholder response for Phase 1 (to be replaced with Vercel AI SDK in Phase 5)
    setTimeout(() => {
      let reply = "Thank you for reaching out! Our Lucknow showroom consultant is available right now. Would you like to lock a test drive slot or view our full price breakup?";
      if (text.toLowerCase().includes("model h") || text.toLowerCase().includes("price")) {
        reply = "Model H ZX Automatic starts at ₹12,45,000 ex-showroom. Lucknow on-road price is approximately ₹14,59,450 inclusive of road tax (10%), insurance and TCS. You can see the full breakdown on the Model H page!";
      } else if (text.toLowerCase().includes("used") || text.toLowerCase().includes("8 lakh")) {
        reply = "We currently have certified used cars like UC-1182 (Model C VX Diesel 2022) and UC-1205 (Model C LX 2021) available in Hazratganj, both 140-point inspected!";
      }

      const botMsg: Message = {
        id: `b-${Date.now()}`,
        sender: "bot",
        text: reply,
        time: "Just now",
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-dark text-white shadow-xl hover:bg-black transition-all hover:scale-105 flex items-center justify-center relative focus:outline-none focus:ring-4 focus:ring-accent/30"
          aria-label="Open Vrooma Live Chat"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-accent border-2 border-white" />
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] rounded-2xl border border-border bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-dark text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  Vrooma Concierge
                  <Badge variant="accent" className="text-[9px] py-0 px-1 bg-accent/20 text-accent">
                    AI Assistant
                  </Badge>
                </h3>
                <p className="text-[11px] text-gray-400">Available 24/7 · Lucknow Desk</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close Chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "bot" && (
                  <div className="h-7 w-7 rounded-full bg-ink/10 flex items-center justify-center text-ink shrink-0 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                    m.sender === "user"
                      ? "bg-dark text-white rounded-br-none"
                      : "bg-white text-ink border border-border rounded-bl-none"
                  }`}
                >
                  {m.text}
                  <span className="block text-[9px] mt-1 opacity-60 text-right">
                    {m.time}
                  </span>
                </div>
                {m.sender === "user" && (
                  <div className="h-7 w-7 rounded-full bg-dark text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-white border-t border-border/60 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            {quickPrompts.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap px-2.5 py-1 rounded-pill bg-ink/5 hover:bg-ink/10 text-ink-soft hover:text-ink text-left transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-border flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about prices, bookings..."
              className="h-10 text-xs bg-ink/5"
            />
            <Button type="submit" size="sm" className="h-10 w-10 p-0 rounded-pill shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
