import { NextRequest, NextResponse } from "next/server";
import { profileUpdateSchema } from "@/lib/validation/profile";
import { updateUser, getUserById } from "@/server/repositories/users";
import { memoryStore } from "@/server/store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "usr-buyer-1";
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: user });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id = "usr-buyer-1", full_name, email, whatsapp, address, pincode } = parsed.data;

    const updated = await updateUser(id, {
      full_name,
      email,
      whatsapp,
      phone: whatsapp,
      address,
      pincode,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

