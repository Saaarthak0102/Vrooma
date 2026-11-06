"use client";

import React from "react";
import { ChatConversationSummary } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { formatEnquiryDate } from "@/lib/date";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecentChatsPanelProps {
  chats: ChatConversationSummary[];
  onViewAll: (triggerElement: HTMLElement) => void;
  className?: string;
  style?: React.CSSProperties;
}

/** Plain, single-line rows of the buyer's past support chats: title, latest reply preview, date. */
export function RecentChatsPanel({ chats, onViewAll, className, style }: RecentChatsPanelProps) {
  const t = useTranslations("dashboard");
  const items = chats.slice(0, 3);

  return (
    <section
      data-bento-origin="enquiries"
      aria-labelledby="recent-chats-heading"
      style={style}
      className={cn(
        "bento-block bento-enquiries border-y border-border py-2 sm:py-3 flex flex-col justify-between overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between pb-2">
        <span
          id="recent-chats-heading"
          className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-mute"
        >
          {t("recentChats")}
        </span>
        {chats.length > 0 && (
          <Button
            variant="link"
            size="sm"
            onClick={(e) => onViewAll(e.currentTarget)}
            className="h-auto p-0 text-xs font-semibold text-accent-ink hover:underline"
          >
            {t("viewAll")}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center gap-2 py-3 text-ink-soft text-xs">
          <MessageSquare className="h-4 w-4 text-ink-mute" />
          <span>{t("noChats")}</span>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-border">
          {items.map((chat) => (
            <li key={chat.id} className="flex items-center gap-3 py-2 min-w-0 text-xs">
              <span className="font-bold text-ink truncate shrink-0 max-w-[40%]">{chat.title}</span>
              <span className="text-ink-soft truncate flex-1 min-w-0">{chat.snippet}</span>
              <span className="text-ink-mute shrink-0 tabular-nums">
                {formatEnquiryDate(chat.lastMessageAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
