/** Input — Fluent dark text field. */

import * as React from "react";
import { cn } from "@/utils/cn";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "difr-focus-ring h-7 w-full rounded-md border border-stroke bg-surface-2 px-2 text-[12px] text-foreground",
      "placeholder:text-foreground-disabled hover:border-stroke-strong focus:border-accent",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
