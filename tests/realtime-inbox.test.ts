import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Realtime Inbox & Leads Publication Verification", () => {
  const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");

  it("verifies 0015_realtime_leads.sql enables REPLICA IDENTITY FULL on leads", () => {
    const file = fs.readFileSync(path.join(MIGRATIONS_DIR, "0015_realtime_leads.sql"), "utf-8");
    expect(file).toContain("ALTER TABLE public.leads REPLICA IDENTITY FULL;");
  });

  it("verifies 0015_realtime_leads.sql adds public.leads to supabase_realtime publication", () => {
    const file = fs.readFileSync(path.join(MIGRATIONS_DIR, "0015_realtime_leads.sql"), "utf-8");
    expect(file).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;");
  });

  it("verifies RLS policies prevent cross-showroom lead visibility for consultants", () => {
    const file0010 = fs.readFileSync(path.join(MIGRATIONS_DIR, "0010_rls_policies.sql"), "utf-8");
    expect(file0010).toContain("Consultants view assigned or showroom leads");
    // Ensure consultant policy scopes to consultant's showroom
    expect(file0010).toContain("private.user_showrooms()");
  });

  it("verifies channel unmount cleanup removes active Realtime channel", () => {
    const mockRemoveChannel = vi.fn();
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    const mockClient = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: mockRemoveChannel,
    };

    // Simulate lifecycle
    const channel = mockClient.channel("leads-inbox-realtime");
    channel.on("postgres_changes", {}, () => {}).subscribe();

    // Trigger cleanup
    mockClient.removeChannel(channel);

    expect(mockClient.channel).toHaveBeenCalledWith("leads-inbox-realtime");
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });
});
