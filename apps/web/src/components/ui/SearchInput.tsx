import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="relative mb-6 sm:mb-8">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 text-sm bg-surface border border-border text-primary placeholder-tertiary focus:outline-none focus:border-accent rounded-lg"
      />
    </div>
  );
}
