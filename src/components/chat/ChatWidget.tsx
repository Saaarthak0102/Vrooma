"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, X, Send, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { stopLenis, startLenis } from "@/components/motion/SmoothScrollProvider";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "Namaste! Welcome to Vrooma Lucknow. How may I assist you with models, test drives, or on-road prices today?",
      time: "Just now",
    },
  ]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollY > 200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      stopLenis();
    } else {
      startLenis();
    }
    return () => {
      startLenis();
    };
  }, [isOpen]);

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

    setTimeout(() => {
      let reply = "Thank you for reaching out! Our Lucknow showroom consultant is available right now. Would you like to lock a test drive slot or view our full price breakup?";
      if (text.toLowerCase().includes("model h") || text.toLowerCase().includes("price")) {
        reply = "Model H ZX Automatic starts at ₹12,45,000 ex-showroom. Lucknow on-road price is approximately ₹14,59,450 inclusive of road tax (10%), insurance and TCS. You can see the full breakdown on the Model H page!";
      } else if (text.toLowerCase().includes("used") || text.toLowerCase().includes("8 lakh")) {
        reply = "We currently have certified used cars like UC-1182 (Model C VX Diesel 2022) and UC-1190 (Model S LX 2021) available in Hazratganj, both 140-point inspected!";
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

  if (!isVisible && !isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-12 px-4 rounded-pill bg-white/80 border border-border text-ink shadow-card backdrop-blur-md hover:bg-white hover:border-ink/20 transition-all flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Open Vrooma Live Chat"
        >
          <div className="h-2 w-2 rounded-full bg-accent" />
          <MessageSquare className="h-4 w-4 text-ink" />
          <span className="text-xs font-semibold tracking-wide">Chat with us</span>
        </button>
      )}

      {isOpen && (
        <div
          data-lenis-prevent
          className="w-[360px] sm:w-[400px] h-[520px] rounded-2xl border border-border bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
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

          {/* Messages list with data-lenis-prevent */}
          <div
            data-lenis-prevent
            className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-bg/40 text-xs"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                    m.sender === "user"
                      ? "bg-dark text-white rounded-br-none"
                      : "bg-white border border-border text-ink shadow-sm rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-ink-mute mt-1 px-1">
                  {m.time}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          <div
            data-lenis-prevent
            className="p-2 border-t border-border bg-white flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none"
          >
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-[11px] bg-ink/5 hover:bg-ink/10 text-ink-soft hover:text-ink px-2.5 py-1 rounded-pill transition-colors shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-border bg-white flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask about prices, slots, booking..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-ink/5 border-none rounded-pill px-4 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="h-9 w-9 rounded-full bg-dark text-white disabled:opacity-40 flex items-center justify-center shrink-0 transition-opacity"
              aria-label="Send Message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
