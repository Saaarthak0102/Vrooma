"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

/** App-native replacement for window.confirm(). Resolves true on confirm, false on cancel/Esc/outside click. */
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const [open, setOpen] = React.useState(false);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    // Settle any dialog that is still pending so its caller never hangs.
    resolverRef.current?.(false);
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = React.useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(next) => !next && settle(false)}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-base font-bold">{options?.title}</DialogTitle>
            {options?.description ? (
              <DialogDescription>{options.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 sm:space-x-0">
            <Button variant="secondary" size="sm" onClick={() => settle(false)}>
              {options?.cancelLabel ?? "Keep it"}
            </Button>
            <Button
              variant={options?.destructive ? "outline" : "primary"}
              size="sm"
              className={options?.destructive ? "text-danger hover:bg-danger/10" : undefined}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
