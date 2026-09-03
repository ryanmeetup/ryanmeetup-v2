import { beforeEach, describe, expect, it, vi } from "vitest";

const authorize = vi.fn();
const removeContactImage = vi.fn();
const uploadContactImage = vi.fn();
const validateContactImage = vi.fn();

vi.mock("@/lib/server/auth", () => ({ authorize }));
vi.mock("@/lib/server/contact-image-storage", () => ({
  CONTACT_IMAGE_BUCKET: "organization-images",
  MAX_CONTACT_IMAGE_SIZE: 5 * 1024 * 1024,
  contactImageObjectPath: () => "user-1/contact-1/image-1.jpg",
  isContactImagePathForContact: () => true,
  removeContactImage,
  uploadContactImage,
  validateContactImage,
}));

const validContact = {
  displayName: "Example Partner",
  imageUrl: "",
  retainImage: false,
  contactGroup: "Brand Partner",
  notes: "",
  categoryIds: [],
  newCategoryNames: [],
  people: [],
};

function request() {
  const body = new FormData();
  body.set("contact", JSON.stringify(validContact));
  body.set(
    "file",
    new File([new Uint8Array([0xff, 0xd8, 0xff])], "partner.jpg", {
      type: "image/jpeg",
    }),
  );
  return new Request("http://localhost/api/contacts", {
    method: "POST",
    headers: { origin: "http://localhost" },
    body,
  });
}

describe("POST /api/contacts", () => {
  beforeEach(() => {
    authorize.mockReset();
    removeContactImage.mockReset();
    uploadContactImage.mockReset();
    validateContactImage.mockReset();
    process.env.TASKS_APP_URL = "http://localhost";
  });

  it("removes a newly uploaded image when the atomic contact save fails", async () => {
    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "contact write failed" },
    });
    authorize.mockResolvedValue({
      user: { id: "user-1" },
      supabase: {
        from: vi.fn(),
        rpc,
      },
    });
    validateContactImage.mockResolvedValue({
      bytes: new Uint8Array([0xff, 0xd8, 0xff]),
      mimeType: "image/jpeg",
    });
    uploadContactImage.mockResolvedValue({ error: null });
    removeContactImage.mockResolvedValue(null);

    const { POST } = await import("@/app/api/contacts/route");
    const response = await POST(request());
    expect(response).toBeDefined();
    if (!response) throw new Error("The contact route returned no response.");

    expect(response.status).toBe(500);
    expect(uploadContactImage).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith(
      "save_contact_with_methods",
      expect.objectContaining({ people: [] }),
    );
    expect(removeContactImage).toHaveBeenCalledOnce();
    expect(removeContactImage).toHaveBeenCalledWith(
      "user-1/contact-1/image-1.jpg",
    );
    expect(await response.json()).toMatchObject({
      code: "OPERATION_FAILED",
      error: "The contact could not be saved. Try again.",
    });
    errorLog.mockRestore();
  });
});
