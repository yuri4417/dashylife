function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function getFullDate(): string {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function HeroTile() {
  return (
    <section className="rounded-xl border border-border-subtle bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-tertiary">Visão geral</p>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {getGreeting()}
          </h2>
          <p className="mt-1 text-sm text-tertiary">{getFullDate()}</p>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-tertiary sm:text-right">
          Seu painel de jogos e tarefas em um só lugar.
        </p>
      </div>
    </section>
  );
}
