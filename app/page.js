"use client";

import { useState } from "react";

export default function Home() {
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
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
      const res = await fetch("/api/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, caption }),
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

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Public image URL (JPEG)
            <input
              type="url"
              required
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
        </div>

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

        <button type="submit" disabled={loading} style={{ padding: "10px 16px" }}>
          {loading ? "Publishing..." : "Post to Instagram"}
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
