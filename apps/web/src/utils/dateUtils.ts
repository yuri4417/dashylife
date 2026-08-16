export type DueStatus = 'overdue' | 'due-soon' | 'on-time';

export function getDueStatus(dueDate: string): DueStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'overdue';
  } else if (diffDays <= 2) {
    return 'due-soon';
  } else {
    return 'on-time';
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const days = [
    'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb',
  ];
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  const day = days[date.getUTCDay()];
  const month = months[date.getUTCMonth()];
  const dayNumber = date.getUTCDate();
  const year = date.getUTCFullYear();

  return `${dayNumber} ${month} ${year} - ${day}`;
}

export function isOverdue(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return due.getTime() < today.getTime();
}
