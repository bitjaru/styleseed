import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@engine/components/ui/button";
import { Input } from "@engine/components/ui/input";
import showcase from "@/content/systems.json";

// Every number on this page comes from demo-pricing/content/systems.json, which
// scripts/build-systems-showcase.mjs generates from demo-pricing/content/systems-source.json and the corpus run
// it names. Edit the source file and regenerate; never edit the JSON.

type Value = number | "mixed" | null;
type Reading = { value: Value; eligible: number; holding: number | null };
type System = {
  id: string;
  name: string;
  kind: string;
  licence: string;
  repository: string;
  access: string;
  commit: string | null;
  summary: string;
  exampleUrl: string;
  screens: number;
  pageTypes: string[];
  values: Record<string, Reading>;
  shape: string;
};
type Showcase = { run: string; systems: System[]; partly: { id: string; name: string; note: string }[] };

const data = showcase as Showcase;
const BASE = "https://styleseed-demo.vercel.app";
const METHOD_URL = "https://github.com/bitjaru/styleseed/blob/main/research/consensus/README.md";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const spelled = (n: number) => WORDS[n] ?? String(n);
const capitalised = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`;

const HEAD = `${capitalised(spelled(data.systems.length))} public design systems with open licences whose example screens could be measured under this project's rules. Only sizes are shown: heights, corners, and row heights.`;

export const metadata: Metadata = {
  title: "Design systems we measured",
  description: HEAD,
  alternates: { canonical: `${BASE}/systems` },
};

const READINGS = [
  { claim: "button.height", label: "Button height", corner: false },
  { claim: "field.height", label: "Field height", corner: false },
  { claim: "button.radius", label: "Button corner", corner: true },
  { claim: "field.radius", label: "Field corner", corner: true },
  { claim: "table.bodyRowHeight", label: "Table row", corner: false },
  { claim: "nav.itemHeight", label: "Menu item", corner: false },
] as const;

const KIND_LABEL: Record<string, string> = {
  "product-system": "Built by an organisation for its own products or services",
  kit: "Published for other teams to build with",
};

function valueText(reading: Reading, corner: boolean) {
  const { value } = reading;
  if (value === null) return "not measured";
  if (value === "mixed") return "no single value";
  if (!corner) return `about ${value}px`;
  return value === 999 ? "pill" : value === 0 ? "square" : `${value}px`;
}

function countText(reading: Reading) {
  if (reading.value === null) return "";
  if (reading.value === "mixed") return `${reading.eligible} screens`;
  return `on ${reading.holding} of ${reading.eligible} screens`;
}

const px = (radius: number) => (radius === 999 ? "9999px" : `${radius}px`);

// A part is drawn only when its height and its corner are both numbers.
function part(height: Reading, radius: Reading) {
  if (typeof height.value === "number" && typeof radius.value === "number") return { drawn: true as const, height: height.value, radius: radius.value };
  return { drawn: false as const, why: height.value === null || radius.value === null ? "not measured" : "no single value" };
}

function Strip({ system }: { system: System }) {
  const field = part(system.values["field.height"], system.values["field.radius"]);
  const button = part(system.values["button.height"], system.values["button.radius"]);
  return (
    <div className="mt-6">
      {(field.drawn || button.drawn) && (
        <>
          <p className="text-[12px] leading-5 text-neutral-500">
            Drawn with StyleSeed components at these sizes. The colours are this site&apos;s.
          </p>
          <div data-skin="vercel" inert data-strip={system.id} className="mt-2 flex flex-wrap items-center gap-3 rounded-[8px] border bg-white p-4">
            {field.drawn && (
              <Input
                defaultValue="Order number"
                readOnly
                aria-label="Example field"
                className="max-w-56 flex-1"
                style={{ height: field.height, borderRadius: px(field.radius), borderColor: "var(--foreground)" }}
              />
            )}
            {button.drawn && (
              <Button type="button" style={{ height: button.height, borderRadius: px(button.radius) }}>
                Save changes
              </Button>
            )}
          </div>
        </>
      )}
      {!field.drawn && <p className="mt-2 text-[12px] leading-5 text-neutral-500" data-not-drawn="field">Field not drawn: {field.why}</p>}
      {!button.drawn && <p className="mt-1 text-[12px] leading-5 text-neutral-500" data-not-drawn="button">Button not drawn: {button.why}</p>}
    </div>
  );
}

