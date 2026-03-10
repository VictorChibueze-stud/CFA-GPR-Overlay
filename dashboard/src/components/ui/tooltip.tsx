import React from "react";

export function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      {children}
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-black text-white text-xs px-2 py-1 whitespace-nowrap">{content}</span>
    </span>
  );
}

export default Tooltip;
