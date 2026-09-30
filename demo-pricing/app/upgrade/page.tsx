import type { Metadata } from "next";
import Link from "next/link";
import { PromptBox } from "../_home/prompt-box";
import notice from "@/content/upgrade-notice.json";

const title = "Too many StyleSeed skills? Update your existing install.";
const description = "Keep the workflows and use one StyleSeed entry. Ask your agent to update, back up verified old skills, consolidate the list, and check the result in one request.";
export const metadata: Metadata = {
  title: `${title} · StyleSeed`, description,
  alternates: { canonical: notice.guideUrl },
  openGraph: { title, description, url: notice.guideUrl, type: "article" },
};

export default function UpgradePage() {
  return <main data-styleseed-artifact="site-docs" className="min-h-screen bg-white px-5 py-10 text-neutral-900 sm:px-8 sm:py-14">
    <article className="mx-auto max-w-3xl">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline underline-offset-4">← StyleSeed</Link>
      <header className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">For existing users</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Same workflows.<br />One StyleSeed entry.</h1>
        <p className="mt-5 text-lg leading-relaxed text-neutral-700">You can stop choosing between a long list of commands. The current core keeps 22 workflows inside <code>styleseed</code>. Your agent selects the one your task needs.</p>
        <p lang="ko" className="mt-4 leading-relaxed text-neutral-600">스킬이 너무 많이 보이나요? 기존 기능은 유지하고, 시작점은 <code>styleseed</code> 하나로 통합하세요. 아래 요청을 복사하면 업데이트와 옛 항목 정리를 함께 진행합니다.</p>
      </header>

      <section aria-labelledby="request-heading" className="mt-10">
        <h2 id="request-heading" className="text-2xl font-bold tracking-tight">Ask once. Finish the update.</h2>
        <p className="mb-5 mt-3 leading-relaxed text-neutral-700">Paste this into your coding agent where you already use StyleSeed. You do not need to remember the old skill names.</p>
        <PromptBox prompt={notice.request.en} copyLabel="Copy the update request" hint="Paste into your coding agent in the project where you use StyleSeed." />
        <details className="mt-3" lang="ko">
          <summary className="w-fit cursor-pointer py-3 font-semibold text-teal-800 underline underline-offset-4">한국어 업데이트 요청 복사하기</summary>
          <div className="mt-2"><PromptBox prompt={notice.request.ko} copyLabel="한국어 업데이트 요청 복사" hint="StyleSeed를 쓰던 프로젝트의 코딩 에이전트에 붙여넣으세요." /></div>
        </details>
      </section>

      <section aria-labelledby="steps-heading" className="mt-10 border-t border-neutral-200 pt-8">
        <h2 id="steps-heading" className="text-2xl font-bold tracking-tight">What your agent will do</h2>
        <ol className="mt-5 list-decimal space-y-5 pl-5 leading-relaxed text-neutral-700">
          <li><strong>Find and update your existing installation.</strong> Keep the same agent, project or global scope, and release channel. A pinned version stays your decision.</li>
          <li><strong>Back up and consolidate old entries.</strong> Reinstalling alone can leave old commands behind. The update checks each old entry and archives unchanged copies outside the skill list. Modified files stay in place for review.</li>
          <li><strong>Check the result and restart the session.</strong> Refresh affected existing rule bundles and verify the installed revision. Your agent reports the backup location and any entries that still need attention. Start a fresh session to refresh the skill list.</li>
        </ol>
        <p className="mt-6 leading-relaxed text-neutral-700">Your application code, design tokens, and approved design choices remain yours. Updating StyleSeed does not redesign your screens.</p>
      </section>

      <section className="mt-10 border-t border-neutral-200 pt-8">
        <h2 className="text-2xl font-bold tracking-tight">Still seeing duplicate commands?</h2>
        <p className="mt-4 leading-relaxed text-neutral-700">A plugin plus a separate CLI install can expose two copies. Your agent should identify both and help you choose one. Customized, linked, or unrecognized old entries are preserved rather than silently removed.</p>
        <p className="mt-4 leading-relaxed text-neutral-700">Stable release archives follow their own release schedule. This guide does not switch them to the latest development revision without your choice.</p>
        <h2 className="mt-8 text-2xl font-bold tracking-tight">Will everyone get an update notice?</h2>
        <p className="mt-4 leading-relaxed text-neutral-700">Versions with a session update check can recommend an update the next time you use StyleSeed. Very old or unused installations cannot receive a remote notice. Share this guide with teammates who still have the old list.</p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-teal-800">
          <a href={notice.agentGuideUrl} className="inline-flex min-h-11 items-center underline underline-offset-4">Agent-readable upgrade instructions</a>
          <Link href="/evaluate" className="inline-flex min-h-11 items-center underline underline-offset-4">What the verification proves</Link>
        </div>
      </section>
    </article>
  </main>;
}
