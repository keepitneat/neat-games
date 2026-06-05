import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, cap } from './format.js';

test('formatTime: zero-padded mm:ss', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65000), '01:05');
  assert.equal(formatTime(600000), '10:00');
});

test('cap: capitalizes first letter; safe on empty string', () => {
  assert.equal(cap('easy'), 'Easy');
  assert.equal(cap('hard'), 'Hard');
  assert.equal(cap(''), '');
});
