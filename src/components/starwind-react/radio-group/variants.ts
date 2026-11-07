import { tv } from "tailwind-variants";

export const radioGroup = tv({
  base: "group/radio-group disabled:cursor-not-allowed disabled:opacity-70",
  variants: {
    orientation: {
      vertical: "grid gap-3",
      horizontal: "flex flex-row items-center gap-3",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});
