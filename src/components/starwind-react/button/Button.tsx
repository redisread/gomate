"use client";

import ButtonPrimitive from "@starwind-ui/react/button";
import type * as React from "react";
import type { VariantProps } from "tailwind-variants";
import { button } from "./variants";

type SharedProps = VariantProps<typeof button> & {
  "data-slot"?: string;
  focusableWhenDisabled?: boolean;
  disabled?: boolean;
};
type NativeButtonProps = React.ComponentPropsWithRef<"button"> &
  SharedProps & { as?: "button"; href?: never };
type LinkButtonProps = React.ComponentPropsWithRef<"a"> &
  SharedProps & { as?: "a"; href: string };
export type ButtonProps = NativeButtonProps | LinkButtonProps;

function Button(props: NativeButtonProps): React.JSX.Element;
function Button(props: LinkButtonProps): React.JSX.Element;
function Button(props: ButtonProps) {
  const {
    variant,
    size,
    as: buttonAs,
    href,
    disabled = false,
    focusableWhenDisabled,
    "data-slot": dataSlot = "button",
    ref,
    tabIndex,
    className,
    children,
    ...rest
  } = props;

  if (buttonAs === "a" || href !== undefined) {
    return (
      <a
        className={button({ variant, size, class: className })}
        href={disabled ? undefined : href}
        aria-disabled={disabled ? "true" : undefined}
        data-disabled={disabled ? "" : undefined}
        {...(rest as React.ComponentPropsWithoutRef<"a">)}
        tabIndex={disabled ? -1 : tabIndex}
        ref={ref as React.Ref<HTMLAnchorElement>}
        data-slot={dataSlot}
      >
        {children}
      </a>
    );
  }

  return (
    <ButtonPrimitive.Root
      className={button({ variant, size, class: className })}
      disabled={disabled}
      focusableWhenDisabled={focusableWhenDisabled}
      tabIndex={tabIndex}
      ref={ref as React.Ref<HTMLButtonElement>}
      {...(rest as React.ComponentPropsWithoutRef<"button">)}
      data-slot={dataSlot}
    >
      {children}
    </ButtonPrimitive.Root>
  );
}

export default Button;
