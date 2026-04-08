import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-bold transition-colors duration-150 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-brand/20",
  {
    variants: {
      variant: {
        // 토스 스타일: brandSolid — 키컬러 배경, 흰 텍스트
        default:
          "bg-brand text-white active:bg-brand/85 disabled:bg-surface-muted disabled:text-text-disabled",
        // neutralSolid — 어두운 배경, 흰 텍스트
        neutral:
          "bg-[#2A2A2A] text-white active:bg-[#3C3C3C] disabled:bg-surface-muted disabled:text-text-disabled dark:bg-[#E0E0E0] dark:text-[#121212] dark:active:bg-[#C0C0C0]",
        // neutralWeak — 연한 회색 배경, 어두운 텍스트
        secondary:
          "bg-[#F3F4F5] text-text-primary active:bg-[#EAEBEC] disabled:bg-surface-muted disabled:text-text-disabled dark:bg-[#2B2E35] dark:text-[#E0E0E0] dark:active:bg-[#393D46]",
        // criticalSolid — 위험 액션
        destructive:
          "bg-destructive text-white active:bg-destructive/85 focus-visible:ring-destructive/20 disabled:bg-surface-muted disabled:text-text-disabled",
        // outline — 테두리만
        outline:
          "border border-border bg-transparent text-text-primary active:bg-surface-muted/50 disabled:border-surface-muted disabled:text-text-disabled dark:border-white/8",
        // ghost — 배경/테두리 없음
        ghost:
          "bg-transparent text-text-primary active:bg-surface-muted/50 disabled:text-text-disabled",
        // brandGhost — 키컬러 텍스트, 배경 없음
        brandGhost:
          "bg-transparent text-brand active:bg-brand/8 disabled:text-text-disabled",
      },
      size: {
        // 토스 기준 4단계: xsmall(32) / small(36) / medium(40) / large(52)
        xs: "h-8 px-3.5 gap-1 text-[13px] rounded-full [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 px-3.5 gap-1 text-[14px] rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-10 px-4 gap-1.5 text-[14px] rounded-lg [&_svg:not([class*='size-'])]:size-4",
        lg: "h-[52px] px-5 gap-2 text-[18px] rounded-xl [&_svg:not([class*='size-'])]:size-[22px]",
        icon: "size-10 rounded-full [&_svg:not([class*='size-'])]:size-[18px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
