# ADR 0031: Wage adjustment follows expected vs unexpected deflation

## Status

Accepted.

## Context

Issue #10 found that a single partial-adjustment lag makes the economy-wide money wage fall year-over-year in most
bitcoin months. PR #20 answered that with firm-level downward nominal rigidity calibrated to fiat job-stayer cut rates
(about 2% a year). That was rejected: under hard money, nominal cuts are the normal adjustment, and fiat-era cut rates
are not a bitcoin target.

Gold-standard history splits in two. Under steady expected deflation (US/UK 1873–96) money wages drift down with
prices and real wages rise. After an unexpected deflationary shock (US 1929–33) money wages hold about 12–24 months,
then fall by less than prices (manufacturing −16.8% vs prices near −25%).

## Decision

- Keep one economy-wide wage index. Firm-level wages are not required for this shape.
- Keep `wage.nominalRigidity` as the shared raise/cut speed when there is no surprise.
- Freeze the posted wage while month-over-month inflation is more than two annual points below expected inflation.
  Once a hold starts it runs at least two thirds of `wage.unexpectedHoldMonths` (12 of 18 by default), then continues
  only while the surprise lasts, up to the full slider. At rigidity 0 the hold is skipped.
- When expected inflation is at or above zero, move the posted wage only every `wage.reviewMonths` (default 12),
  closing the missed monthly gap in one step. The interval is off when expected inflation is negative, so expected
  hard-money deflation can still drift every month.
- Do not branch on `regime.type`. Fiat vs bitcoin differences come from expected inflation, which already follows the
  regime path and the anchor weight.
- `FEATURE_OFF` sets both new sliders to 0 so earlier phase paths stay intact.

## Consequences

Calm bitcoin still shows frequent year-over-year money-wage declines and rising real wages. A demand-led unexpected
price drop holds the money wage, then lets it fall by less than the price level. Fiat months pile at exact zero more
often. Job-stayer cut share equals the share of months the common wage index falls, because there is still one posted
wage. The 2–2.4% Grigsby–Hurst–Yildirmaz micro share is a fiat rarity target, not a bitcoin cap, and is not a
cross-section this index can hit without firm-level wages.
