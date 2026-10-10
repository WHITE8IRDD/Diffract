/** Slider — Fluent-styled range control (used for opacity, size, flow). */

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/utils/cn";

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center py-1",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-stroke-strong">
      <SliderPrimitive.Range className="absolute h-full bg-accent" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="difr-focus-ring block h-3.5 w-3.5 rounded-full border-2 border-background bg-accent shadow transition-transform hover:scale-110"
      aria-label="value"
    />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";

export { Slider };