function SystemCard({ system }: { system: System }) {
  return (
    <article id={system.id} data-system={system.id} className="grid gap-8 rounded-[12px] border bg-white p-4 sm:p-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
      <div className="min-w-0">
        <h2 className="text-[24px] font-semibold leading-tight tracking-[-0.02em]">{system.name}</h2>
        <p data-kind={system.kind} className="mt-2 text-[13px] font-medium leading-5 text-neutral-500">
          {KIND_LABEL[system.kind]}
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-neutral-700">{system.summary}</p>
        <p className="mt-4 text-[13px] leading-5 text-neutral-600">
          <code className="whitespace-nowrap font-mono text-[12px] text-neutral-800">{system.repository}</code> · {system.licence}
        </p>
        <p data-measured className="mt-3 text-[13px] leading-6 text-neutral-600">
          <span className="mr-1 rounded-[4px] bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">Measured</span>{" "}
          {system.screens} screens ({system.pageTypes.join(", ")}), <span className="whitespace-nowrap">{data.run}.</span>
        </p>
        {system.access === "self-hosted" && (
          <p data-local-build className="mt-2 text-[13px] leading-5 text-neutral-600">
            Measured from a local build of <code className="whitespace-nowrap font-mono text-[12px] text-neutral-800">{system.repository}</code> at{" "}
            <code className="whitespace-nowrap font-mono text-[12px] text-neutral-800">{system.commit}</code>. The link opens the maker&apos;s hosted copy, which may be newer.
          </p>
        )}
        <a
          href={system.exampleUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-example
          className="mt-5 inline-flex items-center gap-1 text-[14px] font-semibold text-neutral-950 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-950"
        >
          Open its own example <ArrowUpRight size={14} aria-hidden />
        </a>
      </div>

      <div className="min-w-0">
        {system.shape && <p data-shape className="text-[15px] font-medium leading-relaxed text-neutral-900">{system.shape}</p>}
        <table className="mt-4 w-full table-fixed border-collapse text-[13px] sm:text-[14px]">
          <tbody>
            {READINGS.map(({ claim, label, corner }) => {
              const reading = system.values[claim];
              return (
                <tr key={claim} data-claim={claim} className="border-t last:border-b">
                  <th scope="row" className="w-[28%] whitespace-nowrap py-2 pr-2 text-left font-normal text-neutral-500">{label}</th>
                  <td data-cell="value" className="w-[31%] whitespace-nowrap py-2 pr-2 font-medium tabular-nums text-neutral-950">{valueText(reading, corner)}</td>
                  <td data-cell="count" className="whitespace-nowrap py-2 text-right tabular-nums text-neutral-500">{countText(reading)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Strip system={system} />
      </div>
    </article>
  );
}

const DEFAULT_ROWS = [
  { recipe: "calm-consumer", title: "Consumer service", label: "StyleSeed's own default. Not measured." },
  { recipe: "native-mobile", title: "Phone-first app", label: "StyleSeed's own values for a phone-first app, when someone picks them. Not measured." },
] as const;

export default function SystemsPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-950 [--border:#e5e5e5]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <header>
          <h1 className="text-[clamp(36px,6vw,56px)] font-semibold leading-[1.05] tracking-[-0.035em]">Design systems we measured</h1>
          <p data-head className="mt-5 max-w-3xl text-[17px] leading-relaxed text-neutral-600 sm:text-[18px]">{HEAD}</p>
          <p data-small-print className="mt-4 text-[13px] leading-5 text-neutral-500">
            Setup can take the button height and the button and field corners from one of these systems: it draws them first and asks. Table rows and menu items are shown here and not taken. Heights are rounded to the nearest 4px. Not affiliated with or endorsed by any of the projects shown.
          </p>
        </header>

        <div className="mt-12 grid gap-5">
          {data.systems.map((system) => <SystemCard key={system.id} system={system} />)}
        </div>

        <section aria-labelledby="not-measured" className="mt-16">
          <h2 id="not-measured" className="text-[24px] font-semibold tracking-[-0.02em]">Not measured</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-neutral-600">
            No consumer product and no phone product has been measured. For those, StyleSeed has only its own values.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {DEFAULT_ROWS.map((row) => (
              <div key={row.recipe} data-default={row.recipe} className="rounded-[12px] border bg-white p-4 sm:p-7">
                <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{row.title}</h3>
                <p data-default-label className="mt-2 text-[13px] font-semibold leading-5 text-neutral-700">{row.label}</p>
                <div data-styleseed-recipe={row.recipe} data-skin="vercel" inert className="mt-5 flex rounded-[8px] border bg-white p-4">
                  <Button type="button">Continue</Button>
                </div>
                <p className="mt-2 text-[12px] leading-5 text-neutral-500">
                  On this version a field&apos;s corner comes from the colour theme, so no field is drawn.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="left-out" className="mt-16">
          <h2 id="left-out" className="text-[24px] font-semibold tracking-[-0.02em]">What this page leaves out</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-neutral-600">
            It shows {spelled(READINGS.length)} readings. Card and panel corners, icon gaps, and icon sizes are left out because their readings have known errors.
          </p>
          {data.partly.map((entry) => (
            <p key={entry.id} data-partly={entry.id} className="mt-2 max-w-3xl text-[15px] leading-relaxed text-neutral-600">
              One more system, {entry.name}, is not shown: {entry.note}
            </p>
          ))}
        </section>

        <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-3 border-t pt-6 text-[14px] font-semibold">
          <a href={METHOD_URL} className="underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-950">How these were measured</a>
          <Link href="/recipes" className="underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-950">StyleSeed&apos;s built-in looks</Link>
        </footer>
      </div>
    </main>
  );
}
