import { NextRequest, NextResponse } from "next/server";
import { memoryStore } from "@/server/store";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");

  if (env.CRON_SECRET && secret !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron execution" }, { status: 401 });
  }

  const now = Date.now();
  const breachedLeads = memoryStore.leads.filter(
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
