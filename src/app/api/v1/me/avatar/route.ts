import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { getUserAvatarPublicUrl } from "@/lib/supabase/user-avatar-public-url";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const type = (file.type || "").toLowerCase();
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 5 MB)." }, { status: 400 });
  }

  const { user } = gate.context;

  try {
    await services.auth.replaceUserAvatar({
      userId: user.id,
      file,
      previousAvatarStorageKey: user.avatarStorageKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload avatar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const updated = await services.auth.findByAuthUserId(user.id);
  if (!updated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = updated.user.avatarStorageKey;
  return NextResponse.json({
    ok: true as const,
    avatarStorageKey: key ?? null,
    avatarUrl: key ? getUserAvatarPublicUrl(key) : null,
  });
}
