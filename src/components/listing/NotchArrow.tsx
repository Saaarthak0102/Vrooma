import React from "react";
import { ArrowRight } from "lucide-react";

export interface NotchArrowProps {
  className?: string;
  isBooked?: boolean;
}

export function NotchArrow({ className = "", isBooked = false }: NotchArrowProps) {
  return (
    <div className={`notch-arrow ${className}`} aria-hidden="true">
      {/* Concave filler square above arrow notch */}
      <span className="notch-arrow-filler-top" aria-hidden="true" />
      {/* Concave filler square to the left of arrow notch */}
      <span className="notch-arrow-filler-left" aria-hidden="true" />

      <div className={`notch-arrow-circle ${isBooked ? "opacity-60" : ""}`}>
        <ArrowRight className="notch-arrow-icon" />
      </div>
    </div>
  );
}

