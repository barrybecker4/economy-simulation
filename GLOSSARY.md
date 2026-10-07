# Economy simulation

A closed economy of households, firms, and banks, used to see which assumptions a conclusion depends on.

## Actors

**Household**:
One human: one skill, one job, and one deposit. A household contains no other humans.
_Avoid_: Human agent, family, person

**Agent**:
An autonomous actor with its own deposit, owned by one household. It sells compute, shops, and pays income tax.
_Avoid_: AI agent, bot

**Owner**:
A household that owns one or more agents. Each agent has one owner. Many households own none.
_Avoid_: Human owner

## Comparison

**Scenario**:
The assumptions for one run, and the path those assumptions produce once the run exists. With a baseline pinned, the scenario is the later run.
_Avoid_: Variant, treatment

**Baseline**:
A scenario held fixed so a later scenario can be compared with it.
_Avoid_: Control, snapshot

**Comparison frame**:
The assumptions a scenario keeps at the baseline: scale, population growth, and trust in banks.
_Avoid_: Locked sliders, frozen parameters

## Events

**Shock**:
A scheduled credit, demand, or productivity disturbance lasting twenty-four months: twelve of expansion, then twelve of contraction for demand and credit.
_Avoid_: Impulse, noise, disturbance

**Expansion**:
The first twelve months of a shock, when its impulse is positive.
_Avoid_: Boom, upswing

**Contraction**:
The second twelve months of a demand or credit shock, when its impulse is negative. A productivity shock has no contraction.
_Avoid_: Bust, downturn

**Credit write-off**:
The moment at the turn of a credit shock when a fixed share of firm loans is written off.
_Avoid_: Default, bankruptcy

**Transition**:
The months of fiat rules before a one-time switch to bitcoin, set by the transition length.
_Avoid_: Regime change, conversion window

**Rebase**:
The last month of a transition, when debts may be haircut, deposits are reassigned, bank-held government bonds are cleared, and the active regime becomes bitcoin.
_Avoid_: Switch, conversion, monetary change
