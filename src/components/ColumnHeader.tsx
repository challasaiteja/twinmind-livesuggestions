interface ColumnHeaderProps {
  title: string;
  status: React.ReactNode;
}

export default function ColumnHeader({ title, status }: ColumnHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{title}</span>
      <div className="flex items-center gap-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        {status}
      </div>
    </div>
  );
}
