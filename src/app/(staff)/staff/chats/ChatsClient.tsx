"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, MessageSquare, Radio, Timer } from "lucide-react";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { ChatPanel } from "@/components/staff/ChatPanel";
import { createClient } from "@/lib/supabase/client";
import type { ChatConversation, ChatStatus } from "@/server/repositories/chats";
import type { Profile, Role } from "@/types/domain";

const STATUS_LABEL: Record<ChatStatus, string> = { bot: "Bot", waiting: "Waiting", live: "Live", resolved: "Resolved" };
const dateFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });

function minutes(from: string, to: string): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
}

export function ChatsClient({
  initialConversations,
  consultants,
  viewerId,
  viewerRole,
}: {
  initialConversations: ChatConversation[];
  consultants: Profile[];
  viewerId: string;
  viewerRole: Role;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get("chat"));
  const [status, setStatus] = useState<ChatStatus | null>(null);

  // New hand-offs and status changes: RLS decides which conversations this person receives. Refetch for names.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel("staff-chats-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const rows = initialConversations;

  const kpi = useMemo(() => {
    const replied = rows.filter((c) => c.handoff_at && c.first_staff_reply_at);
    const avg = replied.length
      ? Math.round(replied.reduce((n, c) => n + minutes(c.handoff_at as string, c.first_staff_reply_at as string), 0) / replied.length)
      : null;
    return {
      waiting: rows.filter((c) => c.status === "waiting").length,
      live: rows.filter((c) => c.status === "live").length,
      resolved: rows.filter((c) => c.status === "resolved").length,
      avg,
    };
  }, [rows]);

  const toggle = (s: ChatStatus) => setStatus((cur) => (cur === s ? null : s));

  const columns: GridColumn<ChatConversation>[] = [
    {
      id: "status",
      header: "Status",
      accessor: (c) => STATUS_LABEL[c.status],
      filter: "select",
      cell: (c) => (
        <Badge variant={c.status === "waiting" ? "accent" : c.status === "live" ? "ok" : "secondary"} className="text-[10px]">
          {STATUS_LABEL[c.status]}
        </Badge>
      ),
    },
    { id: "buyer", header: "Buyer", accessor: (c) => c.buyer_name ?? "Guest", cell: (c) => <span className="font-bold text-ink">{c.buyer_name ?? "Guest"}</span> },
    { id: "lead", header: "Lead", accessor: (c) => c.lead_ref ?? "-" },
    { id: "topic", header: "Asked about", accessor: (c) => c.ai_context.summary ?? c.title, className: "min-w-[260px]" },
    { id: "owner", header: "Consultant", accessor: (c) => c.assigned_name ?? "Unassigned", filter: viewerRole === "consultant" ? undefined : "select" },
    {
      id: "last",
      header: "Last message (IST)",
      accessor: (c) => c.last_message_at,
      cell: (c) => <span className="tabular-nums">{dateFmt.format(new Date(c.last_message_at))}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <section aria-labelledby="chats-heading" className="space-y-2">
        <h1 id="chats-heading" className="text-lg font-black text-ink">
          Support chats
        </h1>
        <p className="text-xs text-ink-soft">
          Buyers the chat assistant could not fully help. The AI brief shows what they asked before you took over.
        </p>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Waiting" value={kpi.waiting} subtitle="No reply yet" icon={<MessageSquare className="h-4 w-4" />} onClick={() => toggle("waiting")} active={status === "waiting"} />
          <StatCard label="Live" value={kpi.live} subtitle="Conversation open" icon={<Radio className="h-4 w-4" />} onClick={() => toggle("live")} active={status === "live"} />
          <StatCard label="Resolved" value={kpi.resolved} subtitle="Closed chats" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => toggle("resolved")} active={status === "resolved"} />
          <StatCard label="First reply" value={kpi.avg === null ? "–" : `${kpi.avg} min`} subtitle="Average, handoff to first answer" icon={<Timer className="h-4 w-4" />} />
        </div>

        <DataGrid
          externalFilter={status ? (c: ChatConversation) => c.status === status : null}
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          activeRowKey={openId}
          onRowClick={(c) => setOpenId(c.id)}
          searchPlaceholder="Search buyer, lead, topic…"
          exportName="support-chats"
          emptyMessage={viewerId ? "No chats handed over yet. They appear here when a buyer asks for a consultant." : ""}
        />
      </section>

      <ChatPanel
        conversationId={openId}
        consultants={consultants}
        onClose={() => setOpenId(null)}
        onChanged={() => router.refresh()}
      />
    </div>
  );
}
