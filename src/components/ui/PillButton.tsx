import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Button, ButtonProps } from "./button";

export interface PillButtonProps extends Omit<ButtonProps, "shape"> {
  showArrow?: boolean;
}

export const PillButton = React.forwardRef<any, PillButtonProps>(
  ({ showArrow = false, rightIcon, children, ...props }, ref) => {
    const arrow = showArrow ? (
      <ArrowRight className="h-4 w-4 btn__icon-right" aria-hidden="true" />
    ) : null;

    return (
      <Button
        ref={ref}
        shape="pill"
        rightIcon={rightIcon || arrow}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

PillButton.displayName = "PillButton";
