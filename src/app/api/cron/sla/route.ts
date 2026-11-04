import { NextRequest, NextResponse } from "next/server";
import { listLeads } from "@/server/repositories/leads";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");

  if (env.CRON_SECRET && secret !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron execution" }, { status: 401 });
  }

  const now = Date.now();
  const newLeads = await listLeads({ status: "new" });
  const breachedLeads = newLeads.filter(
    (l) => l.status === "new" && new Date(l.sla_due_at).getTime() < now
  );

  return NextResponse.json({
    ok: true,
    data: {
      checkedAt: new Date().toISOString(),
      breachedCount: breachedLeads.length,
      leadIds: breachedLeads.map((l) => l.id),
    },
  });
}
