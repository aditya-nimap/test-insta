import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createMediaContainer,
  waitForContainerReady,
  publishContainer,
} from "../../../lib/instagram";

export async function POST(request) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("ig_access_token")?.value;
  const igUserId = cookieStore.get("ig_user_id")?.value;

  if (!accessToken || !igUserId) {
    return NextResponse.json(
      { error: "Not connected to Instagram. Visit /api/auth/login first." },
      { status: 401 }
    );
  }

  const { imageUrl, caption } = await request.json();

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  try {
    const containerId = await createMediaContainer({
      igUserId,
      accessToken,
      imageUrl,
      caption,
    });

    await waitForContainerReady({ containerId, accessToken });

    const mediaId = await publishContainer({
      igUserId,
      accessToken,
      creationId: containerId,
    });

    return NextResponse.json({ success: true, mediaId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
