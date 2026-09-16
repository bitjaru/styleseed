import { NextResponse } from "next/server";

import { fetchGitHubStars } from "@/lib/github-stars.mjs";

export const revalidate = 3600;

const successCache = "public, s-maxage=3600, stale-while-revalidate=86400";
const fallbackCache = "public, s-maxage=60, stale-while-revalidate=3600";

export async function GET() {
  const stars = await fetchGitHubStars();
  return NextResponse.json(
    { stars },
    { headers: { "Cache-Control": stars === null ? fallbackCache : successCache } },
  );
}
