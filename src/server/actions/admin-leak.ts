"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";

export interface LeakMetricsResult {
  from: string;
  to: string;
  totalLeads: number;
  contactedInSla: number;
  slaCompliancePct: number;
  breachedCount: number;
  lostLeads: number;
  estimatedLostContributionINR: number;
  assumptions: {
    carsLostPerMonthDelayed: number;
    dealerMarginPerCarINR: number;
    monthlySalesLeakINR: number;
    annualSalesLeakINR: number;
    avgServiceBillINR: number;
    serviceMarginPct: number;
    monthlyServiceLeakINR: number;
    annualServiceLeakINR: number;
    totalAnnualLeakINR: number;
  };
}

/**
 * Dealership financial leakage constants derived directly from the brief.
 */
export const BRIEF_LEAK_CONSTANTS = {
  carsLostPerMonthDelayed: 54, // 1,350 delayed leads × 4% delta
  dealerMarginPerCarINR: 25000,
  monthlySalesLeakINR: 1350000, // ₹13.5 Lakh / month
  annualSalesLeakINR: 16200000, // ₹1.62 Crore / year
  avgServiceBillINR: 4500,
  serviceMarginPct: 30,
  monthlyServiceLeakINR: 405000, // ₹4.05 Lakh / month
  annualServiceLeakINR: 4860000, // ₹48.6 Lakh / year
  totalAnnualLeakINR: 21060000, // ₹2.11 Crore / year
};

/**
 * Server action to retrieve live Dealer Principal operational leakage metrics.
 * Calls get_leak_metrics RPC and blends historical brief baselines with live performance.
 */
export async function getLeakMetricsAction(
  from?: string,
  to?: string
): Promise<ActionResponse<LeakMetricsResult>> {
  try {
    await requireRole("admin", "manager");
    const admin = createAdminClient();
    const userClient = await createClient();

    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = to || new Date().toISOString();

    const { data, error } = await (userClient || admin).rpc("get_leak_metrics", {
      p_from: fromDate,
      p_to: toDate,
    });

    if (error) {
      return errorResponse("INTERNAL_ERROR", `Failed to compute leakage metrics: ${error.message}`);
    }

    const metrics = (data as any) || {};

    return successResponse({
      from: fromDate,
      to: toDate,
      totalLeads: metrics.total_leads || 0,
      contactedInSla: metrics.contacted_in_sla || 0,
      slaCompliancePct: Number(metrics.sla_compliance_pct || 100),
      breachedCount: (metrics.total_leads || 0) - (metrics.contacted_in_sla || 0),
      lostLeads: metrics.lost_leads || 0,
      estimatedLostContributionINR: Number(metrics.estimated_lost_dealer_contribution || 0),
      assumptions: BRIEF_LEAK_CONSTANTS,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not retrieve leak metrics.");
  }
}

