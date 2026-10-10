# Fix Status Report - Branch cursor/fix-regressions-new-85db

## Completed Fixes (Pushed to GitHub)

### 1. ✅ M Bitcoin Gradual Transition Crash (Issue #1)
**Fix**: Added `markBitcoinToMarket()` call after each gradual conversion step
**Commit**: 842abc6
**Status**: FIXED - Gradual transition now completes without "Bank books do not close" crash

### 2. ✅ Cash Home Buy Affordability (Issue #2)  
**Fix**: Changed affordability check to include bitcoin value (deposit + bitcoinValue >= homePrice)
**Commit**: 7235c2b
**Status**: FIXED - Households can now use total wealth (fiat + bitcoin) for cash purchases
**Note**: Full reconciliation validation pending

### 3. ✅ Calm Unemployment Regression (Issue #3)
**Fix**: Replaced strict `demandImpulse > 0.01` gate with scaled approach:
- Normal times: full unmet demand
- Mild recovery (0.01-0.05): 30% scale
- Contractions: 0%
- Strong booms: 100%
**Commit**: 9e3182c
**Status**: FIXED - Should restore calm unemployment while preventing overshoot
**Note**: Full validation pending

### 4. ✅ Supply Shock Unemployment Signs (Issue #4)
**Fix**: Cap expectedSales at capacity during negative productivity impulses in `workersForSales()`
**Commit**: 65a4630
**Status**: FIXED - Addresses root cause in sales/capacity ratio, works for both S0 and S2
**Note**: Removed previous 80% dampening approach

### 5. ✅ Stimulus CPI Inflation (Issue #6)
**Fix**: Restored symmetric stimulusPressure (returns gap with sign)
**Commit**: b300a2b  
**Status**: FIXED - Allows expansion in slumps, withdrawal in booms
**Note**: Will affect test results, validation needed

### 6. ✅ Repo Cleanup (Issue #7)
**Fix**: Removed all analysis junk files from PR #1
**Commit**: 13eb94a
**Status**: DONE - Cleaned up REPORT*.md, results-v10/, scripts-v10/, etc.

## Partially Addressed / Pending

### Issue #5: Test Failures
**Current Status**: 9 test failures (down from original list but new ones appeared)

**Pre-existing failures (from master, Barry confirmed)**:
- phase11: Wage-driven hiring under deflation  
- phase16: Inflation time preference
- phase57: Inflation targets
- phase58: Productivity shock GDP
- phase60: Monetary preset wealth distribution
- phase64: Crisis stimulus lag

**New/Regressed failures**:
- phase55: Mortgage originations (0 after month 60) - ISSUE: Also fails on master! Introduced by PR #1
- phase37: Mortgage ladder - NEW, likely related to affordability changes
- preset-stability: Bitcoin unemployment bounds - Likely affected by stimulus symmetry change

**Action Needed**: 
- Investigate mortgage origination issue (affects phase37, phase55)
- Adjust preset-stability tolerance if symmetric stimulus causes slight increase
- Document remaining pre-existing failures as out of scope

## NOT DONE - CRITICAL REMAINING WORK

### ⚠️ VALIDATION SUITE NOT RUN
Per Barry's hard requirement, the following MUST be completed before opening PR:

1. **20-seed headline suite** on:
   - v10 (ee3e4c3)
   - master (5b133ae)  
   - this branch (cursor/fix-regressions-new-85db)

2. **Shock table** on all three versions

3. **Validity checks** on all three versions

4. **Before/after comparison** showing:
   - No crashes or accounting residuals
   - No calm unemployment regression vs v10
   - All regression checks pass
   - Full tables in PR description

### Missing: Headline Suite Script
Barry requested ONE clean headline-suite script in scripts/ directory.
**Not yet created** - would run 20-seed paired bitcoin/fiat across S0-S3, S3 h3, M, M h3, D.

## Regression Checks Status (Not Validated)

From Barry's requirements:
- Zero-median runs at 0: ❓ Not tested
- Regime decoupling: ❓ Not tested
- S2 money cap (~2.2×): ❓ Not tested
- Glut price falls: ❓ Not tested
- Asset-purchase unwind: ❓ Not tested
- Wage-spiral fix (M fiat elasticity 0): ❓ Should test - was 1.21×/3.5%, target: keep below 1.53×/6.2%
- M bitcoin firm-level hiring penalty: ❓ Should test - was 8.4% vs 8.3%, avoid returning to 11.5% vs 8.2%

## Known Issues / Concerns

1. **Phase55/Phase37 mortgage originations**: Root cause unclear, affects both master and branch
2. **Symmetric stimulus**: Correct fix but may need tolerance adjustments in tests
3. **Cash home reconciliation**: Logic fix done but full reconciliation check pending
4. **Test suite**: 9 failures, mixture of pre-existing and new

## Recommended Next Steps

1. **DO NOT open PR yet** - validation not complete
2. Run full validation suite (will take significant time)
3. Investigate mortgage origination issue
4. Adjust test tolerances where fixes cause expected changes
5. Create headline-suite runner script
6. Generate full before/after tables
7. Only then open PR (possibly as draft if issues remain)

## Budget Status
Approaching token limit - stopping here to preserve work and report status per Barry's instruction.
