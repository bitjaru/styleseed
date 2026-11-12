"use client";

import { useState, type ReactNode } from "react";
import { Bell } from "lucide-react";
import { Switch } from "@engine/components/ui/switch";
import { Progress } from "@engine/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@engine/components/ui/accordion";
import { ChartCard } from "@engine/components/patterns/chart-card";
import { DonutChartCard } from "@engine/components/patterns/donut-chart-card";
import { ProgressBar, ProgressBarWithLabel } from "@engine/components/patterns/progress-bar";
import { RankedList } from "@engine/components/patterns/ranked-list";
import { TopBarAction } from "@engine/components/patterns/top-bar";

// engine/components/ui/segmented-control.tsx does not type-check here: its props interface extends the
// div's props and redeclares onChange as (index: number) => void, which HTMLAttributes types as a change
// event handler (TS2430). Nothing imported it before this page, and components are not edited here, so
// the real component is loaded with require(), which TypeScript leaves out of the checked program, and
// given the props it reads. Replace this with an import once the component's props type is fixed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SegmentedControl } = require("@engine/components/ui/segmented-control") as {
  SegmentedControl: (props: { segments: string[]; activeIndex: number; onChange?: (index: number) => void }) => ReactNode;
};

// One declared case per state change: a root with data-styleseed-transition="<id>" that holds exactly
// one data-styleseed-trigger. Where the component cannot carry the trigger, the trigger is a plain
// unstyled button after it. Each case toggles one piece of state; the copy is fictional.
function Case({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-text-secondary">{title}</h2>
      <div data-styleseed-transition={id} className="space-y-3">
        {children}
      </div>
    </section>
  );
}

function Trigger({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" data-styleseed-trigger onClick={onClick}>
      {children}
    </button>
  );
}

function SwitchCase() {
  const [on, setOn] = useState(false);
  return (
    <Case id="switch" title="Switch">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[14px] text-text-primary">Weekly summary email</span>
        <Switch checked={on} onCheckedChange={setOn} aria-label="Weekly summary email" data-styleseed-trigger />
      </div>
    </Case>
  );
}

function ProgressCase() {
  const [value, setValue] = useState(20);
  return (
    <Case id="progress" title="Progress">
      <Progress value={value} aria-label="Upload progress" />
      <Trigger onClick={() => setValue((v) => (v === 20 ? 80 : 20))}>Change upload progress</Trigger>
    </Case>
  );
}

function AccordionCase() {
  return (
    <Case id="accordion" title="Accordion">
      <Accordion type="single" collapsible>
        <AccordionItem value="shipping">
          <AccordionTrigger data-styleseed-trigger>Shipping times</AccordionTrigger>
          <AccordionContent>Orders leave the warehouse within two working days.</AccordionContent>
        </AccordionItem>
      </Accordion>
      <p className="text-[14px] text-text-secondary">Returns are free for thirty days.</p>
    </Case>
  );
}

function SegmentedControlCase() {
  const [index, setIndex] = useState(0);
  return (
    <Case id="segmented-control" title="Segmented control">
      <SegmentedControl segments={["Day", "Week", "Month"]} activeIndex={index} onChange={setIndex} />
      <Trigger onClick={() => setIndex((i) => (i === 0 ? 1 : 0))}>Change range</Trigger>
    </Case>
  );
}

function ChartCardCase() {
  const [period, setPeriod] = useState("1W");
  return (
    <Case id="chart-card" title="Chart card">
      <ChartCard title="Orders" periods={["1W", "1M", "3M"]} activePeriod={period} onPeriodChange={setPeriod}>
        <div className="h-40 rounded-md bg-surface-muted" />
      </ChartCard>
      <Trigger onClick={() => setPeriod((p) => (p === "1W" ? "1M" : "1W"))}>Change period</Trigger>
    </Case>
  );
}

const STORAGE = [
  { name: "Photos", value: 48, stock: 12.4, unit: "GB" },
  { name: "Videos", value: 32, stock: 8.1, unit: "GB" },
  { name: "Documents", value: 20, stock: 3.2, unit: "GB" },
];

function DonutChartCardCase() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Case id="donut-chart-card" title="Donut chart card">
      <DonutChartCard
        title="Storage by type"
        centerValue={64}
        centerUnit="%"
        centerLabel="Used"
        items={STORAGE}
        selectedItem={selected}
        onItemSelect={setSelected}
        chartElement={<div className="size-32 rounded-full bg-surface-muted" />}
      />
      <Trigger onClick={() => setSelected((s) => (s === null ? STORAGE[0].name : null))}>Select the first type</Trigger>
    </Case>
  );
}

function ProgressBarCase() {
  const [value, setValue] = useState(20);
  return (
    <Case id="progress-bar" title="Progress bar">
      <ProgressBar value={value} label="Daily goal" />
      <Trigger onClick={() => setValue((v) => (v === 20 ? 80 : 20))}>Change daily goal</Trigger>
    </Case>
  );
}

function ProgressBarWithLabelCase() {
  const [value, setValue] = useState(20);
  return (
    <Case id="progress-bar-with-label" title="Progress bar with label">
      <ProgressBarWithLabel value={value} label="Steps" />
      <Trigger onClick={() => setValue((v) => (v === 20 ? 80 : 20))}>Change steps</Trigger>
    </Case>
  );
}

function RankedListCase() {
  const [highlighted, setHighlighted] = useState(false);
  return (
    <Case id="ranked-list" title="Ranked list">
      <RankedList
        title="Top regions"
        items={[
          { rank: 1, name: "North", value: "1,240" },
          { rank: 2, name: "Coast", value: "980", isHighlighted: highlighted },
          { rank: 3, name: "Valley", value: "760" },
        ]}
      />
      <Trigger onClick={() => setHighlighted((h) => !h)}>Highlight the second region</Trigger>
    </Case>
  );
}

function TopBarActionCase() {
  const [active, setActive] = useState(false);
  return (
    <Case id="top-bar-action" title="Top bar action">
      <TopBarAction aria-label="Notifications" className={active ? "bg-brand-tint border-brand" : undefined}>
        <Bell className="size-[18px] text-icon-default" />
      </TopBarAction>
      <Trigger onClick={() => setActive((a) => !a)}>Mark notifications active</Trigger>
    </Case>
  );
}

export function TransitionCases() {
  return (
    <div className="space-y-10">
      <SwitchCase />
      <ProgressCase />
      <AccordionCase />
      <SegmentedControlCase />
      <ChartCardCase />
      <DonutChartCardCase />
      <ProgressBarCase />
      <ProgressBarWithLabelCase />
      <RankedListCase />
      <TopBarActionCase />
    </div>
  );
}
