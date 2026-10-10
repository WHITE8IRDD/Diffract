/**
 * Button — shadcn/ui primitive restyled for the Fluent dark shell.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "difr-focus-ring difr-press inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[12px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active",
        secondary:
          "bg-surface-3 text-foreground hover:bg-surface-hover active:bg-surface-active border border-stroke",
        outline:
          "border border-stroke bg-transparent text-foreground hover:bg-surface-hover",
        ghost: "bg-transparent text-foreground-secondary hover:bg-surface-hover hover:text-foreground",
        destructive:
          "bg-destructive text-accent-fg hover:bg-destructive-hover",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-7 px-3",
        sm: "h-6 px-2 text-[11px]",
        lg: "h-8 px-4",
        icon: "h-7 w-7",
        iconSm: "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
