import type { ReactNode } from "react";

export default function PageHeader({
  title,
  left,
  children,
}: {
  title: string;
  left?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="topbar">
      <div className="crumbs">
        {left}
        <h1>{title}</h1>
      </div>
      <div className="row">{children}</div>
    </div>
  );
}
