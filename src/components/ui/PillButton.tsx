import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  asChild?: boolean;
  showArrow?: boolean;
}

export const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  (
    {
      className,
      variant = "primary",
      asChild = false,
      showArrow = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const baseClasses =
      "group inline-flex items-center justify-center gap-2 rounded-pill min-h-[44px] px-6 py-2.5 text-sm font-semibold tracking-wide transition-all select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

    const variantClasses =
      variant === "primary"
        ? "bg-dark text-white hover:bg-black hover:shadow-md border border-dark"
        : "bg-white/70 text-ink border border-border backdrop-blur-md hover:bg-white hover:border-ink/20 shadow-sm";

    if (asChild) {
      return (
        <Comp
          className={cn(baseClasses, variantClasses, className)}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses, className)}
        {...props}
      >
        <span>{children}</span>
        {showArrow && (
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-[3px]" />
        )}
      </button>
    );
  }
);

PillButton.displayName = "PillButton";
