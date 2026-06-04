import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7E67] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-[#FF7E67] text-white shadow-[0_8px_18px_rgba(255,126,103,0.25)] hover:bg-[#ff6f56] hover:shadow-[0_10px_22px_rgba(255,126,103,0.3)]",
        secondary:
          "bg-[#4ECDC4] text-[#302E2B] shadow-[0_8px_18px_rgba(78,205,196,0.22)] hover:bg-[#3fc3ba]",
        outline:
          "border border-[#F0EDE9] bg-white text-foreground hover:border-[#FF7E67]/40 hover:bg-[#FFF3EF]",
        ghost: "shadow-none hover:bg-[#FFF3EF] hover:text-[#FF7E67]"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
