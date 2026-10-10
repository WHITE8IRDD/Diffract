/** Switch — Fluent toggle. */

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/utils/cn";

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "difr-focus-ring peer inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-stroke-strong transition-colors",
      "data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-3",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-3 w-3 rounded-full bg-foreground shadow-lg ring-0 transition-transform",
        "data-[state=checked]:translate-x-3.5 data-[state=checked]:bg-accent-fg",
        "data-[state=unchecked]:translate-x-0.5",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export { Switch };
