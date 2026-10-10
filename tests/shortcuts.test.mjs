import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchShortcut, readModifiers } from '../src/utils/shortcuts.ts';

function match(key, opts = {}) {
  const event = { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...opts };
  return matchShortcut(event, readModifiers(event))?.action;
}

test('Ctrl+T opens Free Transform instead of selecting the Type tool', () => {
  assert.equal(match('t', { ctrlKey: true }), 'edit.transform');
  assert.equal(match('t'), 'text');
});
test('Shift+F5 fills with foreground; Photoshop editing shortcuts work', () => {
  assert.equal(match('F5', { shiftKey: true }), 'edit.fill');
  assert.equal(match('z', { ctrlKey: true }), 'edit.undo');
  assert.equal(match('z', { ctrlKey: true, shiftKey: true }), 'edit.redo');
  assert.equal(match('s', { ctrlKey: true }), 'file.save');
});
test('tool shortcuts do not consume modified keystrokes', () => {
  assert.equal(match('b', { ctrlKey: true }), undefined);
  assert.equal(match('t', { shiftKey: true }), undefined);
});
