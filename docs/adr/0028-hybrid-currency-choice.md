# ADR 0028: Hybrid dual currency at an exogenous BTC/USD path

## Status

Accepted

## Context

Hybrid used the bitcoin ledger unit plus a lender of last resort. `money.choiceSpeed` only moved chart shares and a toy
exchange rate. Nothing in wages, goods, credit, or fiat printing read those shares. A true hybrid needs per-household
and per-firm holdings in either money, with wages, payments, and debts that can clear in either, while fiat printing
still runs. The closed economy cannot set the world bitcoin price; the Barry Becker supply-shock model is the rate
taken as given.

## Decision

- Hybrid clears goods in cents. Bitcoin balances stay on the existing coin fields. Fiat and bitcoin regimes stay
  single-currency (cents and satoshis respectively).
- Each month hybrid sets `bitcoinPrice` from the supply-shock path (cents per bitcoin), scaled by `nominalScale` after
  a redenomination. Household demand does not feed that path. The recurrence runs for 300 months from October 2026;
  later months compound the mean log change of months 240–300.
- Opening cash splits by the opening bitcoin share. Stablecoin and CBDC opening shares stay in the fiat till. Chart
  shares are marked fiat and bitcoin values.
- Swaps go through an outside exchange residual. Bank books hold `bitcoinReserves` equal to net coin liabilities at the
  current price so a price move does not hit equity. Fiat money growth and reserve accommodation run against fiat
  deposits only. The Taylor rule sets the fiat policy rate. The hybrid lender of last resort still runs.
- Households and firms choose a pay currency from money scores. Wages, goods, and new debts can clear in that currency.
  Service stays in the currency of issue.

## Consequences

`docs/model.md`, `docs/limits.md`, `docs/PLAN.md`, and the remaining-asymmetries note follow this ADR. Hybrid scenario
numbers change. Fiat and bitcoin paths keep their single-currency rules. Gradual transition windows keep equity seating
in `markBitcoinToMarket`.
