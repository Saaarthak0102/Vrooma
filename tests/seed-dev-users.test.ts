/**
 * tests/seed-dev-users.test.ts
 *
 * Automated verification of DEV Auth user seeding workflow:
 *   1. Strict DEV project validation & fail-closed security.
 *   2. Production and legacy ref rejection.
 *   3. Persona structure & database enum validation.
 *   4. Existing Auth user reuse and ID preservation.
 *   5. Duplicate profile and showroom mapping prevention.
 *   6. Missing catalog showroom rejection.
 *   7. Partial failure handling & batch resilience.
 *   8. Correct role assignments across the 9 test personas.
 */

import { describe, it, expect, vi } from "vitest";
import {
  EXPECTED_DEV_PROJECT_REF,
  DEV_TEST_USERS,
  validateDevEnvironment,
  validatePersonas,
  seedDevUsers,
  type DevUser } from "@/../scripts/seed-dev-users";

describe("1. DEV Project Validation & Security Guards", () => {
  const validDevEnv = {
    APP_ENV: "development",
    NODE_ENV: "development",
    SUPABASE_PROJECT_REF: EXPECTED_DEV_PROJECT_REF,
    NEXT_PUBLIC_SUPABASE_URL: `https://${EXPECTED_DEV_PROJECT_REF}.supabase.co`,
    SUPABASE_SECRET_KEY: "sb_secret_test_key_dummy",
  };

  it("accepts valid DEV environment configuration", () => {
    const res = validateDevEnvironment(validDevEnv);
    expect(res.ok).toBe(true);
    expect(res.projectRef).toBe(EXPECTED_DEV_PROJECT_REF);
    expect(res.supabaseUrl).toBe(`https://${EXPECTED_DEV_PROJECT_REF}.supabase.co`);
  });

  it("rejects execution if APP_ENV is 'production'", () => {
    const res = validateDevEnvironment({
      ...validDevEnv,
      APP_ENV: "production",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("FATAL: Cannot seed dev users in a production environment");
  });

  it("rejects execution if NODE_ENV is 'production'", () => {
    const res = validateDevEnvironment({
      ...validDevEnv,
      NODE_ENV: "production",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("production");
  });

  it("rejects execution if SUPABASE_PROJECT_REF is missing", () => {
    const res = validateDevEnvironment({
      ...validDevEnv,
      SUPABASE_PROJECT_REF: "",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("SUPABASE_PROJECT_REF environment variable is required");
  });

  it("strictly rejects the current production project ref 'zdasktnbdjkjtoncojsy'", () => {
    const res = validateDevEnvironment({ ...validDevEnv, SUPABASE_PROJECT_REF: "zdasktnbdjkjtoncojsy" });
    expect(res.ok).toBe(false);
  });

  it("rejects a URL targeting the current production project", () => {
    const res = validateDevEnvironment({ ...validDevEnv, NEXT_PUBLIC_SUPABASE_URL: "https://zdasktnbdjkjtoncojsy.supabase.co" });
    expect(res.ok).toBe(false);
  });

  it("strictly rejects the retired production project ref 'ajumkjokagqfdikfguti'", () => {
    const res = validateDevEnvironment({
      ...validDevEnv,
      SUPABASE_PROJECT_REF: "ajumkjokagqfdikfguti",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("forbidden");
  });

  it("strictly rejects deleted legacy DEV project ref 'gmyrehlrmifxckszrdje'", () => {
    const res = validateDevEnvironment({
      ...validDevEnv,
      SUPABASE_PROJECT_REF: "gmyrehlrmifxckszrdje",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("forbidden");
  });

  it("rejects arbitrary non-DEV project reference", () => {
    const res = validateDevEnvironment({
      ...validDevEnv,
      SUPABASE_PROJECT_REF: "random-attacker-project",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("does not match expected DEV reference");
  });

  it("rejects missing NEXT_PUBLIC_SUPABASE_URL", () => {
    const res = validateDevEnvironment({
      ...validDevEnv,
      NEXT_PUBLIC_SUPABASE_URL: "",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("NEXT_PUBLIC_SUPABASE_URL is missing");
  });

  it("rejects NEXT_PUBLIC_SUPABASE_URL targeting production project", () => {
    const res = validateDevEnvironment({
      ...validDevEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://ajumkjokagqfdikfguti.supabase.co",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("does not match DEV project");
  });

  it("rejects arbitrary URL format", () => {
    const res = validateDevEnvironment({
      ...validDevEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://evil-spoof.example.com",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("not a valid Supabase project URL");
  });

  it("rejects missing SUPABASE_SECRET_KEY / SERVICE_ROLE_KEY", () => {
    const res = validateDevEnvironment({
      ...validDevEnv,
      SUPABASE_SECRET_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("SUPABASE_SECRET_KEY");
  });
});

describe("2. Canonical Nine Test Personas & Role Validation", () => {
  it("defines exactly 9 canonical personas", () => {
    expect(DEV_TEST_USERS).toHaveLength(9);
  });

  it("passes validation on all 9 canonical personas", () => {
    const res = validatePersonas(DEV_TEST_USERS);
    expect(res.ok).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("contains all expected persona roles", () => {
    const roles = DEV_TEST_USERS.map((u) => u.role);
    expect(roles.filter((r) => r === "buyer")).toHaveLength(1);
    expect(roles.filter((r) => r === "consultant")).toHaveLength(6);
    expect(roles.filter((r) => r === "manager")).toHaveLength(1);
    expect(roles.filter((r) => r === "admin")).toHaveLength(1);
  });

  it("ensures buyer has no showroom mapping (buyer isolation)", () => {
    const buyer = DEV_TEST_USERS.find((u) => u.role === "buyer");
    expect(buyer).toBeDefined();
    expect(buyer?.showroom_id).toBeUndefined();
  });

  it("ensures all consultants and managers have showroom assignments", () => {
    const staff = DEV_TEST_USERS.filter((u) => u.role === "consultant" || u.role === "manager");
    expect(staff.length).toBeGreaterThan(0);
    for (const member of staff) {
      expect(member.showroom_id).toBeDefined();
      expect(member.showroom_id).toMatch(/^a0000001-/);
    }
  });

  it("ensures all deterministic IDs are valid RFC 4122 hexadecimal UUIDs", () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    for (const user of DEV_TEST_USERS) {
      expect(user.id).toMatch(uuidRegex);
    }
  });

  it("ensures all phone numbers conform to Indian national standard +91[6-9][0-9]{9}", () => {
    const phoneRegex = /^\+91[6-9][0-9]{9}$/;
    for (const user of DEV_TEST_USERS) {
      expect(user.phone).toMatch(phoneRegex);
    }
  });

  it("rejects invalid role strings", () => {
    const invalidPersonas: DevUser[] = [
      {
        ...DEV_TEST_USERS[0],
        role: "superadmin" as any,
      },
    ];
    const res = validatePersonas(invalidPersonas);
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toContain("invalid role");
  });

  it("rejects duplicate user IDs", () => {
    const duplicateIdPersonas: DevUser[] = [
      DEV_TEST_USERS[0],
      {
        ...DEV_TEST_USERS[1],
        id: DEV_TEST_USERS[0].id,
      },
    ];
    const res = validatePersonas(duplicateIdPersonas);
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toContain("Duplicate user ID");
  });

  it("rejects duplicate emails", () => {
    const duplicateEmailPersonas: DevUser[] = [
      DEV_TEST_USERS[0],
      {
        ...DEV_TEST_USERS[1],
        email: DEV_TEST_USERS[0].email,
      },
    ];
    const res = validatePersonas(duplicateEmailPersonas);
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toContain("Duplicate email");
  });

  it("rejects buyer assigned to a showroom", () => {
    const buyerWithShowroom: DevUser[] = [
      {
        ...DEV_TEST_USERS[0],
        showroom_id: "a0000001-0000-0000-0000-000000000001",
      },
    ];
    const res = validatePersonas(buyerWithShowroom);
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toContain("Buyer dev-buyer@vrooma.in must not have a showroom_id assigned");
  });
});

describe("3. Idempotent Seeding Logic & Dependency Handling", () => {
  const mockShowrooms = [
    { id: "a0000001-0000-0000-0000-000000000001", name: "Hazratganj Flagship" },
    { id: "a0000001-0000-0000-0000-000000000002", name: "Gomti Nagar Experience Center" },
    { id: "a0000001-0000-0000-0000-000000000003", name: "Kanpur City Center" },
  ];

  function createMockSupabase(existingAuthUsers: any[] = []) {
    const createdUsers: any[] = [];
    const updatedUsers: any[] = [];
    const profilesUpserted: any[] = [];
    const staffShowroomsUpserted: any[] = [];

    return {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: existingAuthUsers },
            error: null,
          }),
          createUser: vi.fn().mockImplementation(async (params) => {
            const user = { id: params.id, email: params.email, user_metadata: params.user_metadata };
            createdUsers.push(user);
            return { data: { user }, error: null };
          }),
          updateUserById: vi.fn().mockImplementation(async (id, updates) => {
            updatedUsers.push({ id, ...updates });
            return { data: { user: { id } }, error: null };
          }),
        },
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "showrooms") {
          return {
            select: vi.fn().mockResolvedValue({ data: mockShowrooms, error: null }),
          };
        }
        if (table === "profiles") {
          return {
            upsert: vi.fn().mockImplementation((record, opts) => {
              profilesUpserted.push({ record, opts });
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === "staff_showrooms") {
          return {
            upsert: vi.fn().mockImplementation((record, opts) => {
              staffShowroomsUpserted.push({ record, opts });
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
      _spies: {
        createdUsers,
        updatedUsers,
        profilesUpserted,
        staffShowroomsUpserted,
      },
    };
  }

  it("provisions new users in Auth when they do not exist", async () => {
    const mockClient = createMockSupabase([]);
    const testSlice = DEV_TEST_USERS.slice(0, 3);

    const result = await seedDevUsers(mockClient, testSlice);

    expect(result.ok).toBe(true);
    expect(result.created).toBe(3);
    expect(result.reused).toBe(0);
    expect(result.profilesUpdated).toBe(3);
    expect(mockClient.auth.admin.createUser).toHaveBeenCalledTimes(3);
  });

  it("reuses existing Auth users without calling createUser", async () => {
    const existing = [
      { id: DEV_TEST_USERS[0].id, email: DEV_TEST_USERS[0].email },
      { id: "pre-existing-id-2", email: DEV_TEST_USERS[1].email },
    ];
    const mockClient = createMockSupabase(existing);
    const testSlice = DEV_TEST_USERS.slice(0, 2);

    const result = await seedDevUsers(mockClient, testSlice);

    expect(result.ok).toBe(true);
    expect(result.created).toBe(0);
    expect(result.reused).toBe(2);
    expect(mockClient.auth.admin.createUser).not.toHaveBeenCalled();
    // Does not overwrite password unnecessarily
    expect(mockClient.auth.admin.updateUserById).not.toHaveBeenCalled();
    // Profiles are synchronized with the preserved Auth ID
    expect(mockClient._spies.profilesUpserted[1].record.id).toBe("pre-existing-id-2");
  });

  it("updates passwords only when resetPasswords flag is explicitly enabled", async () => {
    const existing = [{ id: DEV_TEST_USERS[0].id, email: DEV_TEST_USERS[0].email }];
    const mockClient = createMockSupabase(existing);

    const result = await seedDevUsers(mockClient, [DEV_TEST_USERS[0]], { resetPasswords: true });

    expect(result.ok).toBe(true);
    expect(result.reused).toBe(1);
    expect(mockClient.auth.admin.updateUserById).toHaveBeenCalledWith(
      DEV_TEST_USERS[0].id,
      expect.objectContaining({ password: DEV_TEST_USERS[0].password })
    );
  });

  it("rejects seeding if referenced showroom does not exist in catalog", async () => {
    const mockClient = createMockSupabase([]);
    const unseededShowroomUser: DevUser = {
      ...DEV_TEST_USERS[1],
      showroom_id: "non-existent-showroom-id",
    };

    const result = await seedDevUsers(mockClient, [unseededShowroomUser]);

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Prerequisite showroom 'non-existent-showroom-id'");
    expect(mockClient.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("prevents duplicate showroom mappings using composite key upsert", async () => {
    const mockClient = createMockSupabase([]);
    const consultant = DEV_TEST_USERS.find((u) => u.role === "consultant")!;

    await seedDevUsers(mockClient, [consultant]);

    const call = mockClient._spies.staffShowroomsUpserted[0];
    expect(call).toBeDefined();
    expect(call.opts).toEqual({ onConflict: "profile_id,showroom_id" });
    expect(call.record.showroom_id).toBe(consultant.showroom_id);
  });

  it("handles partial failure without halting remaining users", async () => {
    const mockClient = createMockSupabase([]);
    // Make createUser fail for second user
    mockClient.auth.admin.createUser = vi
      .fn()
      .mockResolvedValueOnce({ data: { user: { id: DEV_TEST_USERS[0].id } }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "Rate limit exceeded" } })
      .mockResolvedValueOnce({ data: { user: { id: DEV_TEST_USERS[2].id } }, error: null });

    const testSlice = DEV_TEST_USERS.slice(0, 3);
    const result = await seedDevUsers(mockClient, testSlice);

    expect(result.ok).toBe(false);
    expect(result.created).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Rate limit exceeded");
    // Other users succeeded
    expect(result.profilesUpdated).toBe(2);
  });
});

