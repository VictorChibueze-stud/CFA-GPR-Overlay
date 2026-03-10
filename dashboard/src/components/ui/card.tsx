import React from "react";

export function Card({ children }: { children?: React.ReactNode }) {
  return <div className="rounded-lg bg-panel p-4 shadow-sm">{children}</div>;
}

export default Card;
