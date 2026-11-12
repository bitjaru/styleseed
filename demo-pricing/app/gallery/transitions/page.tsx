import type { Metadata } from "next";
import { TransitionCases } from "./transition-cases";

export const metadata: Metadata = {
  title: "Transition cases",
  description:
    "Ten state changes of StyleSeed components, declared for ss-verify transition-jumps.mjs to sample frame by frame.",
  robots: { index: false },
};

// The state changes of the components whose transitions name their properties, each declared as a
// case for ss-verify/scripts/transition-jumps.mjs (scripts/test-transition-jumps-browser.mjs).
export default function TransitionCasesPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Transition cases</h1>
        <p className="mt-3 text-sm text-gray-600">
          Each block below is one state change of a StyleSeed component. Its trigger switches the state
          and switches it back. <code className="rounded bg-gray-100 px-1 py-0.5">transition-jumps.mjs</code>{" "}
          samples every change frame by frame and reports a box that moves in one frame while the rest of
          the change is animated.
        </p>
        <div data-skin="toss" className="mt-8 rounded-xl p-6" style={{ background: "var(--background)" }}>
          <TransitionCases />
        </div>
      </div>
    </main>
  );
}
