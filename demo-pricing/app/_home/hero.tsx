"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GithubIcon } from "./github-icon";
import { GithubStarCount } from "./github-star-count";
import { InstallCommand, PromptBox } from "./prompt-box";

const PRODUCT_LOOP = [
  {
    step: "01",
    title: "Choose",
    copy: "Pick the output grammar, surface, brand recipe, and bounded project decisions.",
  },
  {
    step: "02",
    title: "Compile",
    copy: "Turn those choices into a small, exact contract for this artifact — not a giant handbook.",
  },
  {
    step: "03",
    title: "Build",
    copy: "Generate against the contract and keep approved decisions in the repo for the next update.",
  },
  {
    step: "04",
    title: "Prove",
    copy: "Run code checks, build the product, inspect real pixels, and record what actually passed.",
  },
];

const STATS = [
  { value: "74", label: "design rules" },
  { value: "23", label: "core skills" },
  { value: "8", label: "output grammars" },
  { value: "5", label: "surface adapters" },
];

export function Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-14 text-center sm:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-teal-800">
          Design-method engine · open source
        </div>

        <h1 className="mx-auto mt-5 max-w-4xl text-[clamp(40px,7vw,68px)] font-bold leading-[1.03] tracking-tight text-neutral-950">
          Give your coding agent
          <br className="hidden sm:block" /> a design method it can repeat.
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-neutral-600 sm:text-[17px]">
          StyleSeed compiles your chosen design rules into an artifact-level contract, builds against
          it, and keeps the decisions in your repo so the next screen and the next update stay coherent.
        </p>

        <div className="mx-auto mt-7 max-w-xl">
          <InstallCommand />
        </div>

        <details className="group mx-auto mt-2 max-w-xl text-left">
          <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-center text-[13px] font-semibold text-neutral-500 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Advanced: use the full one-paste workflow ↓</span>
            <span className="hidden group-open:inline">Hide the advanced workflow ↑</span>
          </summary>
          <div className="mt-2">
            <PromptBox />
          </div>
        </details>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-semibold text-neutral-600">
          <a
            href="https://github.com/bitjaru/styleseed"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-neutral-950 hover:underline"
          >
            <GithubIcon size={14} />
            GitHub
            <GithubStarCount className="text-neutral-500" />
          </a>
          <Link href="/architecture" className="inline-flex items-center gap-1 hover:text-neutral-950 hover:underline">
            Engine architecture <ArrowRight size={13} />
          </Link>
          <Link href="/gate" className="inline-flex items-center gap-1 hover:text-neutral-950 hover:underline">
            Benchmark evidence <ArrowRight size={13} />
          </Link>
        </div>

        <ol className="mt-10 grid border-y border-neutral-200 text-left sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCT_LOOP.map((item, index) => (
            <li
              key={item.step}
              className={`py-5 sm:px-5 lg:py-6 ${
                index > 0 ? "border-t border-neutral-200 sm:border-t-0" : ""
              } ${index % 2 === 1 ? "sm:border-l" : ""} ${index > 1 ? "sm:border-t lg:border-t-0" : ""} ${
                index > 0 ? "lg:border-l" : ""
              }`}
            >
              <div className="font-mono text-[11px] font-bold text-teal-700">{item.step}</div>
              <h2 className="mt-2 text-[16px] font-bold tracking-tight text-neutral-950">{item.title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">{item.copy}</p>
            </li>
          ))}
        </ol>

        <figure className="mx-auto mt-12 max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]">
            <Image
              src="/v26-compare.png"
              alt="The same product built by an AI agent's defaults versus with StyleSeed's rules — before shows default indigo, gradient text, and placeholder mocks; after shows a chosen accent, the real product, and one focal point."
              width={1516}
              height={1008}
              priority
              className="h-auto w-full"
            />
          </div>
          <figcaption className="mt-3 text-[13px] leading-relaxed text-neutral-500">
            Same product, same prompt — only the rules changed. This page first scored 58/100 on our
            own gate.{" "}
            <Link href="/scorecard" className="font-semibold text-teal-700 hover:underline">
              See the receipt →
            </Link>{" "}
            The benchmark records a 5.3-point improvement for both Codex and Claude Code.{" "}
            <Link href="/gate" className="font-semibold text-teal-700 hover:underline">
              Read BENCH-V1 →
            </Link>
          </figcaption>
        </figure>

        <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-2 border-y border-neutral-200 sm:grid-cols-4">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className={`px-3 py-5 ${index % 2 === 1 ? "border-l border-neutral-200" : ""} ${
                index > 1 ? "border-t border-neutral-200 sm:border-t-0" : ""
              } ${index > 0 ? "sm:border-l sm:border-neutral-200" : ""}`}
            >
              <dt className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{stat.label}</dt>
              <dd className="mt-1 text-[30px] font-bold tracking-tight text-neutral-950">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
