import { Minus, Plus } from 'lucide-react';
import { Checkbox } from './Checkbox';
import { SelectInput } from './FormField';

export function RepeatInput({ enabled, onToggle, label, interval, onIntervalChange, unit, onUnitChange, options }: {
  enabled: boolean; onToggle: (enabled: boolean) => void; label: string; interval: number | string;
  onIntervalChange: (value: string) => void; unit: string; onUnitChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const number = Number(interval);
  return <div className="space-y-3"><Checkbox checked={enabled} onChange={onToggle} label={label}/>{enabled && <div className="grid grid-cols-2 gap-3">
    <div><label className="block text-xs font-medium text-tertiary mb-1.5">Intervalo</label><div className="number-stepper"><button type="button" aria-label="Diminuir intervalo" disabled={number <= 1} onClick={() => onIntervalChange(String(Math.max(1, number - 1)))}><Minus size={16}/></button><input type="number" aria-label="Intervalo da repetição" min={1} step={1} value={interval} onChange={event => onIntervalChange(event.target.value)} onBlur={() => onIntervalChange(String(Math.max(1, Math.floor(Number(interval) || 1))))}/><button type="button" aria-label="Aumentar intervalo" onClick={() => onIntervalChange(String(Math.max(1, number || 0) + 1))}><Plus size={16}/></button></div></div>
    <div><label className="block text-xs font-medium text-tertiary mb-1.5">Unidade</label><SelectInput value={unit} label="Unidade da repetição" onValueChange={onUnitChange}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectInput></div>
  </div>}</div>;
}
