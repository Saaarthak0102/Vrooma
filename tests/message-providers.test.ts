import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deliverMessage } from "@/server/services/message-providers";

describe("WhatsApp and SMS providers", () => {
  const originalEnv = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const k of ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_TEMPLATES", "MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"]) {
      delete process.env[k];
    }
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("skips (never 'sent') without keys and does not call the network", async () => {
    await expect(deliverMessage("whatsapp", "+919876543210", "x", "hi")).resolves.toMatchObject({ status: "skipped", reason: expect.stringMatching(/provider/i) });
    await expect(deliverMessage("sms", "+919876543210", "x", "hi")).resolves.toMatchObject({ status: "skipped", reason: expect.stringMatching(/provider/i) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends WhatsApp plain text to digits-only number when the template is not mapped", async () => {
    process.env.WHATSAPP_TOKEN = "tok";
    process.env.WHATSAPP_PHONE_ID = "123";
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(deliverMessage("whatsapp", "+91 98765 43210", "consultant_reply", "Hello")).resolves.toEqual({ status: "sent" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v21.0/123/messages");
    expect(init.headers.Authorization).toBe("Bearer tok");
    const sent = JSON.parse(init.body);
    expect(sent).toMatchObject({ to: "919876543210", type: "text", text: { body: "Hello" } });
  });

  it("sends a mapped WhatsApp template with the text as its body variable", async () => {
    process.env.WHATSAPP_TOKEN = "tok";
    process.env.WHATSAPP_PHONE_ID = "123";
    process.env.WHATSAPP_TEMPLATES = JSON.stringify({ booking_confirmation: { name: "booking_confirmed", language: "en" } });
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await deliverMessage("whatsapp", "+919876543210", "booking_confirmation", "Booked for 5 pm");

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.type).toBe("template");
    expect(sent.template.name).toBe("booking_confirmed");
    expect(sent.template.components[0].parameters[0].text).toBe("Booked for 5 pm");
  });

  it("throws on a provider error so the outbox retries instead of marking it sent", async () => {
    process.env.WHATSAPP_TOKEN = "tok";
    process.env.WHATSAPP_PHONE_ID = "123";
    fetchMock.mockResolvedValue(new Response('{"error":{"code":131047}}', { status: 400 }));
    await expect(deliverMessage("whatsapp", "+919876543210", "x", "hi")).rejects.toThrow(/WhatsApp API error \(400\)/);
  });

  it("sends SMS through the MSG91 flow and treats a 200 'error' body as a failure", async () => {
    process.env.MSG91_AUTH_KEY = "key";
    process.env.MSG91_TEMPLATE_ID = "tpl";
    fetchMock.mockResolvedValueOnce(new Response('{"type":"success"}', { status: 200 }));
    await expect(deliverMessage("sms", "+919876543210", "x", "Your slot is confirmed")).resolves.toEqual({ status: "sent" });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent).toMatchObject({ template_id: "tpl", recipients: [{ mobiles: "919876543210", VAR1: "Your slot is confirmed" }] });
    expect(fetchMock.mock.calls[0][1].headers.authkey).toBe("key");

    fetchMock.mockResolvedValueOnce(new Response('{"type":"error","message":"template not approved"}', { status: 200 }));
    await expect(deliverMessage("sms", "+919876543210", "x", "hi")).rejects.toThrow(/MSG91 API error/);
  });
});
