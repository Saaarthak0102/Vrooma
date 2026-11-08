import { beforeEach, describe, expect, it, vi } from "vitest";

import { replyChannel, replyTarget, whatsappConnected } from "@/server/services/channels";

describe("which channel a reply goes out on", () => {
  const keys = { WHATSAPP_TOKEN: "t", WHATSAPP_PHONE_ID: "p" };

  it("is email until the WhatsApp keys exist, then WhatsApp, with no other change", () => {
    expect(replyChannel({})).toBe("email");
    expect(replyChannel({ WHATSAPP_TOKEN: "t" })).toBe("email"); // half a setup is not a setup
    expect(replyChannel(keys)).toBe("whatsapp");
    expect(whatsappConnected(keys)).toBe(true);
    expect(whatsappConnected({})).toBe(false);
  });

  it("can be forced either way with NOTIFY_CHANNEL", () => {
    expect(replyChannel({ ...keys, NOTIFY_CHANNEL: "email" })).toBe("email");
    expect(replyChannel({ NOTIFY_CHANNEL: "whatsapp" })).toBe("whatsapp");
    expect(replyChannel({ ...keys, NOTIFY_CHANNEL: "auto" })).toBe("whatsapp");
    expect(replyChannel({ NOTIFY_CHANNEL: " EMAIL " })).toBe("email");
    expect(replyChannel({ NOTIFY_CHANNEL: "garbage" })).toBe("email"); // unknown value behaves like auto
  });

  it("never addresses an email to a phone number", () => {
    expect(replyTarget({ email: "a@b.in", phone: "+919001000001" }, {})).toEqual({ channel: "email", address: "a@b.in" });
    expect(replyTarget({ email: null, phone: "+919001000001" }, {})).toEqual({ channel: "email", address: null });
    expect(replyTarget({ email: "not an email", phone: "+919001000001" }, {})).toEqual({ channel: "email", address: null });
    expect(replyTarget({ email: " a@b.in ", phone: null }, {}).address).toBe("a@b.in");
  });

  it("uses the phone on WhatsApp", () => {
    expect(replyTarget({ email: "a@b.in", phone: "+919001000001" }, keys)).toEqual({ channel: "whatsapp", address: "+919001000001" });
    expect(replyTarget({ email: "a@b.in", phone: "" }, keys).address).toBeNull();
  });
});

/* ------------------------------------------------------------------------------------------------------------- */

const inserts: { table: string; row: any }[] = [];
const rpcCalls: string[] = [];
let leadRow: any;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: leadRow, error: null }) }) }),
      insert: async (row: any) => {
        inserts.push({ table, row });
        return { error: null };
      },
    }),
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (name: string) => {
      rpcCalls.push(name);
      return { error: null };
    },
  }),
}));
vi.mock("@/server/auth/viewer", () => ({
  requireRole: async () => ({ user: { id: "c1" }, profile: { id: "c1", role: "consultant", full_name: "Dev Consultant" } }),
}));

describe("sendLeadReplyAction channel", () => {
  beforeEach(() => {
    inserts.length = 0;
    rpcCalls.length = 0;
    leadRow = { id: "lead-1", ref: "LD-1", name: "Buyer", phone: "+919001000001", email: "buyer@example.com", status: "new", assigned_to: "c1", ai_draft: null };
    delete process.env.WHATSAPP_TOKEN;
    delete process.env.WHATSAPP_PHONE_ID;
    delete process.env.NOTIFY_CHANNEL;
  });

  it("sends by email to the buyer's address while WhatsApp is not connected, and stops the SLA timer", async () => {
    const { sendLeadReplyAction } = await import("@/server/actions/leads");
    const res = await sendLeadReplyAction("lead-1", "Namaste, happy to help with the Model H.");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.channel).toBe("email");
    const outbox = inserts.find((i) => i.table === "messages_outbox")!.row;
    expect(outbox).toMatchObject({ channel: "email", to_address: "buyer@example.com", template: "consultant_reply" });
    expect(rpcCalls).toContain("set_lead_status");
  });

  it("goes to WhatsApp, to the phone, as soon as the keys are set (no other change)", async () => {
    process.env.WHATSAPP_TOKEN = "t";
    process.env.WHATSAPP_PHONE_ID = "p";
    const { sendLeadReplyAction } = await import("@/server/actions/leads");
    const res = await sendLeadReplyAction("lead-1", "Namaste, happy to help with the Model H.");
    expect(res.ok && res.data.channel).toBe("whatsapp");
    expect(inserts.find((i) => i.table === "messages_outbox")!.row).toMatchObject({ channel: "whatsapp", to_address: "+919001000001" });
  });

  it("refuses, queues nothing and leaves the lead new when there is no email to send to", async () => {
    leadRow.email = null;
    const { sendLeadReplyAction } = await import("@/server/actions/leads");
    const res = await sendLeadReplyAction("lead-1", "Namaste, happy to help with the Model H.");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.message).toMatch(/no email address/i);
    expect(inserts.find((i) => i.table === "messages_outbox")).toBeUndefined();
    expect(rpcCalls).toEqual([]);
  });
});
