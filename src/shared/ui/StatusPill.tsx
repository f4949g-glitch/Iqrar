export function StatusPill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: bg, color: fg }}>
      {label}
    </span>
  );
}
