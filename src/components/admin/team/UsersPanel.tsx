"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/forms/PhoneField";
import { setStaffRoleAction } from "@/server/actions/admin-catalog";
import { setUserActiveAction } from "@/server/actions/admin-network";
import { inviteStaff } from "@/server/auth/actions";
import { ROLE_LABEL } from "@/lib/console-nav";
import type { Profile, Role, Showroom } from "@/types/domain";

const ROLES: Role[] = ["buyer", "consultant", "manager", "admin"];

export function UsersPanel({
  users,
  showrooms,
  currentUserId,
}: {
  users: Profile[];
  showrooms: Showroom[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);

  const changeRole = async (user: Profile, role: Role) => {
    if (role === user.role) return;
    const res = await setStaffRoleAction(user.id, role);
    if (res.ok) {
      toast.success(`${user.full_name} is now ${ROLE_LABEL[role]}.`);
      router.refresh();
    } else {
      toast.error(res.error?.message ?? "Could not change the role.");
      router.refresh(); // snap the dropdown back to the stored role
    }
  };

  const toggleActive = async (user: Profile) => {
    const next = user.is_active === false;
    const res = await setUserActiveAction(user.id, next);
    if (res.ok) {
      toast.success(next ? "Account reactivated." : "Account deactivated.");
      router.refresh();
    } else {
      toast.error(res.error?.message ?? "Could not update the account.");
    }
  };

  const columns: GridColumn<Profile>[] = [
    { id: "name", header: "Name", accessor: (u) => u.full_name, cell: (u) => <span className="font-bold text-ink">{u.full_name}</span> },
    { id: "email", header: "Email", accessor: (u) => u.email, cell: (u) => <span className="font-mono text-ink-soft">{u.email}</span> },
    { id: "phone", header: "Phone", accessor: (u) => u.phone ?? "" },
    {
      id: "role",
      header: "Role",
      accessor: (u) => ROLE_LABEL[u.role],
      filter: "select",
      cell: (u) => (
        <select
          value={u.role}
          disabled={u.id === currentUserId}
          title={u.id === currentUserId ? "You cannot change your own role" : undefined}
          aria-label={`Role for ${u.full_name}`}
          onChange={(e) => void changeRole(u, e.target.value as Role)}
          className="h-8 rounded-md border border-border bg-bg px-1.5 text-xs font-semibold disabled:opacity-60"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      ),
    },
    {
      id: "status",
      header: "Account",
      accessor: (u) => (u.is_active === false ? "Inactive" : "Active"),
      filter: "select",
      cell: (u) => (
        <span className="flex items-center gap-2">
          <Badge variant={u.is_active === false ? "outline" : "ok"} className="text-[10px]">
            {u.is_active === false ? "Inactive" : "Active"}
          </Badge>
          {u.id !== currentUserId && (
            <button
              type="button"
              onClick={() => void toggleActive(u)}
              className="text-[11px] font-semibold text-accent-ink hover:underline"
            >
              {u.is_active === false ? "Reactivate" : "Deactivate"}
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataGrid
        columns={columns}
        rows={users}
        rowKey={(u) => u.id}
        searchPlaceholder="Search name, email, role…"
        exportName="users"
        toolbar={
          <Button type="button" variant="primary" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" />
            Invite staff
          </Button>
        }
      />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} showrooms={showrooms} />
    </>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  showrooms,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showrooms: Showroom[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"consultant" | "manager" | "admin">("consultant");
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await inviteStaff(email, role, picked);
      if (!res.ok) {
        setError(res.error?.message ?? "Could not invite this person.");
        return;
      }
      toast.success(res.data.message);
      setEmail("");
      setPicked([]);
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Invite staff</DialogTitle>
          <DialogDescription>
            They sign in with an email code. If the email already has an account, its role is updated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Work email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
          </FormField>
          <FormField label="Role" required>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
            >
              <option value="consultant">Sales Consultant</option>
              <option value="manager">Used-Car Manager</option>
              <option value="admin">Dealer Principal</option>
            </select>
          </FormField>
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Works at</legend>
            {showrooms.map((s) => (
              <label key={s.id} className="flex min-h-[44px] items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={picked.includes(s.id)}
                  onChange={(e) =>
                    setPicked((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)))
                  }
                  className="h-4 w-4"
                />
                {s.name}
              </label>
            ))}
          </fieldset>
          {error && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Inviting…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
