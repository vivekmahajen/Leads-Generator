import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractReferencedIds, idVariants, looksLikeBounce, extractEmails, isAutoReply } from '../lib/outreach/gmailParse.js';

test('extractReferencedIds pulls In-Reply-To + References ids', () => {
  const headers = [
    'From: lead@acme.com',
    'Subject: Re: Hi',
    'In-Reply-To: <lf-abc@mail.test>',
    'References: <lf-abc@mail.test> <lf-xyz@mail.test>',
  ].join('\n');
  const ids = extractReferencedIds(headers);
  assert.deepEqual(ids.sort(), ['<lf-abc@mail.test>', '<lf-xyz@mail.test>']);
});

test('idVariants covers bracketed + bare forms', () => {
  assert.deepEqual(idVariants('<a@b>').sort(), ['<a@b>', '<a@b>', 'a@b'].sort());
});

test('looksLikeBounce detects daemon senders and failure subjects', () => {
  assert.equal(looksLikeBounce({ from: 'mailer-daemon@googlemail.com', subject: 'x' }), true);
  assert.equal(looksLikeBounce({ from: 'a@b.com', subject: 'Delivery Status Notification (Failure)' }), true);
  assert.equal(looksLikeBounce({ from: 'lead@acme.com', subject: 'Re: your note' }), false);
});

test('extractEmails finds + lowercases + dedupes', () => {
  assert.deepEqual(extractEmails('to Bob@Acme.com and bob@acme.com, x@y.io'), ['bob@acme.com', 'x@y.io']);
});

test('isAutoReply catches Re: subjects', () => {
  assert.equal(isAutoReply('Re: Hi'), true);
  assert.equal(isAutoReply('Hi'), false);
});
