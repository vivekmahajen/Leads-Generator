import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, parseCSVRows } from '../lib/csv.js';

test('parses simple rows into objects keyed by normalized header', () => {
  const rows = parseCSV('First Name,Email\nJane,jane@acme.com\nJohn,john@acme.com');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { first_name: 'Jane', email: 'jane@acme.com' });
  assert.equal(rows[1].first_name, 'John');
});

test('handles quoted fields with commas and escaped quotes', () => {
  const csv = 'name,notes\n"Doe, Jane","Said ""hi"" today"';
  const rows = parseCSV(csv);
  assert.equal(rows[0].name, 'Doe, Jane');
  assert.equal(rows[0].notes, 'Said "hi" today');
});

test('handles embedded newlines inside quotes', () => {
  const rows = parseCSV('name,notes\n"Jane","line1\nline2"');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].notes, 'line1\nline2');
});

test('handles CRLF line endings and skips blank rows', () => {
  const rows = parseCSV('a,b\r\n1,2\r\n\r\n3,4\r\n');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[1], { a: '3', b: '4' });
});

test('parseCSVRows returns raw cell arrays', () => {
  const rows = parseCSVRows('x,y\n1,2');
  assert.deepEqual(rows, [['x', 'y'], ['1', '2']]);
});

test('empty input yields no rows', () => {
  assert.deepEqual(parseCSV(''), []);
});
