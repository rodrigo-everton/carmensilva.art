import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type ButtonVariant = "red" | "orange" | "green" | "ghostwhite" | "ghostblack";
type ButtonSize = "sm" | "md" | "lg";

type ButtonBaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

type ButtonAsButtonProps = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type ButtonAsLinkProps = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const baseClasses = "items-center justify-center rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50"

const displayClasses = new Set([
  "hidden",
  "block",
  "inline-block",
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
]);

const variantClasses: Record<ButtonVariant, string> = {
  red: "bg-red text-white hover:bg-red-hover hover:text-white-secondary",
  orange: "bg-orange text-white hover:bg-orange-hover hover:text-white-secondary",
  green: "bg-green text-white hover:bg-green-hover hover:text-white-secondary",
  ghostblack: "bg-transparent text-black border-2 hover:text-red",
  ghostwhite: "bg-transparent text-white border-2 hover:text-white-secondary",
}

