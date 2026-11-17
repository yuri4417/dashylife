import { useEffect, useId, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';

export function TimeInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState('09');
  const [minutes, setMinutes] = useState('00');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => panel.current?.scrollIntoView({ block: 'nearest' }));
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', dismiss); };
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const apply = () => {
    if (hours === '' || minutes === '' || !/^\d{1,2}$/.test(hours) || !/^\d{1,2}$/.test(minutes) || Number(hours) > 23 || Number(minutes) > 59) return;
    onChange(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`);
    close();
  };
  const valid = hours !== '' && minutes !== '' && /^\d{1,2}$/.test(hours) && /^\d{1,2}$/.test(minutes) && Number(hours) <= 23 && Number(minutes) <= 59;
  return <div className="time-input" ref={root} onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); close(); } }}>
    <button type="button" className="time-trigger" ref={trigger} aria-label={`${label}: ${value || 'sem horário'}`} aria-expanded={open} aria-controls={panelId} onClick={() => { if (!open) { const [h, m] = (value || '09:00').split(':'); setHours(h); setMinutes(m); } setOpen(!open); }}><span className={value ? '' : 'date-placeholder'}>{value || 'Selecionar horário'}</span><Clock3 size={18} aria-hidden="true"/></button>
    {open && <div ref={panel} className="time-panel" id={panelId} role="group" aria-label={`Selecionar ${label.toLowerCase()}`}>
      <p className="time-panel-title">Escolha o horário</p>
      <div className="time-parts"><label>Hora<input type="number" inputMode="numeric" aria-label={`Hora de ${label.toLowerCase()}`} min="0" max="23" value={hours} onChange={e => setHours(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}/></label><span aria-hidden="true">:</span><label>Minuto<input type="number" inputMode="numeric" aria-label={`Minuto de ${label.toLowerCase()}`} min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}/></label></div>
      <div className="time-panel-actions"><button type="button" onClick={() => { onChange(''); close(); }}>Limpar</button><button type="button" className="time-apply" disabled={!valid} onClick={apply}>Aplicar</button></div>
    </div>}
  </div>;
}
