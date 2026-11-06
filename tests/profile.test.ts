import { describe, it, expect, beforeEach } from "vitest";
import { profileUpdateSchema } from "@/lib/validation/profile";
import { updateUser, getUserById } from "@/server/repositories/users";
import { memoryStore } from "@/server/store";
import { mockUsers } from "@/data/mock/users";

describe("Profile Validation Schema", () => {
  const validProfile = {
    full_name: "Aditya Mishra",
    email: "buyer@vrooma.in",
    whatsapp: "+91 98765 00001",
  };

  it("accepts a fully valid Indian profile payload", () => {
    const res = profileUpdateSchema.safeParse(validProfile);
    expect(res.success).toBe(true);
  });

  it("accepts a 10-digit WhatsApp number without +91 prefix", () => {
    const res = profileUpdateSchema.safeParse({
      ...validProfile,
      whatsapp: "9876500001",
    });
    expect(res.success).toBe(true);
  });

  it("rejects an invalid WhatsApp number", () => {
    const res = profileUpdateSchema.safeParse({
      ...validProfile,
      whatsapp: "12345",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.whatsapp).toBeDefined();
    }
  });

  it("rejects an invalid email format", () => {
    const res = profileUpdateSchema.safeParse({
      ...validProfile,
      email: "not-an-email",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it("rejects empty or short full name", () => {
    const res = profileUpdateSchema.safeParse({
      ...validProfile,
      full_name: "A",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.full_name).toBeDefined();
    }
  });

  it("no longer carries an address or pincode (they are asked in the booking forms)", () => {
    const res = profileUpdateSchema.safeParse({ ...validProfile, address: "Home", pincode: "x" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).not.toHaveProperty("address");
      expect(res.data).not.toHaveProperty("pincode");
    }
  });
});

describe("User Profile Repository & Persistence", () => {
  beforeEach(() => {
    memoryStore.users = [...mockUsers];
  });

  it("updates existing buyer profile and returns updated record", async () => {
    const updated = await updateUser("usr-buyer-1", {
      full_name: "Aditya Sharma",
    });

    expect(updated.full_name).toBe("Aditya Sharma");

    const fetched = await getUserById("usr-buyer-1");
    expect(fetched?.full_name).toBe("Aditya Sharma");
  });

  it("throws error when updating non-existent user", async () => {
    await expect(
      updateUser("usr-non-existent", { full_name: "Ghost" })
    ).rejects.toThrow("User not found");
  });
});

