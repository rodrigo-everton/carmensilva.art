import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type ButtonVariant = "white" | "red" | "orange" | "green" | "ghostwhite" | "ghostblack";
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
  white: "bg-white text-red hover:bg-red hover:text-white",
  red: "bg-red text-white hover:bg-red-hover hover:text-white-secondary",
  orange: "bg-orange text-white hover:bg-orange-hover hover:text-white-secondary",
  green: "bg-green text-white hover:bg-green-hover hover:text-white-secondary",
  ghostblack: "bg-transparent text-black border-2 hover:text-red",
  ghostwhite: "bg-transparent text-white border-2 hover:bg-white hover:text-red",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

function hasDisplayClass(className?: string) {
  return className
    ?.split(/\s+/)
    .some((classToken) =>
      displayClasses.has(classToken.split(":").at(-1) ?? ""),
    );
}

function getButtonClasses({
  className,
  variant = "ghostblack",
  size = "md",
}: ButtonBaseProps & { className?: string }) {
  return [
    hasDisplayClass(className) ? undefined : "inline-flex",
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: ButtonProps) {
  if (typeof props.href === "string") {
    const { className, variant, size, ...linkProps } = props;
    const classes = getButtonClasses({ className, variant, size });

    return <a className={classes} {...linkProps} />;
  }

  const { className, variant, size, type = "button", ...buttonProps } = props;
  const classes = getButtonClasses({ className, variant, size });

  return (
    <button
      type={type}
      className={classes}
      {...buttonProps}
    />
  );
}