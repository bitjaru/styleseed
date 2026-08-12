import { readFileSync } from "fs";
import { join } from "path";
import { Sparkles, ArrowRight } from "lucide-react";

type Version = {
  version: string;
  released: string;
  whatsNew: string;
  revision?: string;
  revisionFiles?: number;
  revisionReleased?: string;
  rules: number;
  skills: number;
  skins: number;
  grammars?: number;
  adapters?: number;
  recipes?: number;
};

function getVersion(): Version {
  // Read at build time so the section stays in sync with version.json (the same file
  // agents check via /ss-update). Single source of truth.
  const path = join(process.cwd(), "public", "version.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

/** A compact, self-updating "What's new" band on the landing page — pulls the latest
 *  release straight from version.json and links to the release notes + changelog. */
export function WhatsNew() {
  const v = getVersion();
  return (
    <section className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
          <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-violet-600">
            <Sparkles size={14} /> What&rsquo;s new
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[22px] font-bold tracking-tight text-neutral-900">v{v.version}</span>
            <span className="text-[14px] text-neutral-500">
              {v.released} · {v.rules} rules · {v.grammars ?? 0} grammars · {v.recipes ?? 0} recipes · {v.adapters ?? 0} adapters · {v.skills} skills
            </span>
          </div>
          {v.revision ? (
            <div className="mt-2 font-mono text-[12px] text-neutral-500">
              Latest revision {v.revision.slice(0, 18)}… · {v.revisionFiles ?? 0} maintained files
              {v.revisionReleased ? ` · ${v.revisionReleased}` : ""}
            </div>
          ) : null}
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-700">{v.whatsNew}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] font-semibold">
            <a href="/learn" className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950">
              Private learning <ArrowRight size={13} />
            </a>
            <a
              href="https://github.com/bitjaru/styleseed/releases"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-neutral-900 hover:text-violet-600"
            >
              Release notes <ArrowRight size={13} />
            </a>
            <a
              href="https://github.com/bitjaru/styleseed/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noreferrer"
              className="text-neutral-600 hover:text-neutral-900"
            >
              Full changelog
            </a>
            <span className="text-neutral-500">
              Update with <code className="rounded bg-neutral-200 px-1.5 py-0.5 text-[13px] text-neutral-800">/ss-update · $ss-update</code>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
