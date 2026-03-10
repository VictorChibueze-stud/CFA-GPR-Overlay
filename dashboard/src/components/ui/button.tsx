import React from "react";
import clsx from "clsx";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  const base = "inline-flex items-center px-3 py-2 rounded-md text-sm font-medium";
  const variantCls = variant === "ghost" ? "bg-transparent" : "bg-slate-700 text-white";
  return <button className={clsx(base, variantCls, className)} {...props} />;
}

export default Button;
