import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-lg border px-3 py-2",
        "focus:outline-none focus:ring-2 transition-colors shadow-sm",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "text-base md:text-sm",
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
})
Textarea.displayName = "Textarea"

export { Textarea }
