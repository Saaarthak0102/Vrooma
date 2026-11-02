import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";

const newsletterSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must provide explicit consent to receive updates" }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = newsletterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    if (env.NEXT_PUBLIC_USE_MOCK) {
      const exists = memoryStore.subscribers.some(
        (s) => s.email.toLowerCase() === email.toLowerCase()
      );
      if (exists) {
        return NextResponse.json({
          ok: true,
          message: "You are already subscribed to Vrooma showroom updates.",
        });
      }

      memoryStore.subscribers.push({
        id: `sub-${Date.now()}`,
        email: email.toLowerCase(),
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        message: "Successfully subscribed to verified showroom updates.",
      });
    }

    // Supabase mode
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: email.toLowerCase(),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({
          ok: true,
          message: "You are already subscribed to Vrooma showroom updates.",
        });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Successfully subscribed to verified showroom updates.",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
