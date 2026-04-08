import * as React from "react"
import { cn } from "@/components/ui/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatCard } from "@/components/patterns/stat-card"
import { TopBar, TopBarAction } from "@/components/patterns/top-bar"
import { BottomNav } from "@/components/patterns/bottom-nav"
import { ListItem } from "@/components/patterns/list-item"
import { EmptyState } from "@/components/patterns/empty-state"
import {
  CreditCard,
  Fuel,
  Package,
  TrendingUp,
  Bell,
  Settings,
  Home,
  BarChart3,
  Search,
  Inbox,
  MapPin,
  Truck,
  Users,
} from "lucide-react"

/* ---------------------------------------------------------------------------
 * Section wrapper — used by every section for consistent layout & anchoring
 * --------------------------------------------------------------------------- */

function Section({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn("scroll-mt-12", className)}>
      <div className="mb-6">
        <h2 className="text-[24px] font-bold text-foreground tracking-[-0.01em] leading-snug">
          {title}
        </h2>
        {description && (
          <p className="text-[14px] text-muted-foreground leading-normal mt-1.5">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * Showcase page
 * --------------------------------------------------------------------------- */

function Showcase() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[960px] px-6 py-12 space-y-18">
        {/* Page header */}
        <header className="space-y-3">
          <p className="text-[12px] font-semibold text-brand uppercase tracking-[0.05em]">
            StyleSeed
          </p>
          <h1 className="text-[48px] font-bold text-foreground tracking-[-0.02em] leading-none">
            Seed Showcase
          </h1>
          <p className="text-[15px] text-muted-foreground leading-normal max-w-[520px]">
            디자인 시스템 시드에 포함된 모든 토큰, UI 프리미티브, 패턴 컴포넌트를
            한눈에 확인할 수 있는 레퍼런스 페이지입니다.
          </p>
        </header>

        {/* ---- Section 1: Color Palette ---- */}
        <Section
          id="colors"
          title="1. Color Palette"
          description="시맨틱 컬러 토큰 — 모든 UI에서 직접 hex 대신 이 토큰을 사용합니다."
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {(
              [
                { name: "brand", bg: "bg-brand", hex: "#721FE5" },
                { name: "primary", bg: "bg-primary", hex: "#030213" },
                { name: "secondary", bg: "bg-secondary", hex: "#ECECF0" },
                { name: "muted", bg: "bg-muted", hex: "#ECECF0" },
                { name: "accent", bg: "bg-accent", hex: "#F4F1EC" },
                { name: "destructive", bg: "bg-destructive", hex: "#D4183D" },
                { name: "success", bg: "bg-success", hex: "#6B9B7A" },
                { name: "warning", bg: "bg-warning", hex: "#D97706" },
                { name: "info", bg: "bg-info", hex: "#3B82F6" },
                { name: "background", bg: "bg-background", hex: "#FFFFFF" },
                { name: "card", bg: "bg-card", hex: "#FFFFFF" },
                { name: "border", bg: "bg-border", hex: "rgba(0,0,0,0.1)" },
              ] as const
            ).map((c) => (
              <div key={c.name} className="flex flex-col gap-1.5">
                <div
                  className={cn(
                    c.bg,
                    "h-16 rounded-xl border border-border",
                  )}
                />
                <p className="text-[12px] font-bold text-foreground">
                  {c.name}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {c.bg} &middot; {c.hex}
                </p>
              </div>
            ))}
          </div>

          {/* Foreground text colors */}
          <div className="mt-6 space-y-1.5">
            <p className="text-foreground text-[14px] font-bold">
              text-foreground <span className="font-normal">#030213</span>
            </p>
            <p className="text-muted-foreground text-[14px] font-bold">
              text-muted-foreground{" "}
              <span className="font-normal">#717182</span>
            </p>
            <p className="text-brand text-[14px] font-bold">
              text-brand <span className="font-normal">#721FE5</span>
            </p>
            <p className="text-destructive text-[14px] font-bold">
              text-destructive <span className="font-normal">#D4183D</span>
            </p>
            <p className="text-success text-[14px] font-bold">
              text-success <span className="font-normal">#6B9B7A</span>
            </p>
            <p className="text-warning text-[14px] font-bold">
              text-warning <span className="font-normal">#D97706</span>
            </p>
            <p className="text-info text-[14px] font-bold">
              text-info <span className="font-normal">#3B82F6</span>
            </p>
          </div>
        </Section>

        {/* ---- Section 2: Typography Scale ---- */}
        <Section
          id="typography"
          title="2. Typography Scale"
          description="Pretendard + Inter 기반 14단계 타이포그래피 스케일."
        >
          <div className="space-y-4 overflow-x-auto">
            {(
              [
                { token: "2xs", size: "10px", leading: "leading-relaxed", tracking: "tracking-[0.05em]" },
                { token: "xs", size: "11px", leading: "leading-relaxed", tracking: "tracking-[0.05em]" },
                { token: "sm", size: "12px", leading: "leading-normal", tracking: "tracking-[0.05em]" },
                { token: "caption", size: "13px", leading: "leading-normal", tracking: "tracking-[0.05em]" },
                { token: "base", size: "14px", leading: "leading-normal", tracking: "tracking-normal" },
                { token: "body", size: "15px", leading: "leading-normal", tracking: "tracking-normal" },
                { token: "md", size: "16px", leading: "leading-normal", tracking: "tracking-normal" },
                { token: "subhead", size: "17px", leading: "leading-normal", tracking: "tracking-normal" },
                { token: "lg", size: "18px", leading: "leading-snug", tracking: "tracking-[-0.01em]" },
                { token: "xl", size: "20px", leading: "leading-snug", tracking: "tracking-[-0.01em]" },
                { token: "2xl", size: "24px", leading: "leading-snug", tracking: "tracking-[-0.01em]" },
                { token: "3xl", size: "30px", leading: "leading-snug", tracking: "tracking-[-0.01em]" },
                { token: "4xl", size: "36px", leading: "leading-none", tracking: "tracking-[-0.02em]" },
                { token: "5xl", size: "48px", leading: "leading-none", tracking: "tracking-[-0.02em]" },
              ] as const
            ).map((t) => (
              <div
                key={t.token}
                className="flex items-baseline gap-6 border-b border-border pb-3"
              >
                <div className="flex-shrink-0 w-20">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">
                    {t.token}
                  </span>
                  <span className="text-[10px] text-muted-foreground ms-1">
                    {t.size}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-foreground font-bold",
                    t.leading,
                    t.tracking,
                  )}
                  style={{ fontSize: t.size }}
                >
                  가나다라마 ABCD 1234
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ---- Section 3: Button Variants ---- */}
        <Section
          id="buttons"
          title="3. Button Variants"
          description="5가지 variant + 3가지 size 조합."
        >
          <div className="space-y-6">
            {/* Variants at default size */}
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">
                Variants (default size)
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="default">기본 버튼</Button>
                <Button variant="secondary">보조 버튼</Button>
                <Button variant="destructive">삭제</Button>
                <Button variant="outline">아웃라인</Button>
                <Button variant="ghost">고스트</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">
                Sizes
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">작은 버튼</Button>
                <Button size="default">기본 버튼</Button>
                <Button size="lg">큰 버튼</Button>
              </div>
            </div>

            {/* Disabled */}
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">
                Disabled
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled>비활성 기본</Button>
                <Button variant="secondary" disabled>
                  비활성 보조
                </Button>
                <Button variant="destructive" disabled>
                  비활성 삭제
                </Button>
              </div>
            </div>
          </div>
        </Section>

        {/* ---- Section 4: Badge Variants ---- */}
        <Section
          id="badges"
          title="4. Badge Variants"
          description="상태 표시, 카테고리 태그 등에 사용합니다."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default">기본</Badge>
            <Badge variant="secondary">보조</Badge>
            <Badge variant="destructive">위험</Badge>
            <Badge variant="outline">아웃라인</Badge>
            <Badge variant="default">Completed</Badge>
            <Badge variant="secondary">usage 부족</Badge>
            <Badge variant="destructive">긴급</Badge>
          </div>
        </Section>

        {/* ---- Section 5: Input + Card ---- */}
        <Section
          id="form"
          title="5. Input + Card"
          description="카드 안에 폼 요소를 배치한 예시."
        >
          <div className="max-w-[420px]">
            <Card>
              <CardHeader>
                <CardTitle className="text-[18px] font-bold tracking-[-0.01em]">
                  Register Workspace
                </CardTitle>
                <CardDescription className="text-[13px]">
                  Enter your workspace information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">
                    Workspace Name
                  </label>
                  <Input placeholder="예: GS칼텍스 강남점" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">
                    주소
                  </label>
                  <Input placeholder="서울시 강남구 테헤란로 123" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-foreground">
                      연락처
                    </label>
                    <Input placeholder="02-1234-5678" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-foreground">
                      대표자
                    </label>
                    <Input placeholder="홍길동" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="gap-3 justify-end">
                <Button variant="outline">취소</Button>
                <Button>등록하기</Button>
              </CardFooter>
            </Card>
          </div>
        </Section>

        {/* ---- Section 6: StatCard Grid ---- */}
        <Section
          id="stat-cards"
          title="6. StatCard Grid"
          description="KPI 지표를 위한 통계 카드 패턴."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[640px]">
            <StatCard
              icon={CreditCard}
              label="Revenue Today"
              value="1,870"
              unit="K"
              trend={{ value: "+8.2%", direction: "up" }}
            />
            <StatCard
              icon={Fuel}
              label="usage량"
              value="42,500"
              unit="L"
              trend={{ value: "-3.1%", direction: "down" }}
            />
            <StatCard
              icon={Truck}
              label="금일 배송"
              value="12"
              unit="건"
              trend={{ value: "+2건", direction: "up" }}
            />
            <StatCard
              icon={Users}
              label="방문 고객"
              value="384"
              unit="명"
              trend={{ value: "+15%", direction: "up" }}
            />
          </div>
        </Section>

        {/* ---- Section 7: TopBar + BottomNav ---- */}
        <Section
          id="navigation"
          title="7. TopBar + BottomNav"
          description="앱 헤더와 하단 내비게이션 패턴. 아래 미리보기는 position: relative로 감쌌습니다."
        >
          {/* Contained preview wrapper */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-background max-w-[430px] h-[320px]">
            <TopBar
              logo={
                <span className="text-[20px] font-bold text-foreground tracking-[-0.01em]">
                  Workspace Management
                </span>
              }
              subtitle="2026년 3월 30일 월요일"
              actions={
                <>
                  <TopBarAction>
                    <Search className="size-[18px] text-muted-foreground" />
                  </TopBarAction>
                  <TopBarAction badge>
                    <Bell className="size-[18px] text-muted-foreground" />
                  </TopBarAction>
                </>
              }
            />

            {/* Spacer representing content */}
            <div className="px-6 py-3">
              <p className="text-[13px] text-muted-foreground">
                페이지 콘텐츠 영역
              </p>
            </div>

            {/* BottomNav rendered in relative context */}
            <nav
              data-slot="bottom-nav"
              className="absolute bottom-0 left-0 right-0 bg-card border-t border-border"
            >
              <div className="mx-auto flex items-center justify-around px-6 py-3">
                {(
                  [
                    { name: "홈", icon: Home, active: true },
                    { name: "매출", icon: BarChart3, active: false },
                    { name: "usage", icon: Package, active: false },
                    { name: "설정", icon: Settings, active: false },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.name}
                      className={cn(
                        "flex flex-col items-center gap-1 min-w-11 min-h-11 justify-center",
                        "transition-colors duration-[var(--duration-fast)]",
                        item.active
                          ? "text-brand"
                          : "text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" strokeWidth={2} />
                      <span className="text-[10px] font-semibold">
                        {item.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </nav>
          </div>
        </Section>

        {/* ---- Section 8: ListItem Examples ---- */}
        <Section
          id="list-items"
          title="8. ListItem Examples"
          description="리스트 아이템 패턴 - 다양한 상태 표시."
        >
          <div className="space-y-1.5 max-w-[480px]">
            <ListItem
              leading={
                <div className="size-9 rounded-lg bg-brand/10 flex items-center justify-center">
                  <MapPin className="size-4 text-brand" strokeWidth={2} />
                </div>
              }
              title="GS칼텍스 여의도"
              status={{ label: "Completed", color: "#6B9B7A" }}
              trailing={
                <span className="text-[14px] font-bold text-foreground">
                  840K
                </span>
              }
            />
            <ListItem
              leading={
                <div className="size-9 rounded-lg bg-warning/10 flex items-center justify-center">
                  <MapPin className="size-4 text-warning" strokeWidth={2} />
                </div>
              }
              title="SK에너지 강남"
              status={{ label: "배송중", color: "#D97706" }}
              trailing={
                <span className="text-[14px] font-bold text-foreground">
                  1,200K
                </span>
              }
            />
            <ListItem
              leading={
                <div className="size-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <MapPin
                    className="size-4 text-destructive"
                    strokeWidth={2}
                  />
                </div>
              }
              title="현대오일뱅크 송파"
              status={{ label: "미배송", color: "#D4183D" }}
              trailing={
                <span className="text-[14px] font-bold text-foreground">
                  650K
                </span>
              }
            />
          </div>
        </Section>

        {/* ---- Section 9: EmptyState ---- */}
        <Section
          id="empty-state"
          title="9. EmptyState"
          description="데이터가 없을 때 표시되는 안내 패턴."
        >
          <div className="max-w-[420px] rounded-2xl border border-border bg-card">
            <EmptyState
              icon={Inbox}
              title="주문이 없습니다"
              description="아직 접수된 주문이 없습니다. 새 주문을 등록해보세요."
              action={<Button>주문 추가</Button>}
            />
          </div>
        </Section>

        {/* ---- Section 10: Shadows & Radius ---- */}
        <Section
          id="shadows-radius"
          title="10. Shadows & Radius"
          description="그림자 단계와 라운딩 토큰 시각화."
        >
          {/* Shadows */}
          <div className="mb-9">
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">
              Shadow Levels
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {(
                [
                  {
                    name: "card",
                    token: "--shadow-card",
                    shadow: "0 1px 3px rgba(0,0,0,0.04)",
                  },
                  {
                    name: "card-hover",
                    token: "--shadow-card-hover",
                    shadow: "0 2px 4px rgba(0,0,0,0.08)",
                  },
                  {
                    name: "elevated",
                    token: "--shadow-elevated",
                    shadow: "0 4px 12px rgba(0,0,0,0.08)",
                  },
                  {
                    name: "modal",
                    token: "--shadow-modal",
                    shadow: "0 8px 24px rgba(0,0,0,0.12)",
                  },
                ] as const
              ).map((s) => (
                <div
                  key={s.name}
                  className="flex flex-col items-center gap-3"
                >
                  <div
                    className="size-24 rounded-2xl bg-card flex items-center justify-center"
                    style={{ boxShadow: s.shadow }}
                  >
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {s.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center font-medium">
                    {s.token}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">
              Border Radius Scale
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {(
                [
                  { name: "sm", cls: "rounded-sm", desc: "6px" },
                  { name: "md", cls: "rounded-md", desc: "8px" },
                  { name: "lg", cls: "rounded-lg", desc: "10px" },
                  { name: "xl", cls: "rounded-xl", desc: "14px" },
                  { name: "2xl", cls: "rounded-2xl", desc: "16px" },
                  { name: "full", cls: "rounded-full", desc: "9999px" },
                ] as const
              ).map((r) => (
                <div
                  key={r.name}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className={cn(
                      r.cls,
                      "size-16 bg-brand/10 border-2 border-brand/30",
                    )}
                  />
                  <p className="text-[11px] font-bold text-foreground">
                    {r.cls}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Footer */}
        <footer className="pt-6 pb-12 border-t border-border">
          <p className="text-[12px] text-muted-foreground">
            StyleSeed &mdash; Showcase generated for reference.
          </p>
        </footer>
      </div>
    </div>
  )
}

export { Showcase }
export default Showcase
