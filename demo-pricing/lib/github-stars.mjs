const REPOSITORY_API = "https://api.github.com/repos/bitjaru/styleseed";

export const GITHUB_STARS_REVALIDATE_SECONDS = 3600;

export async function fetchGitHubStars(fetchImplementation = globalThis.fetch) {
  try {
    const response = await fetchImplementation(REPOSITORY_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "styleseed-demo",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: GITHUB_STARS_REVALIDATE_SECONDS },
    });

    if (!response?.ok) return null;
    const repository = await response.json();
    const stars = repository?.stargazers_count;
    return Number.isSafeInteger(stars) && stars >= 0 ? stars : null;
  } catch {
    return null;
  }
}
