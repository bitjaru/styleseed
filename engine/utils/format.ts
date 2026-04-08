/**
 * StyleSeed / Toss — Formatting Utilities
 * Number, date, and trend formatters.
 * Includes Korean (KRW) formatters and generic currency/locale support.
 */

// ── Currency Formatting ──────────────────────────────

/** Korean Won abbreviated format (3,500원 / 1,870만원 / 3.8억원 / 1.2조원) */
export function formatKRW(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""

  if (abs >= 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000_000).toFixed(1)}조원`
  }
  if (abs >= 100_000_000) {
    return `${sign}${(abs / 100_000_000).toFixed(1)}억원`
  }
  if (abs >= 10_000) {
    return `${sign}${Math.round(abs / 10_000).toLocaleString()}만원`
  }
  return `${sign}${abs.toLocaleString()}원`
}

/** Split number and unit for JSX (big number + small unit pattern) */
export function splitNumberUnit(value: number): { number: string; unit: string } {
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""

  if (abs >= 1_000_000_000_000) {
    return { number: `${sign}${(abs / 1_000_000_000_000).toFixed(1)}`, unit: "조원" }
  }
  if (abs >= 100_000_000) {
    return { number: `${sign}${(abs / 100_000_000).toFixed(1)}`, unit: "억원" }
  }
  if (abs >= 10_000) {
    return { number: `${sign}${Math.round(abs / 10_000).toLocaleString()}`, unit: "만원" }
  }
  return { number: `${sign}${abs.toLocaleString()}`, unit: "원" }
}

/** Thousand separator formatting (1,870 / 3,500) */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Generic currency formatter (locale-aware) */
export function formatCurrency(value: number, locale = "en-US", currency = "USD"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value)
}

// ── Percent & Trend ──────────────────────────────────

/** Trend percent (+12.4% / -3.2%) */
export function formatPercent(value: number, decimals = 1): string {
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${value.toFixed(decimals)}%`
}

/** Trend direction */
export function getTrendDirection(value: number): "up" | "down" | "neutral" {
  if (value > 0) return "up"
  if (value < 0) return "down"
  return "neutral"
}

// ── Date Formatting ──────────────────────────────────

/** Korean date format (2026년 3월 27일 금요일) */
export function formatDateKR(date: Date): string {
  const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = weekdays[date.getDay()]
  return `${y}년 ${m}월 ${d}일 ${w}`
}

/** Generic date format (locale-aware) */
export function formatDate(date: Date, locale = "en-US"): string {
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric", weekday: "long" })
}

/** Chart axis date (03/20) */
export function formatDateShort(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${m}/${d}`
}

/** Relative time (just now, 3m ago, 2h ago, yesterday, Mar 20) */
export function formatRelativeTime(date: Date, locale: "ko" | "en" = "en"): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (locale === "ko") {
    if (minutes < 1) return "방금 전"
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days === 1) return "어제"
    if (days < 7) return `${days}일 전`
    return `${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** Date range (3/20 ~ 3/27) */
export function formatDateRange(start: Date, end: Date): string {
  return `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`
}
