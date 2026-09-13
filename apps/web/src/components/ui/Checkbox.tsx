import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  ariaLabel?: string;
}

export function Checkbox({ checked, onChange, label, ariaLabel }: CheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <span className="relative flex items-center justify-center w-5 h-5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={ariaLabel ?? label}
          className="appearance-none w-5 h-5 border-2 border-border rounded cursor-pointer transition-colors checked:bg-accent checked:border-accent peer"
        />
        <Check
          className="w-3.5 h-3.5 text-white absolute left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
          strokeWidth={3}
        />
      </span>
      {label && <span className="text-sm font-medium text-tertiary">{label}</span>}
    </label>
  );
}
