import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Todo } from '@dashylife/shared';
import { todoOccursOn } from '../src/utils/todoSchedule.ts';

const todo: Todo = { id: '1', title: 'Rotina', completed: false, dueDate: '2026-11-16', repetition: { type: 'weeks', interval: 2, weekdays: [1, 3, 5] }, createdAt: '', updatedAt: '' };
test('shows selected weekdays in active weeks and not in skipped weeks', () => {
  for (const date of ['2026-11-16', '2026-11-18', '2026-11-20', '2026-11-30', '2026-12-02', '2026-12-04']) assert.equal(todoOccursOn(todo, date), true, date);
  for (const date of ['2026-11-15', '2026-11-17', '2026-11-23', '2026-11-25', '2026-11-27']) assert.equal(todoOccursOn(todo, date), false, date);
});
test('completed instances do not project and the next pending instance keeps the cadence', () => {
  assert.equal(todoOccursOn({ ...todo, completed: true }, '2026-11-18'), false);
  const next = { ...todo, dueDate: '2026-11-18T00:00:00.000Z' };
  assert.equal(todoOccursOn(next, '2026-11-20'), true);
  assert.equal(todoOccursOn(next, '2026-11-23'), false);
  assert.equal(todoOccursOn(next, '2026-11-30'), true);
});
test('normal and legacy tasks appear only on their stored date', () => {
  for (const repetition of [undefined, { type: 'weeks' as const, interval: 1 }]) {
    assert.equal(todoOccursOn({ ...todo, repetition }, '2026-11-16'), true);
    assert.equal(todoOccursOn({ ...todo, repetition }, '2026-11-23'), false);
  }
});

test('treats Sunday as the start of the week and handles the year boundary', () => {
  const weekend = { ...todo, dueDate: '2026-12-26', repetition: { type: 'weeks' as const, interval: 2, weekdays: [0, 1] } };
  assert.equal(todoOccursOn(weekend, '2026-12-27'), false);
  assert.equal(todoOccursOn(weekend, '2026-12-28'), false);
  assert.equal(todoOccursOn(weekend, '2027-01-03'), true);
  assert.equal(todoOccursOn(weekend, '2027-01-04'), true);
  assert.equal(todoOccursOn(weekend, '2027-01-10'), false);
});
