import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border px-3 py-2",
          "focus:outline-none focus:ring-2 transition-colors shadow-sm",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        style={{
          backgroundColor: 'var(--input-bg)',
          color: 'var(--input-text)',
          borderColor: 'var(--input-border)',
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
