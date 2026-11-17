import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dateString, visibleRange } from '../src/utils/calendarDates.ts';
import { todoOccursOn } from '../src/utils/todoSchedule.ts';
import type { Todo } from '@dashylife/shared';

test('weekly and monthly calendar rows start on Sunday and end on Saturday', () => {
  const [start, end] = visibleRange(new Date(2026, 10, 20), 'week');
  assert.equal(dateString(start), '2026-11-15');
  assert.equal(dateString(end), '2026-11-21');
  const [monthStart, monthEnd] = visibleRange(new Date(2026, 10, 1), 'month');
  assert.equal(monthStart.getDay(), 0);
  assert.equal(monthEnd.getDay(), 6);
});

test('Sunday and Friday both fall within every active fortnight', () => {
  const todo: Todo = { id: '1', title: 'Exemplo', completed: false, dueDate: '2026-11-15', repetition: { type: 'weeks', interval: 2, weekdays: [0, 5] }, createdAt: '', updatedAt: '' };
  for (const [date, expected] of [['2026-11-15', true], ['2026-11-20', true], ['2026-11-22', false], ['2026-11-27', false], ['2026-11-29', true], ['2026-12-04', true], ['2026-12-06', false]] as const) assert.equal(todoOccursOn(todo, date), expected, date);
  assert.equal(dateString(visibleRange(new Date(2026, 10, 15), 'week')[0]), dateString(visibleRange(new Date(2026, 10, 20), 'week')[0]));
  assert.equal(dateString(visibleRange(new Date(2026, 10, 29), 'week')[0]), dateString(visibleRange(new Date(2026, 11, 4), 'week')[0]));
});
