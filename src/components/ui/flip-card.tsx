// Adapted from React Bits FlipCard (reactbits.dev), MIT + Commons Clause.
"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useId,
  useCallback,
} from "react";
import {
  motion,
  useSpring,
  useMotionValue,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface FlipCardContextValue {
  flipped: boolean;
  flip: (source?: "toggle" | "pointer" | "escape") => void;
  backId: string;
  frontToggleRef: React.RefObject<HTMLButtonElement | null>;
  backToggleRef: React.RefObject<HTMLButtonElement | null>;
}

export const FlipCardContext = createContext<FlipCardContextValue | null>(null);

export function useFlipCardContext() {
  const ctx = useContext(FlipCardContext);
  if (!ctx) {
    throw new Error("useFlipCardContext must be used within a FlipCard");
  }
  return ctx;
}

export interface FlipToggleProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  face?: "front" | "back";
  children?: React.ReactNode;
}

export const FlipToggle = React.forwardRef<HTMLButtonElement, FlipToggleProps>(
  ({ label, face = "front", children, className, onClick, ...props }, ref) => {
    const ctx = useContext(FlipCardContext);
    const toggleRef = face === "front" ? ctx?.frontToggleRef : ctx?.backToggleRef;

    const handleRef = useCallback(
      (node: HTMLButtonElement | null) => {
        if (toggleRef) {
          (toggleRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }
      },
      [ref, toggleRef]
    );

    return (
      <button
        ref={handleRef}
        type="button"
        data-no-flip="true"
        aria-expanded={ctx?.flipped ?? false}
        aria-controls={ctx?.backId}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          ctx?.flip("toggle");
          onClick?.(e);
        }}
        className={cn(
          "min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
          className
        )}
        {...props}
      >
        {children || label}
      </button>
    );
  }
);
FlipToggle.displayName = "FlipToggle";

export interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  defaultFlipped?: boolean;
  flipOnClick?: boolean;
  draggable?: boolean;
  dragDistance?: number;
  axis?: "x" | "y";
  direction?: "normal" | "reverse";
  perspective?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  tilt?: boolean;
  tiltMaxAngle?: number;
  tiltReverse?: boolean;
  glare?: boolean;
  glareOpacity?: number;
  glareColor?: string;
  hoverScale?: number;
  shadow?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
  radius?: number;
  minHeight?: string | number;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function FlipCard({
  front,
  back,
  flipped: controlledFlipped,
  onFlip,
  defaultFlipped = false,
  flipOnClick = true,
  draggable = false,
  dragDistance = 0,
  axis = "y",
  direction = "normal",
  perspective = 1200,
  stiffness = 200,
  damping = 26,
  mass = 1,
  tilt = false,
  tiltMaxAngle = 12,
  tiltReverse = false,
  glare = false,
  glareOpacity = 0.15,
  glareColor = "#ffffff",
  hoverScale = 1,
  shadow = true,
  shadowColor = "#0F1720",
  shadowOpacity = 0.1,
  radius = 24,
  minHeight,
  ariaLabel,
  className,
  style,
}: FlipCardProps) {
  const generatedId = useId();
  const backId = `flip-back-${generatedId.replace(/:/g, "")}`;
  const shouldReduceMotion = useReducedMotion();

  const isControlled = typeof controlledFlipped === "boolean";
  const [internalFlipped, setInternalFlipped] = useState(defaultFlipped);
  const isFlipped = isControlled ? controlledFlipped : internalFlipped;

  const rootRef = useRef<HTMLDivElement>(null);
  const frontToggleRef = useRef<HTMLButtonElement | null>(null);
  const backToggleRef = useRef<HTMLButtonElement | null>(null);
  const lastFlipSourceRef = useRef<"toggle" | "pointer" | "escape" | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  // M9: Keep track of target rotation safely in effects
  const targetAngle = isFlipped
    ? direction === "reverse"
      ? -180
      : 180
    : 0;

  const rotateDeg = useMotionValue(targetAngle);
  const springRotate = useSpring(rotateDeg, { stiffness, damping, mass });

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springTiltX = useSpring(tiltX, { stiffness: 300, damping: 30 });
  const springTiltY = useSpring(tiltY, { stiffness: 300, damping: 30 });

  const scaleVal = useMotionValue(1);
  const springScale = useSpring(scaleVal, { stiffness: 400, damping: 30 });

  // Update target rotation when flipped state changes
  useEffect(() => {
    setIsFlipping(true);
    rotateDeg.set(targetAngle);

    // M8: Clear flipping state when settled
    const timer = setTimeout(() => {
      setIsFlipping(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [targetAngle, rotateDeg]);

  const flip = useCallback(
    (source: "toggle" | "pointer" | "escape" = "pointer") => {
      lastFlipSourceRef.current = source;
      const next = !isFlipped;
      if (!isControlled) {
        setInternalFlipped(next);
      }
      onFlip?.(next);
    },
    [isFlipped, isControlled, onFlip]
  );

  // M5 Focus restoration after flip started from inside the card
  useEffect(() => {
    const source = lastFlipSourceRef.current;
    if (source === "toggle" || source === "escape") {
      // Focus the toggle on the face that is now visible
      const timer = setTimeout(() => {
        if (isFlipped) {
          backToggleRef.current?.focus();
        } else {
          frontToggleRef.current?.focus();
        }
        lastFlipSourceRef.current = null;
      }, 50);
      return () => clearTimeout(timer);
    }
    lastFlipSourceRef.current = null;
  }, [isFlipped]);

  // M3: Check if event target is an interactive child
  const isInteractiveChild = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;
    const closest = target.closest(
      'a,button,input,select,textarea,label,summary,[role="button"],[role="link"],[data-no-flip]'
    );
    return !!(closest && closest !== rootRef.current && rootRef.current?.contains(closest));
  };

  // Drag handling
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragSpan = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isInteractiveChild(e.target)) return;

    if (draggable) {
      isDraggingRef.current = true;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      // M2: Measure rootRef offset dimensions
      dragSpan.current =
        dragDistance > 0
          ? dragDistance
          : axis === "y"
            ? rootRef.current?.offsetWidth || 300
            : rootRef.current?.offsetHeight || 400;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isInteractiveChild(e.target)) return;

    // Tilt handling (fine pointers only)
    if (tilt && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      const factor = tiltReverse ? -1 : 1;
      tiltX.set(ny * -tiltMaxAngle * factor);
      tiltY.set(nx * tiltMaxAngle * factor);
    }

    // Drag rotation
    if (draggable && isDraggingRef.current) {
      const delta =
        axis === "y"
          ? e.clientX - dragStartPos.current.x
          : e.clientY - dragStartPos.current.y;
      const span = dragSpan.current || 300;
      const progress = delta / span;
      const dragAngle = targetAngle + progress * 180;
      rotateDeg.set(dragAngle);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isInteractiveChild(e.target)) return;

    if (draggable && isDraggingRef.current) {
      isDraggingRef.current = false;
      const delta =
        axis === "y"
          ? e.clientX - dragStartPos.current.x
          : e.clientY - dragStartPos.current.y;
      const span = dragSpan.current || 300;
      if (Math.abs(delta) > span * 0.25) {
        flip("pointer");
      } else {
        rotateDeg.set(targetAngle);
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractiveChild(e.target)) return;
    // M4: Remove the keyboard (detail===0) click flip
    if (e.detail === 0) return;

    if (flipOnClick && !draggable) {
      flip("pointer");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isInteractiveChild(e.target)) return;

    // M5: Escape while focus is inside a flipped card flips it back and focuses front toggle
    if (e.key === "Escape" && isFlipped) {
      e.preventDefault();
      flip("escape");
    }
  };

  const handlePointerEnter = () => {
    if (hoverScale !== 1) scaleVal.set(hoverScale);
  };

  const handlePointerLeave = () => {
    if (hoverScale !== 1) scaleVal.set(1);
    if (tilt) {
      tiltX.set(0);
      tiltY.set(0);
    }
    if (draggable) {
      isDraggingRef.current = false;
      rotateDeg.set(targetAngle);
    }
  };

  // Transform expressions for rotor
  const rotateXTransform = useTransform(
    [springRotate, springTiltX],
    ([r, tx]) => (axis === "x" ? (r as number) : (tx as number))
  );
  const rotateYTransform = useTransform(
    [springRotate, springTiltY],
    ([r, ty]) => (axis === "y" ? (r as number) : (ty as number))
  );

  const contextValue: FlipCardContextValue = {
    flipped: isFlipped,
    flip,
    backId,
    frontToggleRef,
    backToggleRef,
  };

  const hexAlpha = Math.round(shadowOpacity * 255)
    .toString(16)
    .padStart(2, "0");

  return (
    <FlipCardContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        role="group"
        aria-roledescription="flip card"
        aria-label={ariaLabel}
        data-flipping={isFlipping ? "true" : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative w-full max-w-full h-full touch-pan-y",
          "[@media(hover:hover)_and_(pointer:fine)]:cursor-pointer",
          className
        )}
        style={{
          perspective: `${perspective}px`,
          minHeight,
          ...style,
        }}
      >
        {/* M1 Shadow span stays absolute */}
        {shadow && (
          <span
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none transition-shadow duration-300"
            style={{
              borderRadius: `${radius}px`,
              boxShadow: `0 4px 20px -2px ${shadowColor}${hexAlpha}`,
            }}
          />
        )}

        {/* Rotor with display:grid, M1 & M8 */}
        <motion.div
          data-flipping={isFlipping ? "true" : undefined}
          className="w-full h-full grid"
          style={{
            gridTemplateColumns: "1fr",
            gridTemplateRows: "1fr",
            transformStyle: "preserve-3d",
            rotateX: shouldReduceMotion ? 0 : rotateXTransform,
            rotateY: shouldReduceMotion ? 0 : rotateYTransform,
            scale: hoverScale !== 1 ? springScale : 1,
            willChange: isFlipping ? "transform" : "auto",
          }}
        >
          {/* Front Face: M1, M7, M10 */}
          <div
            inert={isFlipped ? true : undefined}
            aria-hidden={isFlipped}
            className="w-full h-full flex flex-col overflow-hidden p-0.5"
            style={{
              gridArea: "1 / 1",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
              borderRadius: `${radius}px`,
              background:
                "linear-gradient(180deg, #FFFFFF 0%, #FAFAF9 100%)",
              border: "1px solid var(--border)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.95)",
              color: "var(--ink)",
              opacity: shouldReduceMotion ? (isFlipped ? 0 : 1) : 1,
              transition: shouldReduceMotion ? "opacity 0.25s ease" : undefined,
              pointerEvents: isFlipped ? "none" : "auto",
            }}
          >
            {front}
          </div>

          {/* Back Face: M1, M7, M10 */}
          <div
            id={backId}
            inert={!isFlipped ? true : undefined}
            aria-hidden={!isFlipped}
            className="w-full h-full flex flex-col overflow-hidden p-0.5"
            style={{
              gridArea: "1 / 1",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: shouldReduceMotion
                ? "none"
                : axis === "y"
                  ? "rotateY(180deg)"
                  : "rotateX(180deg)",
              borderRadius: `${radius}px`,
              background:
                "linear-gradient(180deg, #FFFFFF 0%, #FAFAF9 100%)",
              border: "1px solid var(--border)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.95)",
              color: "var(--ink)",
              opacity: shouldReduceMotion ? (isFlipped ? 1 : 0) : 1,
              transition: shouldReduceMotion ? "opacity 0.25s ease" : undefined,
              pointerEvents: !isFlipped ? "none" : "auto",
            }}
          >
            {back}
          </div>

          {/* Glare overlay */}
          {glare && (
            <span
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none rounded-[inherit]"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${glareColor} 0%, transparent 70%)`,
                opacity: isFlipping ? glareOpacity : 0,
                transition: "opacity 0.2s ease",
              }}
            />
          )}
        </motion.div>
      </div>
    </FlipCardContext.Provider>
  );
}
