import React from "react";

export type DialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

export function Dialog({ open = true, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Backdrop — clicking it closes the dialog */}
      <div
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={() => onOpenChange?.(false)}
      />
      {/* Content — sits above backdrop */}
      <div style={{ position: 'relative', zIndex: 10, backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-border)' }}>
        {children}
      </div>
    </div>
  );
}

export default Dialog;
