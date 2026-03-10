import React from "react";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-auto">
      <table className="min-w-full divide-y divide-slate-200">{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="bg-panel text-muted-foreground">{children}</thead>
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TableRow({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props}>{children}</tr>
}

export function TableHead({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { className?: string }) {
  return <th className={className} {...props}>{children}</th>
}

export function TableCell({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { className?: string }) {
  return (
    <td className={className} {...props}>
      {children}
    </td>
  )
}

export default Table;
