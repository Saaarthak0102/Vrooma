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
  LayoutDashboard,
  LogOut,
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
        <button
          type="button"
          className="h-10 px-2.5 rounded-pill font-semibold text-ink inline-flex items-center gap-2 hover:bg-black/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
        >
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline-block text-xs font-semibold text-ink leading-none max-w-[100px] truncate">
            {user.full_name.split(" ")[0]}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-ink-mute shrink-0" />
        </button>
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

        {/* 1. My Profile */}
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            <span>{tNav("myProfile")}</span>
          </Link>
        </DropdownMenuItem>

        {/* 2. Dashboard */}
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
            <LayoutDashboard className="h-4 w-4" />
            <span>{tNav("dashboard")}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* 3. Sign Out */}
        <DropdownMenuItem
          onClick={signOut}
          className="flex items-center gap-2 cursor-pointer text-danger focus:text-danger focus:bg-danger/10"
        >
          <LogOut className="h-4 w-4" />
          <span>{tNav("signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
