"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  Globe,
  Key,
  Mail,
  Smartphone,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { seeds, type SeedId } from "@engine/motion";
import type { EntranceRecipe } from "@engine/motion/contexts";

function delayed(recipe: EntranceRecipe, delay: number): EntranceRecipe {
  const animate = recipe.animate as Record<string, unknown>;
  const transition = (animate.transition as Record<string, unknown> | undefined) ?? {};
  return {
    initial: recipe.initial,
    animate: { ...animate, transition: { ...transition, delay } } as EntranceRecipe["animate"],
  };
}

const SECTIONS = [
  { id: "account", label: "Account", icon: User },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team", icon: Users },
  { id: "security", label: "Security", icon: Key },
  { id: "integrations", label: "Integrations", icon: Globe },
  { id: "workspace", label: "Workspace", icon: Building2 },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function SettingsPage({ skin, seed: seedId }: { skin: string; seed: SeedId }) {
  const m = seeds[seedId];
  const [active, setActive] = useState<SectionId>("account");

  const surfacePage = "var(--surface-page, var(--background, #fafafa))";
  const card = "var(--card, #ffffff)";
  const text = "var(--text-primary, var(--foreground, #1a1a1a))";
  const textSecondary = "var(--text-secondary, var(--muted-foreground, #6a6a6a))";
  const textTertiary = "var(--text-tertiary, var(--muted-foreground, #9a9a9a))";
  const border = "var(--border, rgba(0,0,0,0.08))";
  const brand = "var(--brand, #FF5E7E)";
  const brandTint = "var(--brand-tint, rgba(255,94,126,0.1))";
  const gradient = "var(--gradient-brand, var(--brand, #FF5E7E))";
  const radius = "var(--radius, 16px)";
  // Borderless: cards float on tone + soft shadow, no hairline border (Toss discipline)
  const shadow = "0 1px 2px rgba(0,0,0,0.03), 0 6px 16px rgba(0,0,0,0.04)";

  return (
    <div
      key={seedId}
      className="flex flex-col lg:flex-row"
      style={{
        background: surfacePage,
        color: text,
        minHeight: 640,
        fontFamily: "var(--font-display, var(--font-inter), Inter, system-ui, sans-serif)",
      }}
    >
      {/* Sidebar */}
      <aside
        className="shrink-0 border-b p-4 sm:p-6 lg:w-[260px] lg:border-r lg:border-b-0 lg:p-5"
        style={{
          background: card,
          borderColor: border,
        }}
      >
        <div className="flex items-center gap-2 px-2 pb-4">
          <div
            className="flex h-8 w-8 items-center justify-center text-[14px] font-bold text-white"
            style={{ background: gradient, borderRadius: 10 }}
          >
            A
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-bold tracking-tight">Settings</div>
            <div className="text-[11px]" style={{ color: textTertiary }}>
              {skin} workspace
            </div>
          </div>
        </div>
        <nav className="mt-2 flex flex-wrap gap-2 lg:block lg:space-y-0.5">
          {SECTIONS.map((s, i) => (
            <motion.button
              key={s.id}
              type="button"
              {...m.press}
              onClick={() => setActive(s.id)}
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors lg:w-full"
              style={{
                background: active === s.id ? brandTint : "transparent",
                color: active === s.id ? brand : textSecondary,
              }}
            >
              <span className="flex items-center gap-2.5">
                <s.icon size={14} />
                {s.label}
              </span>
              {active === s.id && <ChevronRight size={12} />}
            </motion.button>
          ))}
        </nav>
        <div className="mt-6 border-t pt-4" style={{ borderColor: border }}>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2.5"
            style={{ background: brandTint }}
          >
            <Sparkles size={14} style={{ color: brand }} />
            <div className="leading-tight">
              <div className="text-[12px] font-bold" style={{ color: brand }}>
                Try Pro
              </div>
              <div className="text-[11px]" style={{ color: textSecondary }}>
                Unlock workspace insights
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <div className="min-w-0 grow overflow-y-auto p-4 sm:p-6 lg:flex-1 lg:p-8">
        <motion.header {...m.entrance} className="mb-7">
          <h1 className="text-[28px] font-bold tracking-tight">Account</h1>
          <p className="mt-1 text-[14px]" style={{ color: textSecondary }}>
            Manage your profile, login, and preferences.
          </p>
        </motion.header>

        {/* Profile card */}
        <motion.section
          {...delayed(m.entrance, 0.08)}
          {...m.hover}
          className="mb-6 flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
          style={{
            background: card,
            borderRadius: radius,
            boxShadow: shadow,
          }}
        >
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center text-[20px] font-bold text-white"
              style={{ background: gradient, borderRadius: 16 }}
            >
              SC
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold">Sam Choi</div>
              <div className="text-[12px]" style={{ color: textTertiary }}>
                sam@bitjaru.dev · Free plan
              </div>
            </div>
          </div>
          <motion.button
            type="button"
            {...m.hover}
            {...m.press}
            className="shrink-0 px-3.5 py-2 text-[13px] font-bold"
            style={{
              border: `1px solid ${border}`,
              borderRadius: 10,
              color: text,
              background: surfacePage,
            }}
          >
            Edit profile
          </motion.button>
        </motion.section>

        {/* Notifications */}
        <motion.section
          {...delayed(m.entrance, 0.15)}
          className="mb-6 overflow-hidden"
          style={{
            background: card,
            borderRadius: radius,
            boxShadow: shadow,
          }}
        >
          <div className="border-b px-5 py-3.5" style={{ borderColor: border }}>
            <div className="text-[13px] font-bold">Notifications</div>
            <div className="mt-0.5 text-[11px]" style={{ color: textTertiary }}>
              Choose what reaches you and where.
            </div>
          </div>
          <ToggleRow
            motion={m}
            icon={Mail}
            title="Weekly email digest"
            desc="One Monday round-up of what shipped last week."
            defaultOn
            brand={brand}
            border={border}
            textSecondary={textSecondary}
          />
          <ToggleRow
            motion={m}
            icon={Smartphone}
            title="Mobile push"
            desc="Real-time alerts when someone @-mentions you."
            defaultOn
            brand={brand}
            border={border}
            textSecondary={textSecondary}
          />
          <ToggleRow
            motion={m}
            icon={Sparkles}
            title="Product updates"
            desc="The occasional what's-new note. No marketing spam."
            defaultOn={false}
            brand={brand}
            border={border}
            textSecondary={textSecondary}
          />
        </motion.section>

        {/* Connected accounts */}
        <motion.section
          {...delayed(m.entrance, 0.22)}
          className="mb-6 overflow-hidden"
          style={{
            background: card,
            borderRadius: radius,
            boxShadow: shadow,
          }}
        >
          <div className="border-b px-5 py-3.5" style={{ borderColor: border }}>
            <div className="text-[13px] font-bold">Connected accounts</div>
            <div className="mt-0.5 text-[11px]" style={{ color: textTertiary }}>
              Authentication providers linked to this account.
            </div>
          </div>
          {[
            { name: "GitHub", desc: "bitjaru0402 · primary", connected: true },
            { name: "Google", desc: "sam@bitjaru.dev", connected: true },
            { name: "Slack", desc: "Not connected", connected: false },
          ].map((it) => (
            <div
              key={it.name}
              className="flex items-center justify-between gap-4 border-t px-5 py-3.5"
              style={{ borderColor: border }}
            >
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">{it.name}</div>
                <div className="mt-0.5 text-[11px]" style={{ color: textTertiary }}>
                  {it.desc}
                </div>
              </div>
              <motion.button
                {...m.hover}
                {...m.press}
                type="button"
                className="shrink-0 rounded-md px-3 py-1.5 text-[12px] font-bold"
                style={{
                  background: it.connected ? "transparent" : brandTint,
                  border: `1px solid ${it.connected ? border : "transparent"}`,
                  color: it.connected ? textSecondary : brand,
                }}
              >
                {it.connected ? "Disconnect" : "Connect"}
              </motion.button>
            </div>
          ))}
        </motion.section>

        {/* Danger zone */}
        <motion.section
          {...delayed(m.entrance, 0.3)}
          className="overflow-hidden"
          style={{
            background: card,
            border: `1px solid var(--destructive, #C85A54)`,
            borderRadius: radius,
          }}
        >
          <div
            className="flex items-center justify-between gap-4 p-5"
            style={{ background: "rgba(200,90,84,0.04)" }}
          >
            <div className="min-w-0">
              <div
                className="text-[13px] font-bold"
                style={{ color: "var(--destructive, #C85A54)" }}
              >
                Delete account
              </div>
              <div className="mt-0.5 text-[11px]" style={{ color: textTertiary }}>
                Permanently remove this account and all linked data. Cannot be undone.
              </div>
            </div>
            <motion.button
              type="button"
              {...m.hover}
              {...m.press}
              className="shrink-0 px-3.5 py-2 text-[12px] font-bold text-white"
              style={{
                background: "var(--destructive, #C85A54)",
                borderRadius: 10,
              }}
            >
              Delete
            </motion.button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function ToggleRow({
  motion: m,
  icon: Icon,
  title,
  desc,
  defaultOn,
  brand,
  border,
  textSecondary,
}: {
  motion: (typeof seeds)[SeedId];
  icon: typeof Bell;
  title: string;
  desc: string;
  defaultOn: boolean;
  brand: string;
  border: string;
  textSecondary: string;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div
      className="flex items-center justify-between gap-4 border-t px-5 py-3.5"
      style={{ borderColor: border }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon size={14} style={{ color: textSecondary, marginTop: 3 }} />
        <div>
          <div className="text-[13px] font-semibold">{title}</div>
          <div className="mt-0.5 text-[11px]" style={{ color: textSecondary }}>
            {desc}
          </div>
        </div>
      </div>
      <motion.button
        type="button"
        {...m.press}
        onClick={() => setOn((v) => !v)}
        className="relative shrink-0"
        style={{
          width: 36,
          height: 22,
          borderRadius: 999,
          background: on ? brand : "var(--switch-background, #cbced4)",
          transition: "background 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        aria-pressed={on}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 32 }}
          className="absolute top-[2px] block h-[18px] w-[18px]"
          style={{
            left: on ? 16 : 2,
            background: "#fff",
            borderRadius: 999,
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        />
      </motion.button>
    </div>
  );
}
