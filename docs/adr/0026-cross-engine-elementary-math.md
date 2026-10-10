# ADR 0026: Software exp, log, sin, and cos

## Status

Accepted.

## Context

Chrome 148 and Node 25, both V8, disagree by about one unit in the last place on `Math.sin`, `Math.cos`, `Math.log`,
and `Math.exp`. Square root and `**` matched bit for bit on that pair. The seeded generator turns log, sin, and cos
into normal and lognormal draws, and the adoption curve, task gain, welfare, and money-choice softmax call exp or log.

Fiat money is integer cents, so that noise usually rounds away. Bitcoin and a fiat-to-bitcoin transition keep satoshi
doubles. On those paths the same seed then disagrees: year-20 unemployment over 10 seeds moved by 0.1–0.2 percentage
points, while cent-denominated scenarios stayed identical.

## Decision

- `packages/core` computes exp, log, sin, and cos in software from addition, subtraction, multiplication, and division.
- The generator, adoption curve, task gain, bequest fallback, welfare, and money-choice softmax call those helpers.
- Platform `Math.exp`, `Math.log`, `Math.sin`, `Math.cos`, and `Math.pow` are rejected outside tests.
- `**` and `Math.sqrt` stay on the platform. They were bit-identical across the engines above, and an integer power of
  two is exact.
- Inventory and overstaff sorts break ties by firm id. Firms are already in id order, so this matches a stable sort.

## Consequences

A seed produces the same doubles in Node and in Chrome. The kernels stay within one unit in the last place of Node
25's library. On the two satoshi scenarios, the seed-1 series and year-20 unemployment for seeds 1 through 10 match
that library bit for bit, so those Node results stay put and Chrome moves to them. A different seed can still differ
from an older host library where that one-unit gap lands on a rounding boundary. The year-20 checksum records the
software path.
