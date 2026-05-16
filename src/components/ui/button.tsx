import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,background-color,border-color,box-shadow] outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:ring-2 focus-visible:ring-ring",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-10 px-4 py-2",
        icon: "size-10",
        sm: "h-9 px-3",
      },
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:opacity-95",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        outline:
          "border border-border/80 bg-card/70 text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:opacity-95",
      },
    },
  },
);

function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp className={cn(buttonVariants({ className, size, variant }))} {...props} />;
}

export { Button, buttonVariants };
