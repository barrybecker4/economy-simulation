# ADR 0031: Crisis fiscal metrics and a constrained bitcoin tool

## Status

Accepted

## Context

Issue #14 asked for a measured crisis package. The teaching contrast is that
fiat governments can print in a slump and bitcoin cannot. Before this change
there was no metric for the deficit as a share of GDP, rebates were missing
from any spending total, the stabilizer raised purchases only under fiat, and
bitcoin had no rainy-day or savings-constrained extra outlay. ADR 0014 said
the fiscal stabilizer stays fiat-only; that consequence is superseded here.
The dual-currency window in ADR 0014 is unchanged.

## Decision

- `fiscalBalancePctGdp` is this month’s tax minus goods, the household grant,
  bond coupons, and the surplus rebate, as a share of this month’s GDP.
  Negative is a deficit. Share charts multiply by 100.
- `cbBalanceSheetPctGdp` is bank reserves over annualized GDP, matching
  WALCL/GDP.
- `government.stabilizer` can raise the purchase share in every regime. Fiat
  extra is capped at `government.crisisOutlayCap` of GDP. Bitcoin and hybrid
  extra is capped at `government.hardMoneyDeficitCap` of GDP and cannot exceed
  tax deposits plus unused savings, so it cannot print.
- Bitcoin and hybrid keep `government.rainyDayMonths` of extra treasury cash.
  Crisis purchases spend that cash first. Fiat ignores the buffer.
- The household/hiring `fiscalBoost` stays fiat-only.
- Fiat crisis stimulus may mix a GDP-scaled term through
  `centralBank.stimulusGdpWeight`. When that weight is positive, extra annual
  injection cannot exceed 18 percent of GDP (`STIMULUS_GDP_ANNUAL_CAP`).
- `FEATURE_OFF` sets the new sliders so Phase 14 tests still match: rainy-day
  0, hard-money cap 0, crisis outlay cap 1, stimulus GDP weight 0.

Peak deficit is the worst trailing-twelve-month fiscal flow relative to
trailing GDP, not a one-month ratio that jumps when GDP dips. CB expansion is
the reserve-stock change over annualized GDP at the shock, not a ratio that
rises only because output fell.

## Consequences

On an E4 demand shock (`tick` 24, `size` −0.3) the monetary preset lands in
the issue’s fiat 8–15 percent deficit and +15–30 pp sheet bands, and bitcoin
does not raise base money. Default S0 trend prices keep inflation on target,
so reserve accommodation can expand the S0 fiat sheet past +30 pp of GDP.
That path is not rewritten here. Calm-year deficits stay near zero because
the tax rate equals the spending share and Phase 53 rebates any surplus;
a structural deficit large enough to sit in −2 to −6 percent would retune
inflation tests. `docs/model.md`, `docs/PLAN.md` Phase 14, and
`docs/methods/remaining-asymmetries.md` follow this ADR.
