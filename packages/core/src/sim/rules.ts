/** Structural rates documented in docs/model.md. They are not user sliders. */

export const MONTHS_PER_YEAR = 12;
/** Frictional unemployment the wage rule leans toward. */
export const NATURAL_UNEMPLOYMENT = 0.06;
/** Share of employed workers who separate each month. */
export const MONTHLY_SEPARATION = 0.02;
/** Share of capital that depreciates each month. */
export const MONTHLY_DEPRECIATION = 0.005;
/** How many months of sales firms want to hold as inventory. */
export const INVENTORY_MONTHS = 1;
/** Monthly spending out of deposit balances. */
export const WEALTH_MPC = 0.02;
/** Ticks of negative equity before a firm is replaced. */
export const FAILURE_TICKS = 6;
/** Loan rate above the policy rate. */
export const LOAN_SPREAD = 0.02;
/** Extra wage growth when the labor market is one point tighter than normal. */
export const TIGHTNESS_WAGE = 0.4;
/** Largest monthly move in a price or wage, as a numerical guard. */
export const MAX_MONTHLY_PRICE_MOVE = 0.05;
/** Length of a credit impulse and of the contraction that follows it. */
export const SHOCK_PHASE_MONTHS = 12;
/** Initial money wage, in cents. */
export const INITIAL_WAGE = 100;
/** Share of loans written off in the contraction phase of a credit shock. */
export const CREDIT_WRITEOFF = 0.1;
/** Weight of ordinary goods in the consumption price index. */
export const CONSUMPTION_GENERAL_SHARE = 0.75;
/** Weight of electronics-like goods in the consumption price index. Property is excluded. */
export const CONSUMPTION_ELECTRONICS_SHARE = 0.25;
