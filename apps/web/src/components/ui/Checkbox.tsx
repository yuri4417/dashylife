import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  ariaLabel?: string;
}

export function Checkbox({ checked, onChange, label, ariaLabel }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="relative flex h-5 w-5 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={ariaLabel ?? label}
          className="peer h-5 w-5 appearance-none cursor-pointer rounded-md border-2 border-border transition-colors hover:border-tertiary checked:border-accent checked:bg-accent"
        />
        <Check
          className="pointer-events-none absolute left-0.5 top-0.5 h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
          strokeWidth={3}
        />
      </span>
      {label && <span className="text-sm font-medium text-tertiary">{label}</span>}
    </label>
  );
}
