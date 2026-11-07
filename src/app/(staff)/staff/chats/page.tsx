import React from "react";
import { requireRole } from "@/server/auth/viewer";
import { listStaffConversations } from "@/server/repositories/chats";
import { listUsers } from "@/server/repositories/users";
import { ChatsClient } from "./ChatsClient";

export const dynamic = "force-dynamic";

/** Support chats handed off by the buyer chatbot. Consultants see their own; managers and admins see all. */
export default async function StaffChatsPage() {
  const { user, profile } = await requireRole("consultant", "manager", "admin");

  const [conversations, consultants] = await Promise.all([
    listStaffConversations(profile.role === "consultant" ? { assignedTo: user.id } : {}),
    listUsers("consultant"),
  ]);

  return (
    <ChatsClient
      initialConversations={conversations}
      consultants={consultants.filter((c) => c.is_active !== false)}
      viewerId={user.id}
      viewerRole={profile.role}
    />
  );
}
