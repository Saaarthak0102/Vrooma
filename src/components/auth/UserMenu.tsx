"use client";

import React from "react";
import { useAuth } from "./AuthProvider";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  LogOut,
  Calendar,
  Bookmark,
  MessageSquare,
  ShieldCheck,
  Briefcase,
  ChevronDown,
} from "lucide-react";

export function UserMenu() {
  const { user, role, signOut, openSignInSheet } = useAuth();
  const tNav = useTranslations("nav");

  if (!user) {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={() => openSignInSheet()}
        className="font-medium"
      >
        {tNav("signIn")}
      </Button>
    );
  }

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          shape="pill"
          className="h-10 px-2.5 font-semibold text-ink inline-flex items-center justify-center m-0 align-middle"
        >
          <Avatar className="h-7 w-7 shrink-0 my-auto">
            <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs max-w-[100px] truncate hidden sm:inline leading-none my-auto text-ink">
            {user.full_name.split(" ")[0]}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-ink-mute shrink-0 my-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold leading-none text-ink">{user.full_name}</p>
              <Badge variant="accent" className="text-[10px] uppercase py-0 px-1.5">
                {role}
              </Badge>
            </div>
            <p className="text-xs leading-none text-ink-soft truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Buyer items */}
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            <span>{tNav("dashboard")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/bookings" className="flex items-center gap-2 cursor-pointer">
            <Calendar className="h-4 w-4" />
            <span>My Bookings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/saved" className="flex items-center gap-2 cursor-pointer">
            <Bookmark className="h-4 w-4" />
            <span>Saved Vehicles</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/enquiries" className="flex items-center gap-2 cursor-pointer">
            <MessageSquare className="h-4 w-4" />
            <span>My Enquiries</span>
          </Link>
        </DropdownMenuItem>

        {/* Staff shortcut if consultant or higher */}
        {(role === "consultant" || role === "manager" || role === "admin") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/staff" className="flex items-center gap-2 cursor-pointer font-medium text-accent-ink">
                <Briefcase className="h-4 w-4" />
                <span>{tNav("staff")}</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        {/* Admin shortcut */}
        {role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center gap-2 cursor-pointer font-medium text-ink">
              <ShieldCheck className="h-4 w-4" />
              <span>{tNav("admin")}</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-danger focus:text-danger focus:bg-danger/10">
          <LogOut className="h-4 w-4" />
          <span>{tNav("signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

