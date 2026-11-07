"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, X, Send, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypingDots } from "@/components/chat/TypingDots";
import { ChatText } from "@/components/chat/ChatText";
import { stopLenis, startLenis } from "@/components/motion/SmoothScrollProvider";

interface Message {
  id: string;
  sender: "bot" | "user" | "consultant" | "system";
  text: string;
  time: string;
  /** Server timestamp, used as the polling cursor. */
  at?: string;
}

interface QuickReply {
  label: string;
  action?: "solved" | "connect";
  text?: string;
}

type ChatStatus = "bot" | "waiting" | "live" | "resolved";

interface ServerMessage {
  id: string;
  role: "user" | "assistant" | "consultant" | "system";
  content: string;
  created_at: string;
}

const STORE_KEY = "vrooma-chat-session";
const ROLE_TO_SENDER: Record<ServerMessage["role"], Message["sender"]> = {
  user: "user",
  assistant: "bot",
  consultant: "consultant",
  system: "system",
};

const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
function toMessage(m: ServerMessage): Message {
  return { id: m.id, sender: ROLE_TO_SENDER[m.role], text: m.content, time: timeFmt.format(new Date(m.created_at)), at: m.created_at };
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatStatus>("bot");
  const [consultantName, setConsultantName] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [needsContact, setNeedsContact] = useState(false);
  const [contact, setContact] = useState({ name: "", phone: "", consent: false });
  const [contactError, setContactError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Remember the chat for this browser tab, so closing the box or reloading does not lose it.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { conversationId?: string; guestToken?: string | null };
      if (saved.conversationId) setConversationId(saved.conversationId);
      if (saved.guestToken) setGuestToken(saved.guestToken);
    } catch {
      // storage unavailable: start fresh
    }
  }, []);

  const remember = (id: string | null, token: string | null) => {
    try {
      if (id) sessionStorage.setItem(STORE_KEY, JSON.stringify({ conversationId: id, guestToken: token }));
      else sessionStorage.removeItem(STORE_KEY);
    } catch {
      // ignore
    }
  };

  const mergeServer = useCallback((incoming: ServerMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id)).map(toMessage);
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, []);

  const lastServerAt = useRef<string | null>(null);
  useEffect(() => {
    const withAt = messages.filter((m) => m.at);
    lastServerAt.current = withAt.length ? (withAt[withAt.length - 1].at as string) : null;
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // Restored chat: load its history once.
  useEffect(() => {
    if (!conversationId || messages.length > 1) return;
    void (async () => {
      try {
        const qs = new URLSearchParams({ conversationId });
        if (guestToken) qs.set("guestToken", guestToken);
        const res = await fetch(`/api/chat/messages?${qs}`);
        const json = await res.json();
        if (json?.ok) {
          setStatus(json.data.status);
          setConsultantName(json.data.consultantName ?? null);
          mergeServer(json.data.messages);
          if (json.data.status === "resolved") {
            setConversationId(null);
            remember(null, null);
          }
        }
      } catch {
        // keep the greeting
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Handed-off chat: pick up the consultant's replies.
  useEffect(() => {
    if (!conversationId || (status !== "waiting" && status !== "live")) return;
    const tick = async () => {
      try {
        const qs = new URLSearchParams({ conversationId });
        if (guestToken) qs.set("guestToken", guestToken);
        if (lastServerAt.current) qs.set("since", lastServerAt.current);
        const res = await fetch(`/api/chat/messages?${qs}`, { cache: "no-store" });
        const json = await res.json();
        if (json?.ok) {
          mergeServer(json.data.messages);
          setStatus(json.data.status);
          setConsultantName(json.data.consultantName ?? null);
        }
      } catch {
        // try again next tick
      }
    };
    const timer = setInterval(() => void tick(), 4000);
    return () => clearInterval(timer);
  }, [conversationId, guestToken, status, mergeServer]);

  const handleSend = async (textToSend?: string, action?: "solved" | "connect") => {
    const text = (textToSend ?? input).trim();
    if ((!text && !action) || sending) return;

    // Bot-stage text shows at once; the server's stored copy is what carries the real id.
    if (!action && status === "bot") {
      setMessages((prev) => [...prev, { id: `local-${Date.now()}`, sender: "user", text, time: "Now" }]);
    }
    setInput("");
    setQuickReplies([]);
    setSending(true);

    let notice: string | null = null;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: action ? undefined : text, action, conversationId, guestToken }),
      });
      const json = await res.json();
      if (json?.ok) {
        const d = json.data;
        setConversationId(d.conversationId);
        if (d.guestToken) setGuestToken(d.guestToken);
        remember(d.conversationId, d.guestToken ?? null);
        setStatus(d.status);
        setConsultantName(d.consultantName ?? null);
        setNeedsContact(Boolean(d.needsContact));
        setQuickReplies(d.quickReplies ?? []);
        // Swap the optimistic copy for the stored messages.
        setMessages((prev) => prev.filter((m) => !m.id.startsWith("local-")));
        mergeServer(d.messages ?? []);
        notice = d.notice ?? null;
        if (d.status === "resolved") {
          setConversationId(null);
          setGuestToken(null);
          remember(null, null);
        }
      } else {
        notice = typeof json?.error === "string" ? json.error : "Sorry, I could not reach the desk just now. Please try again in a moment.";
      }
    } catch {
      notice = "Sorry, I could not reach the desk just now. Please try again in a moment.";
    } finally {
      setSending(false);
    }
    if (notice) {
      setMessages((prev) => [...prev, { id: `n-${Date.now()}`, sender: "bot", text: notice as string, time: "Just now" }]);
    }
  };

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId || sending) return;
    setContactError(null);
    setSending(true);
    try {
      const res = await fetch("/api/chat/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, guestToken, name: contact.name, phone: contact.phone, consent: contact.consent }),
      });
      const json = await res.json();
      if (json?.ok) {
        setNeedsContact(false);
        setStatus(json.data.status);
        setConsultantName(json.data.consultantName ?? null);
        const qs = new URLSearchParams({ conversationId });
        if (guestToken) qs.set("guestToken", guestToken);
        const r2 = await fetch(`/api/chat/messages?${qs}`, { cache: "no-store" });
        const j2 = await r2.json();
        if (j2?.ok) mergeServer(j2.data.messages);
      } else {
        setContactError(typeof json?.error === "string" ? json.error : "We could not connect you. Please try again.");
      }
    } catch {
      setContactError("We could not connect you. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const live = status === "waiting" || status === "live";

  if (!isVisible && !isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <Button
          variant="secondary"
          size="md"
          shape="pill"
          onClick={() => setIsOpen(true)}
          className="h-12 shadow-card"
          leftIcon={<div className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />}
          aria-label="Open Vrooma Live Chat"
        >
          <MessageSquare className="h-4 w-4 text-ink inline" />
          <span className="text-xs font-semibold tracking-wide">Chat with us</span>
        </Button>
      )}

      {isOpen && (
        <div
          data-lenis-prevent
          className="chat-panel chat-panel-animate-enter w-[calc(100vw-3rem)] max-w-[400px] h-[520px] max-h-[calc(100vh-6rem)] rounded-2xl border border-border bg-white shadow-2xl flex flex-col overflow-hidden"
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
                    {live ? "Consultant" : "AI Assistant"}
                  </Badge>
                </h3>
                <p className="text-[11px] text-gray-400">Available 24/7 · Lucknow Desk</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              shape="pill"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-gray-400 hover:text-white"
              aria-label="Close Chat"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Handoff status */}
          {live && (
            <div role="status" className="border-b border-border bg-accent-soft px-4 py-2 text-[11px] font-semibold text-ink">
              {status === "waiting"
                ? `Waiting for ${consultantName ?? "a consultant"} to reply…`
                : `Chatting with ${consultantName ?? "your consultant"}`}
            </div>
          )}

          {/* Messages list with data-lenis-prevent */}
          <div
            data-lenis-prevent
            aria-live="polite"
            className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-bg/40 text-xs"
          >
            {messages.map((m) =>
              m.sender === "system" ? (
                <p key={m.id} className="text-center text-[10px] text-ink-mute">
                  {m.text}
                </p>
              ) : (
                <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start fade-up-item"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl p-3 leading-relaxed ${
                      m.sender === "user"
                        ? "bg-dark text-white rounded-br-none"
                        : m.sender === "consultant"
                          ? "bg-accent-soft border border-accent/30 text-ink shadow-sm rounded-bl-none"
                          : "bg-white border border-border text-ink shadow-sm rounded-bl-none"
                    }`}
                  >
                    {m.sender === "bot" ? <ChatText text={m.text} /> : m.text}
                  </div>
                  <span className="text-[10px] text-ink-mute mt-1 px-1">
                    {m.sender === "consultant" ? `${consultantName ?? "Consultant"} · ` : ""}
                    {m.time}
                  </span>
                </div>
              )
            )}
            {sending && status === "bot" && (
              <div className="fade-up-item flex flex-col items-start">
                <div className="rounded-2xl rounded-bl-none border border-border bg-white px-3 py-2 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Contact details for the handoff (guests, or buyers without a saved mobile number) */}
          {needsContact && !live && (
            <form onSubmit={submitContact} className="space-y-2 border-t border-border bg-white p-3">
              <input
                type="text"
                required
                placeholder="Your name"
                aria-label="Your name"
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                className="w-full rounded-pill bg-ink/5 px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="tel"
                required
                inputMode="numeric"
                placeholder="10-digit mobile number"
                aria-label="Mobile number"
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                className="w-full rounded-pill bg-ink/5 px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <label className="flex items-start gap-2 text-[11px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={contact.consent}
                  onChange={(e) => setContact((c) => ({ ...c, consent: e.target.checked }))}
                  className="mt-0.5"
                />
                <span>
                  I agree that Vrooma may contact me about this enquiry (see the{" "}
                  <a href="/legal/privacy" className="underline">
                    Privacy Policy
                  </a>
                  ).
                </span>
              </label>
              {contactError && (
                <p role="alert" className="text-[11px] font-semibold text-danger">
                  {contactError}
                </p>
              )}
              <Button type="submit" variant="primary" size="sm" shape="pill" disabled={!contact.consent || sending} className="w-full">
                Connect me
              </Button>
            </form>
          )}

          {/* Quick replies: the bot's "solved or connect?" choices, or starter prompts */}
          {!live && !needsContact && (
            <div
              data-lenis-prevent
              className="p-2 border-t border-border bg-white flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none"
            >
              {(quickReplies.length
                ? quickReplies
                : status === "bot"
                  ? quickPrompts.map((q) => ({ label: q, text: q }) as QuickReply)
                  : []
              ).map((q, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  shape="pill"
                  disabled={sending}
                  onClick={() => (q.action ? handleSend(undefined, q.action) : handleSend(q.text ?? q.label))}
                  className="text-[11px] h-7 px-2.5 py-0 bg-ink/5 hover:bg-ink/10 text-ink-soft hover:text-ink shrink-0 font-normal"
                >
                  {q.label}
                </Button>
              ))}
            </div>
          )}

          {/* Buyer can close a live chat */}
          {live && (
            <div className="border-t border-border bg-white px-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                shape="pill"
                disabled={sending}
                onClick={() => handleSend(undefined, "solved")}
                className="h-7 px-2.5 py-0 text-[11px] font-normal text-ink-soft"
              >
                My query is solved
              </Button>
            </div>
          )}

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
              placeholder={live ? "Message your consultant…" : "Ask about prices, slots, booking..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-ink/5 border-none rounded-pill px-4 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Button
              type="submit"
              variant="primary"
              size="icon"
              shape="pill"
              disabled={!input.trim() || sending}
              className="h-9 w-9 shrink-0"
              aria-label="Send Message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
