"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link"
  | "danger"
  | "accent";

export type ButtonSize = "sm" | "md" | "lg" | "icon";
export type ButtonShape = "pill" | "soft";
export type ButtonStatus = "idle" | "loading" | "success" | "error";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  status?: ButtonStatus;
  loadingText?: React.ReactNode;
  successText?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  wrap?: boolean;
  asChild?: boolean;
  href?: string;
  isBooked?: boolean;
}

export const Button = React.forwardRef<any, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      shape = "pill",
      status = "idle",
      loadingText,
      successText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      wrap = false,
      asChild = false,
      href,
      disabled,
      isBooked = false,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const effectiveVariant =
      variant === "danger"
        ? "destructive"
        : variant === "accent"
        ? "primary"
        : variant;

    const isLoading = status === "loading";
    const isSuccess = status === "success";

    const handleClick = (e: React.MouseEvent<any>) => {
      if (isLoading || disabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick?.(e as any);
    };

    const content = (
      <>
        <span className="btn__surface">
          <span className="btn__content">
            <span className="btn__label">
              {leftIcon}
              {children}
              {rightIcon}
            </span>
            <span className="btn__loading" aria-hidden={!isLoading}>
              <span className="btn__spinner" />
              <span>{loadingText || children}</span>
            </span>
            <span className="btn__success" aria-hidden={!isSuccess}>
              <svg
                className="btn__check-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>{successText || children}</span>
            </span>
          </span>
        </span>
        <span className="sr-only" aria-live="polite">
          {isSuccess
            ? typeof successText === "string"
              ? successText
              : "Action completed successfully"
            : null}
        </span>
      </>
    );

    // asChild pattern: clone child element if provided
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      const childChildren = child.props.children;
      return React.cloneElement(child, {
        ref,
        ...props,
        ...child.props,
        className: cn("btn", className, child.props.className),
        "data-variant": effectiveVariant,
        "data-size": size,
        "data-shape": shape,
        "data-status": status,
        "data-full-width": fullWidth ? "true" : undefined,
        "data-wrap": wrap ? "true" : undefined,
        "data-booked": isBooked ? "true" : undefined,
        "aria-busy": isLoading ? "true" : undefined,
        "aria-disabled": disabled || isLoading ? "true" : undefined,
        onClick: (e: any) => {
          if (isLoading || disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          child.props.onClick?.(e);
          onClick?.(e);
        },
        children: (
          <>
            <span className="btn__surface">
              <span className="btn__content">
                <span className="btn__label">
                  {leftIcon}
                  {childChildren}
                  {rightIcon}
                </span>
                <span className="btn__loading" aria-hidden={!isLoading}>
                  <span className="btn__spinner" />
                  <span>{loadingText || childChildren}</span>
                </span>
                <span className="btn__success" aria-hidden={!isSuccess}>
                  <svg
                    className="btn__check-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{successText || childChildren}</span>
                </span>
              </span>
            </span>
            <span className="sr-only" aria-live="polite">
              {isSuccess
                ? typeof successText === "string"
                  ? successText
                  : "Action completed successfully"
                : null}
            </span>
          </>
        ),
      });
    }

    if (href) {
      return (
        <Link
          ref={ref}
          href={href as any}
          className={cn("btn", className)}
          data-variant={effectiveVariant}
          data-size={size}
          data-shape={shape}
          data-status={status}
          data-full-width={fullWidth ? "true" : undefined}
          data-booked={isBooked ? "true" : undefined}
          aria-busy={isLoading ? "true" : undefined}
          aria-disabled={disabled || isLoading ? "true" : undefined}
          tabIndex={disabled ? -1 : props.tabIndex}
          onClick={handleClick}
          {...(props as any)}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={props.type || "button"}
        disabled={disabled}
        className={cn("btn", className)}
        data-variant={effectiveVariant}
        data-size={size}
        data-shape={shape}
        data-status={status}
        data-full-width={fullWidth ? "true" : undefined}
        data-booked={isBooked ? "true" : undefined}
        aria-busy={isLoading ? "true" : undefined}
        aria-disabled={disabled || isLoading ? "true" : undefined}
        onClick={handleClick}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  size?: "sm" | "md" | "lg";
}

export const IconButton = React.forwardRef<any, IconButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    const sizeMap = {
      sm: "h-8 w-8 min-w-8 min-h-8 text-xs",
      md: "h-10 w-10 min-w-10 min-h-10 text-sm",
      lg: "h-12 w-12 min-w-12 min-h-12 text-base",
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size="icon"
        className={cn(sizeMap[size], className)}
        {...props}
      />
    );
  }
);

IconButton.displayName = "IconButton";
