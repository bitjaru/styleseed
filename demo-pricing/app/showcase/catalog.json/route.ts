import "../examples";
import { getShowcaseImagePath, OUTPUT_GRAMMARS, SURFACE_ADAPTERS, listShowcase } from "@/lib/showcase";

export const dynamic = "force-static";

export function GET() {
  const builds = listShowcase().map((entry) => ({
    id: entry.id,
    name: entry.name,
    url: `https://styleseed-demo.vercel.app/showcase/${entry.id}`,
    image: `https://styleseed-demo.vercel.app${getShowcaseImagePath(entry)}`,
    userJob: entry.job,
    outputGrammar: entry.grammar,
    surfaceAdapter: entry.adapter,
    signatureDecision: entry.signature,
    proofLevel: entry.proof ?? "interactive",
    sourcePath: entry.sourcePath ?? `app/showcase/examples/${entry.id}.tsx`,
    reproduction: entry.reproduction,
    category: entry.category,
    aestheticSkin: entry.primarySkin,
    motionSeed: entry.primarySeed,
  }));

  return Response.json(
    {
      name: "StyleSeed v3 showcase catalog",
      description:
        "Machine-readable evidence catalog of live StyleSeed builds and their effective design method.",
      generatedFrom: "https://github.com/bitjaru/styleseed/tree/main/demo-pricing/app/showcase/examples",
      outputGrammars: OUTPUT_GRAMMARS,
      surfaceAdapters: SURFACE_ADAPTERS,
      coverage: {
        liveBuilds: builds.length,
        liveOutputGrammars: [...new Set(builds.map((build) => build.outputGrammar))],
        liveSurfaceAdapters: [...new Set(builds.map((build) => build.surfaceAdapter))],
      },
      builds,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
