// lib/instagram.js
//
// Thin wrapper around the "Instagram API with Instagram Login" flow.
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
//
// Flow implemented here:
//   1. buildAuthUrl()               -> send the user to Instagram to approve access
//   2. exchangeCodeForToken(code)   -> trade the ?code= for a short-lived token
//   3. getLongLivedToken(token)     -> trade short-lived (1hr) for long-lived (60 days)
//   4. getInstagramUser(token)      -> get the ig-user-id needed for publishing
//   5. createMediaContainer(...)    -> upload/reference the media, get a container id
//   6. waitForContainerReady(...)   -> poll until Instagram finishes processing it
//   7. publishContainer(...)        -> publish the container -> live post

const GRAPH_VERSION = "v22.0";

const APP_ID = process.env.INSTAGRAM_APP_ID;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI;

// Scopes needed to read the profile and publish content.
// (Older scope names like "instagram_content_publish" were deprecated - use the "business_" prefixed ones.)
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
].join(",");

export function buildAuthUrl(state = "") {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
    code,
  });

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  }
  // data => { access_token, user_id, permissions }
  return data;
}

export async function getLongLivedToken(shortLivedToken) {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: APP_SECRET,
    access_token: shortLivedToken,
  });

  const res = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Long-lived token exchange failed: ${JSON.stringify(data)}`);
  }
  // data => { access_token, token_type, expires_in } (expires_in ~ 60 days, in seconds)
  return data;
}

// Call this before the 60-day long-lived token expires to get a fresh 60-day token.
// Token must already be at least 24 hours old to be refreshable.
export async function refreshLongLivedToken(longLivedToken) {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: longLivedToken,
  });

  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?${params.toString()}`
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function getInstagramUser(accessToken) {
  const params = new URLSearchParams({
    fields: "user_id,username",
    access_token: accessToken,
  });
  const res = await fetch(
    `https://graph.instagram.com/${GRAPH_VERSION}/me?${params.toString()}`
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Fetching IG user failed: ${JSON.stringify(data)}`);
  }
  // data => { user_id, username, id }
  return data;
}

// image_url must be a publicly reachable HTTPS URL to a JPEG image.
// For video/reels, swap image_url for video_url and set media_type: "REELS".
export async function createMediaContainer({
  igUserId,
  accessToken,
  imageUrl,
  caption,
}) {
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption: caption || "",
    access_token: accessToken,
  });

  const res = await fetch(
    `https://graph.instagram.com/${GRAPH_VERSION}/${igUserId}/media`,
    { method: "POST", body: params }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Container creation failed: ${JSON.stringify(data)}`);
  }
  // data => { id: "<creation_id>" }
  return data.id;
}

export async function getContainerStatus({ containerId, accessToken }) {
  const params = new URLSearchParams({
    fields: "status_code",
    access_token: accessToken,
  });
  const res = await fetch(
    `https://graph.instagram.com/${GRAPH_VERSION}/${containerId}?${params.toString()}`
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Container status check failed: ${JSON.stringify(data)}`);
  }
  return data.status_code; // IN_PROGRESS | FINISHED | PUBLISHED | ERROR | EXPIRED
}

// Polls the container until Instagram finishes processing the media (or times out).
export async function waitForContainerReady({
  containerId,
  accessToken,
  timeoutMs = 60000,
  intervalMs = 2000,
}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getContainerStatus({ containerId, accessToken });
    if (status === "FINISHED") return true;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`Container failed to process (status: ${status})`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for media container to finish processing");
}

export async function publishContainer({ igUserId, accessToken, creationId }) {
  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });

  const res = await fetch(
    `https://graph.instagram.com/${GRAPH_VERSION}/${igUserId}/media_publish`,
    { method: "POST", body: params }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Publish failed: ${JSON.stringify(data)}`);
  }
  // data => { id: "<media_id>" }
  return data.id;
}
