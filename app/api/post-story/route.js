// app/api/post-story/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createStoryContainer,
  waitForContainerReady,
  publishContainer,
} from "../../../lib/instagram";

export async function POST(request) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("ig_access_token")?.value;
  const igUserId = cookieStore.get("ig_user_id")?.value;

  if (!accessToken || !igUserId) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  const { mediaUrl, mediaType } = await request.json();
  if (!mediaUrl) {
    return NextResponse.json({ error: "mediaUrl is required" }, { status: 400 });
  }

  try {
    const containerId = await createStoryContainer({
      igUserId,
      accessToken,
      mediaUrl,
      mediaType: mediaType || "IMAGE",
    });
    await waitForContainerReady({ containerId, accessToken });
    const mediaId = await publishContainer({ igUserId, accessToken, creationId: containerId });
    return NextResponse.json({ success: true, mediaId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
