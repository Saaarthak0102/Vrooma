import { NextRequest, NextResponse } from "next/server";
import { profileUpdateSchema } from "@/lib/validation/profile";
import { updateUser, getUserById } from "@/server/repositories/users";
import { guardUser } from "@/server/auth/api-guard";

/** The target profile is ALWAYS the signed-in user. An id in the query or body is ignored. */
export async function GET() {
  const session = await guardUser();
  if (!session.ok) return session.response;

  try {
    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: user });
  } catch (err: any) {
    console.error("[api/me/profile] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await guardUser();
  if (!session.ok) return session.response;

  try {
    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { full_name, whatsapp } = parsed.data;

    // Only contact fields. Role, is_active and email are never writable here.
    const updated = await updateUser(session.user.id, {
      full_name,
      whatsapp,
      phone: whatsapp,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    console.error("[api/me/profile] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
