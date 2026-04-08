/**
 * StyleSeed — Custom SVG Icon Library
 * Standalone icon set usable without Lucide.
 * All icons: 24x24 viewBox, stroke-based, currentColor inheritance.
 */
import * as React from "react"

export interface IconProps {
  size?: number | string
  color?: string
  className?: string
  strokeWidth?: number
}

const defaultProps = { size: 24, color: "currentColor", strokeWidth: 2 }

// ── Arrow ──────────────────────────────────────
export function ArrowRight({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M9 5l7 7-7 7" /></svg>
}
export function ArrowLeft({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15 19l-7-7 7-7" /></svg>
}
export function ArrowUp({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M5 15l7-7 7 7" /></svg>
}
export function ArrowDown({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M19 9l-7 7-7-7" /></svg>
}

// ── Navigation ──────────────────────────────────
export function Home({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
}
export function Search({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
}
export function User({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
}
export function Bell({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
}
export function Settings({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
export function Menu({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M4 6h16M4 12h16M4 18h16" /></svg>
}

// ── Action ──────────────────────────────────────
export function Close({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M6 18L18 6M6 6l12 12" /></svg>
}
export function Check({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M5 13l4 4L19 7" /></svg>
}
export function Plus({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 4v16m8-8H4" /></svg>
}
export function Minus({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M20 12H4" /></svg>
}
export function MoreVertical({ size = defaultProps.size, color = defaultProps.color, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
}

// ── Status ──────────────────────────────────────
export function Info({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
export function AlertCircle({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
export function AlertTriangle({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
}
export function CheckCircle({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}

// ── File & Data ──────────────────────────────────
export function Upload({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
}
export function Download({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
}
export function Calendar({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
}
export function Document({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
}

// ── Visibility ──────────────────────────────────
export function EyeOpen({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
}
export function EyeClosed({ size = defaultProps.size, color = defaultProps.color, strokeWidth = defaultProps.strokeWidth, className }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
}
