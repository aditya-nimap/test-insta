import { NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getInstagramUser,
} from "../../../../lib/instagram";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  try {
    // Meta sometimes appends "#_" to the code - strip it defensively
    const cleanCode = code.replace("#_", "");

    const shortLived = await exchangeCodeForToken(cleanCode);
    const longLived = await getLongLivedToken(shortLived.access_token);
    const igUser = await getInstagramUser(longLived.access_token);

    const res = NextResponse.redirect(`${origin}/?connected=1`);

    // Demo-friendly storage: httpOnly cookies. For a real multi-user app,
    // save { igUser.user_id, longLived.access_token, expires_in } in a database instead,
    // keyed to your own logged-in user - not just a cookie.
    const cookieOpts = {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: longLived.expires_in, // ~60 days, in seconds
    };
    res.cookies.set("ig_access_token", longLived.access_token, cookieOpts);
    res.cookies.set("ig_user_id", String(igUser.user_id), cookieOpts);
    res.cookies.set("ig_username", igUser.username, cookieOpts);

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(err.message)}`
    );
  }
}
