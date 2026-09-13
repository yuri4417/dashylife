export function MobileHeader() {
  return (
    <header className="md:hidden flex items-center gap-2.5 h-14 px-4 flex-shrink-0 bg-surface/80 backdrop-blur-xl border-b border-border-subtle">
      <svg
        className="w-5 h-5 text-accent flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
      <h1 className="font-display text-base font-semibold tracking-tight text-primary">DashyLife</h1>
    </header>
  );
}
