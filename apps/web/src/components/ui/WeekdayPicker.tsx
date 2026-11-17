const days = [
  { value: 0, short: 'Dom', name: 'Domingo' }, { value: 1, short: 'Seg', name: 'Segunda-feira' },
  { value: 2, short: 'Ter', name: 'Terça-feira' }, { value: 3, short: 'Qua', name: 'Quarta-feira' },
  { value: 4, short: 'Qui', name: 'Quinta-feira' }, { value: 5, short: 'Sex', name: 'Sexta-feira' },
  { value: 6, short: 'Sáb', name: 'Sábado' },
];

export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  return <fieldset className="weekday-picker"><legend>Dias da semana</legend><div className="weekday-options">{days.map(day => <button type="button" key={day.value} aria-label={day.name} aria-pressed={value.includes(day.value)} onClick={() => onChange(value.includes(day.value) ? value.filter(d => d !== day.value) : [...value, day.value].sort((a, b) => a - b))}>{day.short}</button>)}</div><p>Sem seleção, repete no dia da data informada. Na primeira semana, são considerados apenas os dias a partir dessa data.</p></fieldset>;
}
