import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn();
const remove = vi.fn();
vi.mock("@/lib/server/admin-client", () => ({
  getAdminClient: () => ({ storage: { from: () => ({ upload, remove }) } }),
}));

import {
  contactImageObjectPath,
  isContactImagePathForContact,
  removeContactImage,
  uploadContactImage,
  validateContactImage,
} from "@/lib/server/contact-image-storage";

const userId = "29a5302e-d28f-4fb9-93c9-3937aca483f0";
const contactId = "5291e1b3-135a-4f11-8327-519bad37aa64";
const imageId = "3fc8fd91-ea9f-4950-a818-d0f0270c1efe";

describe("contact image storage", () => {
  beforeEach(() => {
    upload.mockReset();
    remove.mockReset();
  });

  it("creates and recognizes contact-scoped object paths", () => {
    const path = contactImageObjectPath(
      userId,
      contactId,
      imageId,
      "image/jpeg",
    );
    expect(path).toBe(`${userId}/${contactId}/${imageId}.jpg`);
    expect(isContactImagePathForContact(path, contactId)).toBe(true);
    expect(
      isContactImagePathForContact(
        `${userId}/0a755914-881b-43c0-90e5-9a3511dd1f66/${imageId}.jpg`,
        contactId,
      ),
    ).toBe(false);
  });

  it("recognizes legacy browser-upload paths for cleanup", () => {
    expect(
      isContactImagePathForContact(`${userId}/${imageId}.webp`, contactId),
    ).toBe(true);
  });

  it("validates image signatures instead of trusting the browser MIME type", async () => {
    const jpeg = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0x00])],
      "contact.png",
      { type: "image/png" },
    );
    await expect(validateContactImage(jpeg)).resolves.toMatchObject({
      mimeType: "image/jpeg",
    });

    const text = new File(["not an image"], "contact.jpg", {
      type: "image/jpeg",
    });
    await expect(validateContactImage(text)).resolves.toMatchObject({
      status: 415,
    });
  });

  it("uses the storage boundary for uploads and cleanup", async () => {
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]);
    await uploadContactImage("contact/image.jpg", bytes, "image/jpeg");
    await removeContactImage("contact/image.jpg");
    expect(upload).toHaveBeenCalledWith("contact/image.jpg", bytes, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    });
    expect(remove).toHaveBeenCalledWith(["contact/image.jpg"]);
  });
});
