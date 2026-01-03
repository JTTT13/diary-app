import test from 'node:test'
import assert from 'node:assert/strict'
import { clampVisibleCount } from '../src/lib/listPerf.js'

test('clampVisibleCount: caps restore count for cold start', () => {
  assert.equal(clampVisibleCount(100, { pageSize: 20, maxInitial: 40 }), 40)
})

test('clampVisibleCount: keeps small counts unchanged', () => {
  assert.equal(clampVisibleCount(20, { pageSize: 20, maxInitial: 40 }), 20)
  assert.equal(clampVisibleCount(39, { pageSize: 20, maxInitial: 40 }), 39)
})

test('clampVisibleCount: never below pageSize (unless total is smaller)', () => {
  assert.equal(clampVisibleCount(1, { pageSize: 20, maxInitial: 40, total: 100 }), 20)
  assert.equal(clampVisibleCount(1, { pageSize: 20, maxInitial: 40, total: 10 }), 10)
})