"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Phone, Send, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ReassignDialog } from "@/components/staff/ReassignDialog";
import { findForbiddenDiscountWord } from "@/lib/validation/discount";
import { createClient } from "@/lib/supabase/client";
import {
  getChatDetailAction,
  pollChatAction,
  resolveChatAction,
  sendChatReplyAction,
  type ChatDetail,
} from "@/server/actions/staff-chat";
import type { ChatMessage } from "@/server/repositories/chats";
import type { Profile } from "@/types/domain";

const timeFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });

export interface ChatPanelProps {
  conversationId: string | null;
  consultants: Profile[];
  onClose: () => void;
  /** Tell the grid that this chat's status or last message changed. */
  onChanged: () => void;
}

/** Side panel for one handed-off chat: the AI's brief, the transcript, and a guarded reply box. */
export function ChatPanel({ conversationId, consultants, onClose, onChanged }: ChatPanelProps) {
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastSeen = useRef<string | null>(null);

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setDetail((prev) => {
      if (!prev) return prev;
      const seen = new Set(prev.messages.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (!fresh.length) return prev;
      lastSeen.current = fresh[fresh.length - 1].created_at;
      return { ...prev, messages: [...prev.messages, ...fresh] };
    });
  }, []);

  const load = useCallback(async (id: string) => {
    const res = await getChatDetailAction(id);
    if (res.ok) {
      setDetail(res.data);
      setError(null);
      const last = res.data.messages[res.data.messages.length - 1];
      lastSeen.current = last?.created_at ?? null;
    } else {
      setError(res.error?.message ?? "Could not load this chat.");
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    setError(null);
    setReply("");
    lastSeen.current = null;
    if (conversationId) void load(conversationId);
  }, [conversationId, load]);

  // Live: new buyer messages arrive through Realtime (RLS limits it to chats this person may read).
  // A slow poll is the fallback if the socket is blocked.
  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const refresh = async () => {
      const res = await pollChatAction(conversationId, lastSeen.current);
      if (res.ok) {
        merge(res.data.messages);
        setDetail((prev) => (prev ? { ...prev, conversation: { ...prev.conversation, status: res.data.status } } : prev));
      }
    };
    const channel = supabase
      ?.channel(`staff-chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        () => void refresh()
      )
      .subscribe();
    const timer = setInterval(() => void refresh(), 8000);
    return () => {
      clearInterval(timer);
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [conversationId, merge]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [detail?.messages.length]);

  const conv = detail?.conversation;
  const ctx = conv?.ai_context;
  const closed = conv?.status === "resolved";
  const blocked = reply ? findForbiddenDiscountWord(reply) : null;

  const send = async () => {
    if (!conversationId || !reply.trim() || blocked || sending) return;
    setSending(true);
    try {
      const res = await sendChatReplyAction(conversationId, reply);
      if (res.ok) {
        merge([res.data.message]);
        setDetail((prev) => (prev ? { ...prev, conversation: { ...prev.conversation, status: "live" } } : prev));
        setReply("");
        onChanged();
      } else {
        toast.error(res.error.message || "Could not send the reply.");
      }
    } finally {
      setSending(false);
    }
  };

  const close = async () => {
    if (!conversationId) return;
    const res = await resolveChatAction(conversationId);
    if (res.ok) {
      toast.success("Chat closed.");
      await load(conversationId);
      onChanged();
    } else {
      toast.error(res.error.message || "Could not close the chat.");
    }
  };

  return (
    <Sheet open={Boolean(conversationId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-3 sm:max-w-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="pr-6 text-lg font-black">{conv?.buyer_name ?? "Support chat"}</SheetTitle>
          <SheetDescription className="text-xs">
            {conv ? `${conv.lead_ref ?? "No lead"}${conv.buyer_phone ? ` · ${conv.buyer_phone}` : ""}` : "Loading chat…"}
          </SheetDescription>
        </SheetHeader>

        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </p>
        )}

        {!detail && !error && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-24 w-full bg-border" />
            <Skeleton className="h-40 w-full bg-border" />
          </div>
        )}

        {detail && conv && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={closed ? "secondary" : conv.status === "waiting" ? "accent" : "ok"} className="text-[10px] capitalize">
                {conv.status}
              </Badge>
              {conv.buyer_phone && (
                <a href={`tel:${conv.buyer_phone}`} className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-accent">
                  <Phone className="h-3 w-3" aria-hidden /> Call
                </a>
              )}
              {conv.lead_id && (
                <Link href={`/staff?lead=${conv.lead_id}`} className="text-xs font-semibold text-accent hover:underline">
                  Open lead
                </Link>
              )}
              {conv.lead_id && !closed && (
                <ReassignDialog
                  leadId={conv.lead_id}
                  consultants={consultants}
                  currentAssignedId={conv.assigned_to}
                  onReassigned={() => {
                    onChanged();
                    onClose();
                  }}
                />
              )}
              {!closed && (
                <Button variant="outline" size="sm" className="ml-auto h-8 px-2.5 text-xs" onClick={close}>
                  Close chat
                </Button>
              )}
            </div>

            {/* What the AI learned before handing over */}
            <section aria-label="AI brief" className="rounded-xl border border-border bg-white p-3 text-xs">
              <p className="mb-1 flex items-center gap-1 font-bold text-ink">
                <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden /> AI brief
              </p>
              <p className="text-ink-soft">{ctx?.summary ?? "No summary was captured."}</p>
              {ctx?.buyerQuestions && ctx.buyerQuestions.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-ink-soft">
                  {ctx.buyerQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[10px] text-ink-mute">
                {ctx?.signedIn ? "Signed-in buyer" : "Guest"} · {ctx?.messageCount ?? 0} messages before handoff
              </p>
              {ctx?.suggestedReply && !closed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 px-2 text-[11px]"
                  onClick={() => setReply(ctx.suggestedReply as string)}
                >
                  Use suggested first reply
                </Button>
              )}
            </section>

            {/* Transcript */}
            <div data-lenis-prevent className="min-h-[180px] flex-1 space-y-2.5 overflow-y-auto rounded-xl bg-bg/60 p-3 text-xs" aria-live="polite">
              {detail.messages.map((m) =>
                m.role === "system" ? (
                  <p key={m.id} className="text-center text-[10px] text-ink-mute">
                    {m.content}
                  </p>
                ) : (
                  <div key={m.id} className={`flex flex-col ${m.role === "consultant" ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl p-2.5 leading-relaxed ${
                        m.role === "consultant"
                          ? "rounded-br-none bg-dark text-white"
                          : m.role === "assistant"
                            ? "rounded-bl-none border border-dashed border-border bg-white text-ink-soft"
                            : "rounded-bl-none border border-border bg-white text-ink"
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="mt-0.5 px-1 text-[10px] text-ink-mute">
                      {m.role === "assistant" ? "AI assistant" : m.role === "user" ? "Buyer" : "You"} · {timeFmt.format(new Date(m.created_at))}
                    </span>
                  </div>
                )
              )}
              <div ref={endRef} />
            </div>

            {/* Reply box */}
            {closed ? (
              <p className="text-center text-xs text-ink-mute">This chat is closed.</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
                className="space-y-1.5"
              >
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Reply to the buyer…"
                  aria-label="Reply to the buyer"
                />
                {blocked && (
                  <p role="alert" className="flex items-center gap-1 text-[11px] font-semibold text-danger">
                    <AlertTriangle className="h-3 w-3" aria-hidden /> Replies cannot mention “{blocked}”.
                  </p>
                )}
                <Button type="submit" size="sm" disabled={!reply.trim() || Boolean(blocked) || sending} className="w-full" leftIcon={<Send className="h-3.5 w-3.5" />}>
                  Send reply
                </Button>
              </form>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
