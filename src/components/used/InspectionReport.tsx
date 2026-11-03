"use client";

import React from "react";
import { Inspection } from "@/types/domain";
import { InspectionSummaryCard } from "./InspectionSummaryCard";

export interface InspectionReportProps {
  inspection: Inspection;
  stockId: string;
  className?: string;
}

export { InspectionSummaryCard };

export function InspectionReport({ inspection, stockId, className }: InspectionReportProps) {
  return <InspectionSummaryCard inspection={inspection} stockId={stockId} className={className} />;
}
