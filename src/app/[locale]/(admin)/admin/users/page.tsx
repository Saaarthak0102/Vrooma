"use client";

import React, { useState } from "react";
import { memoryStore } from "@/server/store";
import { Profile, Role } from "@/types/domain";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Shield } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>(memoryStore.users);

  const handleRoleChange = (userId: string, newRole: Role) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    toast.success(`User role updated to ${newRole}`);
  };

  const columns: Column<Profile>[] = [
    {
      header: "Staff Member",
      cell: (u) => (
        <div>
          <span className="font-bold text-xs text-ink block">{u.full_name}</span>
          <span className="text-[11px] text-ink-mute font-mono">{u.email}</span>
        </div>
      ),
    },
    {
      header: "Phone",
      cell: (u) => <span className="font-mono text-xs">{u.phone ? `+91 ${u.phone}` : "—"}</span>,
    },
    {
      header: "Assigned City",
      cell: (u) => (
        <span className="capitalize text-xs">
          {u.city_id ? u.city_id.replace("city-", "") : "Lucknow"}
        </span>
      ),
    },
    {
      header: "Role Permission",
      cell: (u) => (
        <div className="w-36">
          <Select
            value={u.role}
            onValueChange={(val) => handleRoleChange(u.id, val as Role)}
          >
            <SelectTrigger className="h-8 text-xs bg-white">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buyer" className="text-xs">
                Buyer
              </SelectItem>
              <SelectItem value="consultant" className="text-xs">
                Consultant
              </SelectItem>
              <SelectItem value="manager" className="text-xs">
                Manager
              </SelectItem>
              <SelectItem value="admin" className="text-xs">
                Admin (DP)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Staff Permissions & Roles</h1>
          <p className="text-xs text-ink-soft">
            Manage showroom consultants, used-car managers, and administrative access.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Invite Staff User", 3)}>
          <UserPlus className="h-4 w-4" />
          <span>Invite Staff</span>
        </Button>
      </div>

      <DataTable columns={columns} data={users} keyExtractor={(u) => u.id} />
    </div>
  );
}
