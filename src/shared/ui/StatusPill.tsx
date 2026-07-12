export function StatusPill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: bg, color: fg }}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: fg }} aria-hidden="true" />
      {label}
    </span>
  );
}
