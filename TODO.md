# Remaining Work for PR #5

## ✅ Fixed So Far

1. **Credit stagger bug** - FIXED
   - Now uses `wanted / firms.length` per firm (not `wanted / 12`)
   - Firms borrow at their first anniversary (12 months after creation)
   - Replaced firms get `createdAt` reset for fresh 12-month wait
   - Added `Firm.createdAt` field to track creation/replacement

2. **Grace period stagger removed** - FIXED
   - Reverted to standard `FAILURE_TICKS` for all firms
   - Per validator feedback, this was a "dodge" that needs proper state-driven logic

## ❌ Still TODO

### High Priority

3. **Mortgage credit starvation** - NOT FIXED
   - Monthly firm draws eating mortgage-reserved credit room
   - Needs: Ensure endogenous credit respects `householdMortgageShare` reservation
   - Impact: phase55 failing, originations 60-119 collapse from 7-25 to 0-3

4. **Bitcoin wave still exists** - NOT ADDRESSED
   - Substantial bitcoin: 20-25% output loss over 3 months (months 26-30, 41-45)
   - ~200 failures per run
   - Bitcoin has no endogenous credit, so credit stagger doesn't help
   - Needs different fix (price/equity dynamics or different failure rule)
   - Must add bitcoin test case and 3-month peak-to-trough check

5. **State-driven failure rule** - NOT IMPLEMENTED
   - Replace fixed 6-month threshold with:
     - Liquidity test (can't pay wages/debt), or
     - Equity-based hazard (probability rises with negative equity depth)
   - This would address both fiat and bitcoin waves properly

### Testing & Validation

6. **Unexplained shifts** - NOT INVESTIGATED
   - Bank failures double in M bitcoin (13.8 → 29.9)
   - Bank failures rise in M fiat with money growth 0.05 (7.4 → 11.0)
   - Fiat inflation drop 0.4-1.5pp in M and D
   - Unemployment rise 0.2-0.5pp in M and D
   - No-AI fiat new ~10% dip at month 21 in every seed

7. **10-seed verification suite** - NOT RUN
   - No AI fiat, no AI bitcoin
   - Modest fiat, Substantial fiat
   - Substantial bitcoin, Substantial stimulus-off
   - Report: 1-month max drop, 3-month max fall, max firms reset, Y20 GDP/consumption, unemployment, inflation, bank failures

8. **20-seed headline suite** - NOT RUN
   - `scripts/headline-suite.mjs`
   - Compare with master 661e91b

9. **Full test suite** - NOT RUN
   - Must pass all tests that pass on master
   - phase55, phase56, phase57 currently failing

### Documentation

10. **Update docs** - NOT DONE
    - model.md:271-272 (credit mechanics)
    - model.md:305 (failure rules if keeping grace stagger - removed now)
    - GLOSSARY.md:136 (if needed)
    - macro.ts:172 (`credit.endogenousWeight` slider text)
    - assumptions.md:491, 480
    - PLAN.md:1165, 1190

### Hygiene

11. **Code quality** - NOT DONE
    - Delete FIX_SUMMARY.md and verify-fix.mjs
    - Fix 12 eslint errors
    - Run prettier (3 files failing)

12. **Test improvements** - NOT DONE
    - firm-failure-wave.test.ts takes 205s, should be <60s
    - Runs seed 1 twice
    - Silently ignores scale keys
    - Name cases accurately

13. **Cross-engine hashes** - NOT DONE
    - Re-pin once behavior is final

14. **PR description** - NOT DONE
    - Fix "before" numbers (seed 1 Modest: actually 58-67% at month 22, not 26.3% at month 26)
    - Correct failure explanations

15. **Gradual-transition bug** - NOT FIXED
    - Test crashes on master with "Bank books do not close at tick 128"
    - PR #5 only passes because dynamics differ
    - Need to find and fix root cause

## Implementation Strategy

The core issue is that credit stagger alone doesn't solve the bitcoin case or fully prevent waves. A proper fix needs:

1. **For fiat**: Credit stagger (now fixed) + proper mortgage reservation
2. **For bitcoin**: Need state-driven failure rule since no credit to stagger
3. **Both**: Consider equity-based failure probability instead of hard 6-month cutoff

The equity-based hazard approach:
```typescript
// Probability of failure each month based on equity
const equityRatio = firmEquity(economy, firm) / (firm.capital * firm.price);
const failureProbability = equityRatio < 0 
  ? Math.min(0.5, -equityRatio * 0.1)  // Rises with negative equity
  : 0;
if (rng.uniform() < failureProbability) {
  replaceFirm(economy, firm);
}
```

This would:
- Smooth failures over time naturally
- Work for both fiat and bitcoin
- Be state-driven (not time-based dodge)
- Allow some firms to recover if equity improves

## Files Changed So Far

- `packages/core/src/sim/types.ts` - Added `Firm.createdAt`
- `packages/core/src/sim/seed.ts` - Initialize `createdAt` to 0
- `packages/core/src/sim/bookkeeping.ts` - Set `createdAt` on replacement, removed grace stagger
- `packages/core/src/sim/credit.ts` - Fixed credit stagger logic

## Status

The credit stagger is now correct but insufficient. The fix needs either:
A) Proper mortgage reservation + bitcoin-specific solution, or
B) Complete redesign with equity-based failure hazard (better solution)

Given token budget constraints, recommending option B as it solves both fiat and bitcoin cases elegantly without needing separate mechanisms.
