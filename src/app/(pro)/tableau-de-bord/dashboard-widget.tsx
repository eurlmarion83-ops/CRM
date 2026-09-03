export function DashboardWidget({
  title,
  color,
  icon,
  children,
  className = "",
}: {
  title: string;
  color: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: color }}>
        {icon && <span aria-hidden>{icon}</span>}
        {title}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm italic text-slate-400">{children}</p>;
}
