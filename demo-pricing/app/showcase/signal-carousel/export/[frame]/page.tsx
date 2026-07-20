import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SignalCarouselFrame } from "@/app/showcase/_renderers/artifact-proofs";

const FRAMES = ["1", "2", "3", "4", "5"] as const;

export const metadata: Metadata = {
  title: "Signal Reset export frame",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return FRAMES.map((frame) => ({ frame }));
}

export default async function SignalCarouselExportPage({
  params,
}: {
  params: Promise<{ frame: string }>;
}) {
  const { frame } = await params;
  if (!FRAMES.includes(frame as (typeof FRAMES)[number])) notFound();

  return (
    <main
      data-carousel-export
      aria-label={`Signal Reset export frame ${frame} of 5`}
      className="h-[1440px] w-[1080px] overflow-hidden [container-type:inline-size]"
    >
      <SignalCarouselFrame frame={Number(frame)} />
    </main>
  );
}
