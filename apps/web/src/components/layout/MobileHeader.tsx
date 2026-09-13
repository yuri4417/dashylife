export function MobileHeader() {
  return (
    <header className="md:hidden flex h-14 flex-shrink-0 items-center gap-2.5 border-b border-border-subtle bg-surface px-4">
      <svg
        className="h-5 w-5 flex-shrink-0 text-accent"
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
