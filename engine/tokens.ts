/**
 * StyleSeed / Toss — TypeScript Design Tokens
 * TS token object synced with CSS variables (theme.css).
 * Use for dynamic styling, chart colors, conditional styles in components.
 */

export const tokens = {
  colors: {
    brand: "#721FE5",
    brandTint: "#F0E8FF",

    text: {
      primary: "#3C3C3C",
      secondary: "#6A6A6A",
      tertiary: "#7A7A7A",
      disabled: "#9B9B9B",
    },

    icon: {
      default: "#4A5568",
    },

    surface: {
      page: "#FAFAFA",
      card: "#FFFFFF",
      subtle: "#FAFAF9",
      muted: "#E8E6E1",
    },

    status: {
      success: "#6B9B7A",
      destructive: "#D4183D",
      warning: "#D97706",
      info: "#3B82F6",
      alertBadge: "#FF4444",
    },

    chart: {
      gray: ["#D4D4D4", "#A8A8A8", "#8B8B8B", "#6B6B6B"],
    },
  },

  typography: {
    fontFamily: {
      sans: "'Pretendard', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      "2xs": 10,
      xs: 11,
      sm: 12,
      caption: 13,
      base: 14,
      body: 15,
      md: 16,
      subhead: 17,
      lg: 18,
      xl: 20,
      "2xl": 24,
      "3xl": 30,
      "4xl": 36,
      "5xl": 48,
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  spacing: {
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    24: 96,
  },

  borderRadius: {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 14,
    "2xl": 16,
    full: 9999,
  },

  shadows: {
    card: "0 1px 3px rgba(0,0,0,0.04)",
    button: "0 1px 3px rgba(0,0,0,0.06)",
    cardHover: "0 2px 4px rgba(0,0,0,0.08)",
    elevated: "0 4px 12px rgba(0,0,0,0.08)",
    modal: "0 8px 24px rgba(0,0,0,0.12)",
  },

  duration: {
    fast: 100,
    normal: 200,
    moderate: 300,
    slow: 350,
  },

  easing: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const

export type Tokens = typeof tokens
