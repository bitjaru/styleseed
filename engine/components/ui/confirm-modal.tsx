import * as React from "react"
import { cn } from "./utils"

interface ConfirmModalProps extends React.ComponentProps<"div"> {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string | string[]
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "확인",
  cancelText = "닫기",
  variant = "default",
  className,
  ...props
}: ConfirmModalProps) {
  const messages = Array.isArray(message) ? message : [message]

  if (!isOpen) return null

  return (
    <div
      data-slot="confirm-modal"
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className={cn(
          "bg-card rounded-2xl p-5 mx-4 max-w-sm w-full shadow-[var(--shadow-modal)]",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        <div className="flex flex-col gap-5 items-center text-center">
          {/* Content */}
          <div className="flex flex-col gap-2 items-center w-full">
            <h3 className="text-text-primary text-[16px] font-semibold leading-tight tracking-[-0.01em]">
              {title}
            </h3>
            <div className="text-text-secondary text-[14px] leading-normal">
              {messages.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>

          {/* Buttons — 토스 규칙: 좌측=닫기, 우측=확인 */}
          <div className="flex gap-2 w-full">
            <button
              onClick={onCancel}
              className="flex-1 h-11 rounded-full text-[16px] font-semibold border border-brand text-brand bg-card active:bg-brand/8 transition-colors duration-150"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                "flex-1 h-11 rounded-full text-[16px] font-semibold text-white active:opacity-85 transition-colors duration-150",
                variant === "destructive" ? "bg-destructive" : "bg-brand",
              )}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ConfirmModal }
export type { ConfirmModalProps }
