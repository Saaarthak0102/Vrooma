import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

    const variants = {
      // Dark pill buttons for primary CTAs per design system
      primary:
        "bg-dark text-white hover:bg-black rounded-pill shadow-sm active:translate-y-[0.5px]",
      secondary:
        "bg-white/80 hover:bg-white text-ink border border-border rounded-pill shadow-card",
      outline:
        "border border-ink/20 hover:border-ink/40 text-ink bg-transparent rounded-pill hover:bg-white/40",
      ghost:
        "text-ink hover:bg-black/5 rounded-pill",
      danger:
        "bg-danger text-white hover:opacity-90 rounded-pill shadow-sm",
      accent:
        "bg-accent text-dark font-semibold hover:bg-accent-ink hover:text-white rounded-pill shadow-sm",
    };

    const sizes = {
      sm: "h-9 px-4 text-xs tracking-wider uppercase font-semibold",
      md: "h-11 px-6 text-sm",
      lg: "h-13 px-8 text-base font-semibold",
      icon: "h-10 w-10 p-0 rounded-pill",
    };

    return (
      <Comp
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    const sizeMap = {
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
    };

    return (
      <Button
        variant={variant as any}
        size="icon"
        className={cn(sizeMap[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
IconButton.displayName = "IconButton";
