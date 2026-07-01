"use client";

import { useState } from "react";

export default function Home() {
  const [mode, setMode] = useState("feed"); // "feed" | "story"
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaType, setMediaType] = useState("IMAGE"); // "IMAGE" | "VIDEO" (stories only)
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const connected = params.get("connected") === "1";
  const error = params.get("error");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const endpoint = mode === "story" ? "/api/post-story" : "/api/post";
      const body =
        mode === "story"
          ? { mediaUrl, mediaType }
          : { imageUrl: mediaUrl, caption };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setStatus({ ok: true, mediaId: data.mediaId });
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    } finally {
      setLoading(false);
    }
  }

  const toggleStyle = (active) => ({
    padding: "8px 20px",
    cursor: "pointer",
    border: "1px solid #ccc",
    background: active ? "#1a1a1a" : "#f5f5f5",
    color: active ? "#fff" : "#333",
    fontWeight: active ? 600 : 400,
    borderRadius: 4,
  });

  return (
    <main style={{ maxWidth: 480, margin: "60px auto", padding: "0 20px" }}>
      <h1>Instagram Poster</h1>

      {error && (
        <p style={{ color: "crimson" }}>
          Connection error: {decodeURIComponent(error)}
        </p>
      )}
      {connected && (
        <p style={{ color: "green" }}>Instagram account connected ✅</p>
      )}

      <a href="/api/auth/login">
        <button style={{ padding: "10px 16px", marginBottom: 24 }}>
          Connect Instagram Account
        </button>
      </a>

      {/* Feed / Story toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button style={toggleStyle(mode === "feed")} onClick={() => setMode("feed")}>
          📷 Feed Post
        </button>
        <button style={toggleStyle(mode === "story")} onClick={() => setMode("story")}>
          ⭕ Story
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            {mode === "story"
              ? "Media URL (HTTPS, publicly reachable)"
              : "Public image URL (JPEG)"}
            <input
              type="url"
              required
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={
                mode === "story"
                  ? "https://example.com/story.jpg"
                  : "https://example.com/photo.jpg"
              }
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
        </div>

        {/* Story-only: media type selector */}
        {mode === "story" && (
          <div style={{ marginBottom: 12 }}>
            <label>
              Media type
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%" }}
              >
                <option value="IMAGE">Image (9:16 recommended)</option>
                <option value="VIDEO">Video (MP4/H.264, max 60 s)</option>
              </select>
            </label>
          </div>
        )}

        {/* Feed-only: caption */}
        {mode === "feed" && (
          <div style={{ marginBottom: 12 }}>
            <label>
              Caption
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
          </div>
        )}

        {mode === "story" && (
          <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
            ℹ️ Stories don&apos;t support captions via the API — bake any text or stickers
            into the image/video before uploading.
          </p>
        )}

        <button type="submit" disabled={loading} style={{ padding: "10px 16px" }}>
          {loading
            ? "Publishing..."
            : mode === "story"
            ? "Post Story"
            : "Post to Instagram"}
        </button>
      </form>

      {status?.ok && (
        <p style={{ color: "green", marginTop: 16 }}>
          Published! Media ID: {status.mediaId}
        </p>
      )}
      {status && !status.ok && (
        <p style={{ color: "crimson", marginTop: 16 }}>Error: {status.message}</p>
      )}
    </main>
  );
}
