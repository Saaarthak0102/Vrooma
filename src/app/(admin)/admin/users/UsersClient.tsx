"use client";

import React, { useState } from "react";
import { Profile, Role } from "@/types/domain";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Shield } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";
import { setStaffRoleAction } from "@/server/actions/admin-catalog";

interface UsersClientProps {
  initialUsers: Profile[];
}

export function UsersClient({ initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState<Profile[]>(initialUsers);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      const res = await setStaffRoleAction(userId, newRole);
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        toast.success(`User role updated to ${newRole}`);
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error("Failed to update user role");
    }
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
          {u.city_id ? (u.city_id.includes("c0000001-0000-0000-0000-000000000002") ? "Kanpur" : "Lucknow") : "Lucknow"}
        </span>
      ),
    },
    {
      header: "Role Permission",
      cell: (u) => (
        <div className="w-36">
          <Select
            value={u.role}
            onValueChange={(val: Role) => handleRoleChange(u.id, val)}
          >
            <SelectTrigger className="h-7 text-xs bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buyer">Buyer</SelectItem>
              <SelectItem value="consultant">Sales Consultant</SelectItem>
              <SelectItem value="manager">Used-Car Manager</SelectItem>
              <SelectItem value="admin">Dealer Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    },
    {
      header: "Security Access",
      cell: (u) => {
        const variants: Record<Role, "ok" | "accent" | "secondary" | "outline"> = {
          admin: "ok",
          manager: "accent",
          consultant: "secondary",
          buyer: "outline",
        };
        return (
          <Badge variant={variants[u.role] || "outline"} className="text-[10px] capitalize">
            {u.role}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Dealership Staff & Role Management</h1>
          <p className="text-xs text-ink-soft">
            Role-based authorization desk for 340 dealership personnel across Lucknow & Kanpur facilities.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Invite Staff User", 3)}>
          <UserPlus className="h-4 w-4" />
          <span>Invite Staff</span>
        </Button>
      </div>

      <div className="rounded-xl border border-border p-4 bg-bg-sheen/50 flex items-start gap-3">
        <Shield className="h-5 w-5 text-accent-ink shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-ink">Security Privilege Separation</h4>
          <p className="text-[11px] text-ink-mute mt-0.5">
            Admin accounts hold Dealer Principal authority including city price tables and assignment pools. Used-Car Managers access AI price suggestion bands.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(u) => u.id}
      />
    </div>
  );
}

