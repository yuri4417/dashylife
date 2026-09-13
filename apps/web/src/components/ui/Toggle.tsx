interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, onChange, disabled = false, className = '' }: ToggleProps) {
  if (disabled) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled
        tabIndex={-1}
        className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ${checked ? 'bg-accent' : 'bg-border'} opacity-50 cursor-not-allowed ${className}`}
      >
        <span
          className={`inline-block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`}
          aria-hidden="true"
        />
      </button>
    );
  }

  const toggle = () => onChange(!checked);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ${checked ? 'bg-accent' : 'bg-border'} cursor-pointer ${className}`}
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        aria-hidden="true"
      />
    </button>
  );
}
