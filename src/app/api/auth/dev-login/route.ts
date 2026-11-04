import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DEV_CREDENTIALS: Record<string, { email: string; pass: string }> = {
  buyer: { email: "dev-buyer@vrooma.in", pass: "VroomaDevPass2026!" },
  consultant: { email: "dev-consultant@vrooma.in", pass: "VroomaDevPass2026!" },
  manager: { email: "dev-manager@vrooma.in", pass: "VroomaDevPass2026!" },
  admin: { email: "dev-admin@vrooma.in", pass: "VroomaDevPass2026!" },
};

export async function POST(req: NextRequest) {
  // Strict guard: 404 if not development or dev login disabled
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ALLOW_DEV_LOGIN !== "true"
  ) {
    notFound();
  }

  try {
    const body = await req.json();
    const role = body.role as string;
    const creds = DEV_CREDENTIALS[role];

    if (!creds) {
      return NextResponse.json(
        { error: `Invalid role: ${role}. Choose buyer, consultant, manager, or admin.` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Auth client unavailable" }, { status: 500 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: creds.email,
      password: creds.pass,
    });

    if (error || !data.session) {
      return NextResponse.json(
        {
          error: error?.message || "Sign-in failed",
          hint: "Ensure you have seeded dev users using `node --experimental-strip-types scripts/seed-dev-users.ts`",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      role,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

