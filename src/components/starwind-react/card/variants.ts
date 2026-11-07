import { tv } from "tailwind-variants";

export const card = tv({
  base: [
    "bg-card text-card-foreground group/card ring-border flex flex-col gap-(--card-spacing) rounded-xl py-(--card-spacing) ring-1",
    "has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0",
    "*:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  ],
  variants: {
    size: {
      sm: "[--card-spacing:--spacing(4)] text-sm",
      md: "[--card-spacing:--spacing(5)]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});
