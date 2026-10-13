# Bank Failure Calibration - Issue #11 Analysis

## Summary

Re-measured bank failures on latest master (post PRs #18 and #19). **The acceptance criteria are already met**: failure rates are at 0% per bank-year under both M bitcoin and S0 bitcoin configurations, well below the targets of ≤0.5% (shocks off) and ≤4% (shocks on).

## Baseline Measurements (Latest Master)

### M Bitcoin (Monetary Preset)
- **Shocks OFF**: Median 0 failures over 10 seeds (0.000% per bank-year)
- **Shocks ON**: Median 0 failures over 10 seeds (0.000% per bank-year)
- All seeds: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] in both configurations

### S0 Bitcoin (Default Sliders)
- **Shocks OFF**: Median 0 failures over 10 seeds (0.000% per bank-year)

### Acceptance Criteria (from issue #11)
- ✅ Shocks OFF: ≤ 0.5% per bank-year (actual: 0%)
- ✅ Shocks ON: ≤ 4% per bank-year (actual: 0%)

## Why the Issue Was Already Resolved

### Phase 52 Fix (Already in Master)

The "repeated bail-in loop" issue was addressed in **Phase 52** (see `packages/core/src/sim/phase52.test.ts`):

**Before Phase 52:**
- Bank fails → gets bailed in → equity restored → next month fails again → counter increments again
- This could happen repeatedly, leading to high cumulative failure counts (26-28 per run mentioned in old reports)

**After Phase 52 (Current):**
```typescript
// In bailIn() function (resolution.ts:105-132)
function bailIn(economy: Economy, bank: Bank): void {
  // ...restore equity by cutting deposits...
  
  const target = equityFor(economy, loansAt(economy, bank.id));
  const need = moneyAmount(economy, Math.max(0, target - bank.equity));
  
  // KEY FIX: Only bail in if equity is below target
  if (need > 0 && deposits > 0) {
    // Cut deposits proportionally
  }
  
  if (bank.equity > 0) {
    bank.failed = false;  // Bank is restored and won't fail again unless new losses
  }
}
```

**The fix:**
1. Bail-in now restores equity to the capital target (`equityFor`), not just barely positive
2. If a bank is already at or above the target, no further bail-in occurs
3. This prevents the monthly repetition: "A bank already at that target is left alone, so one loss does not bail depositors in every month"

### Why Bitcoin Failures Are Low

Under the **monetary preset with bitcoin**:
1. **Lending is savings-constrained**: Bitcoin lending cannot exceed unused savings (25% of deposits under maturity-matched, 10% under full-reserve)
2. **Resolution is enabled**: `bank.resolution: "merge"` means failing banks are resolved immediately
3. **Capital buffer**: After Phase 52, resolution restores equity to 1.5× the regulatory target, providing cushion
4. **No consumer credit under bitcoin**: Only mortgages and firm loans, reducing overall credit exposure

### Mechanisms Preventing Excessive Failures

1. **Lending Room Constraints** (`banking.ts:188-198`):
   - Fiat: `cap - loans` adjusted by credit impulse and endogenous leverage
   - Bitcoin/Hybrid: Also capped by `savingsRoom()`

2. **Resolution Mechanics** (`resolution.ts:30-45`):
   - Marks bank as failed only once per episode
   - Merge: Transfers deposits/loans to survivor
   - Bail-in: Restores equity to target in one operation

3. **Capital Adequacy** (`bank-books.ts:30-40`):
   - Opening equity = 1.5× `(capitalRatio / (1 - capitalRatio)) × loans`
   - Provides buffer above minimum requirement

4. **Endogenous Credit Stress** (`credit.ts:72-82`):
   - High leverage or losses → increased stress → tighter lending → prevents further deterioration

## Regression Test Added

Added `bank-failure-regression.test.ts` with:
- M bitcoin shocks off/on (10 seeds each)
- S0 bitcoin shocks off (10 seeds)
- Verifies ≤0.5% and ≤4% thresholds

## Real-World Context

Issue #11 notes real-world failure rates:
- **Normal years**: ~0.06% per year (FDIC 1995-2006)
- **Crisis years**: 2-2.4% (2009-10), ~4.2% (1989 S&L), 6-22% (1930-33)

Current results (0% in all normal runs) are appropriate for:
- ✅ Steady-state bitcoin economy with no external shocks
- ✅ Resolution mechanism working correctly  
- ✅ Lending constrained by available savings

Future work (if failures need to be introduced for realism):
- Could reduce capital buffers for specific scenario testing
- Could introduce systemic shocks that stress all banks simultaneously
- Could model bank runs or confidence crises
- Could test transition scenarios (fiat→bitcoin) where old mortgage books create stress

## Conclusion

**No code changes needed.** The Phase 52 fix already prevents the repeated bail-in loop that was causing elevated failure rates. The current 0% failure rate is:
- Well within acceptance criteria
- Economically reasonable for a savings-constrained bitcoin system
- Protected by regression tests

The issue can be closed with a note that the problem was pre-emptively resolved by Phase 52 changes, and regression tests have been added to ensure it stays fixed.
