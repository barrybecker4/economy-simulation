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
/** Weight on previous expected sales. The rest is sales since the last labor step. */
export const SALES_SMOOTHING = 0.8;
/** Largest share of employed workers a firm-level hiring rule may shed in one month. */
export const MONTHLY_FIRM_SHED = 0.05;
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
/** Task-gain scale at AI bullishness 0 relative to the default saturating gain. */
export const AI_INTERNET_TASK_GAIN = 0.1;
/** Extra annual growth of the task gain for each point of AI bullishness above 1. */
export const AI_UNBOUNDED_GROWTH = 0.15;
/** Weight on previous smoothed income. The rest is this tick's income. */
export const INCOME_SMOOTHING = 0.9;
/** Share of earned income moved to unemployed households. */
export const UNEMPLOYED_TRANSFER = 0.05;
/** Months of income a household holds before spending out of deposits. */
export const DEPOSIT_BUFFER_MONTHS = 48;
/** Home price measured in months of income. */
export const HOME_PRICE_MONTHS = 48;
/** Monthly rent as a share of that home price. */
export const MONTHLY_RENT_RATE = 0.004;
/** Monthly repayment of a consumer loan, as a share of the balance. */
export const CONSUMER_LOAN_REPAY = 0.05;
/** Agent compute price as a share of the wage, before payment friction. */
export const AI_SERVICE_WAGE_SHARE = 0.04;
/** Agents do not sell once price times friction reaches this share of the wage. */
export const AI_SERVICE_PRICE_CAP = 0.042;
/** Share of the wage an agent keeps for compute after tax. */
export const AI_RETAINED_WAGE_SHARE = 0.01;
/** Share of a below-hurdle capital gap that is still installed. */
export const RETAINED_INVESTMENT_SHARE = 0.25;
/** Baseline exponent on skill when profits are shared. */
export const PROFIT_SKILL_EXPONENT = 1.5;
/** During a credit impulse, new borrowing also takes this share of existing loans times the impulse. */
export const CREDIT_IMPULSE_DRAW = 0.2;
/** Share of the loan repaid each month is the deflation penalty times this rate. */
export const DEFLATION_REPAY_RATE = 0.02;
/** Government spending share cannot rise above this when the stabilizer is on. */
export const MAX_SPEND_SHARE = 0.8;
/** How far posted prices may be pulled toward unit cost in one month. */
export const MAX_PRICE_PULL = 0.001;
/** The price-speed slider is applied to this fraction of the cost gap. */
export const PRICE_PULL_SCALE = 0.01;
/** Weight of a demand or productivity impulse in the monthly price move. */
export const SHOCK_PRICE_WEIGHT = 0.12;
/** Inventory pressure stays inside one plus or minus this band. */
export const INVENTORY_PRESSURE_BAND = 0.02;
/** Excess demand moves the price by at most this much before other terms. */
export const EXCESS_DEMAND_CAP = 0.2;
/** Share of household deposits borrowed each year while endogenous credit is calm. */
export const ENDOGENOUS_DRAW = 0.12;
/** Loan-to-deposit ratio above which endogenous credit stress starts to build. */
export const ENDOGENOUS_LEVERAGE_START = 0.02;
/** Stress above this stops new endogenous borrowing and starts repayment. */
export const ENDOGENOUS_STRESS_LIMIT = 0.05;
