import { NextResponse } from "next/server";

const REPOSITORY_API = "https://api.github.com/repos/bitjaru/styleseed";

export const revalidate = 3600;

export async function GET() {
  try {
    const response = await fetch(REPOSITORY_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "styleseed-demo",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate },
    });

    if (!response.ok) {
      return NextResponse.json({ stars: null }, { status: 503 });
    }

    const repository = (await response.json()) as { stargazers_count?: unknown };
    const stars =
      typeof repository.stargazers_count === "number" ? repository.stargazers_count : null;

    return NextResponse.json(
      { stars },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json({ stars: null }, { status: 503 });
  }
}
