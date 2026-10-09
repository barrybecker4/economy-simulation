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
A household that owns one or more agents. Each agent has one owner.
_Avoid_: Human owner

**Owner share**:
The fraction of households that are owners. It rises along the adoption curve toward its own ceiling.
_Avoid_: ownership concentration, autonomy share

**Agents per owner**:
How many agents one owner holds. It rises along the adoption curve toward its own ceiling.
_Avoid_: autonomy share, owner share

**Ownership concentration**:
How strongly profits skew toward high-skill households as the AI factor rises.
_Avoid_: owner share, agents per owner

## Production

**Wage**:
The economy-wide money pay for household labor, before that household's skill.
_Avoid_: salary, agent wage

**Agreed wage**:
The money wage employees and employers would sign this month given the price level, productivity, and labor-market
tightness.
_Avoid_: target wage, equilibrium wage, flexible wage

**Wage negotiation**:
Closing the gap between the posted wage and the agreed wage. Employees close a shortfall; employers close an excess.
_Avoid_: wage bargaining, wage indexation, contract length

**Firm capacity**:
The goods one firm can produce in a month.
_Avoid_: output, real GDP

**AI factor**:
The multiplier on firm capacity from adopted AI tasks.
_Avoid_: agent capability, productivity

**Compute**:
A unit of service an agent sells to a firm. The firm's payment, minus the bank fee, is that agent's income for the
month.
_Avoid_: wage, salary

**Adoption curve**:
The S-curve set by the adoption midpoint and the adoption steepness. The automatable share, the owner share, agents per
owner, and agent output all follow it.
_Avoid_: automatable share, AI factor

**Automatable share**:
The fraction of tasks software can do. It rises along the adoption curve from its start share to its end share.
_Avoid_: owner share, AI factor, reachable share

**Reachable share**:
The fraction of an automatable-share rise that counts toward firm capacity before robotics. Robotics raises that
fraction to one.
_Avoid_: physical-task share, reach

**Agent output**:
One agent's compute income in a month, as a share of the wage. It rises along the adoption curve toward a fixed share of
the wage.
_Avoid_: productivity, AI factor, wage

## Comparison

**Scenario**:
The assumptions for one run, and the path those assumptions produce once the run exists. With a baseline pinned, the
scenario is the later run.
_Avoid_: Variant, treatment

**Baseline**:
A scenario held fixed so a later scenario can be compared with it.
_Avoid_: Control, snapshot

**Comparison frame**:
The assumptions a scenario keeps at the baseline: scale and population growth.
_Avoid_: Locked sliders, frozen parameters

## Bank books

**Private equity**:
The residual that closes bank books so vault equals bank equity plus this residual.
_Avoid_: residual equity, balancing item

**Bank equity**:
A bank's capital stock on the liability side of its books.
_Avoid_: capital buffer (when you mean the stock itself)

**Deposit interest**:
The coupon paid to household deposits from this tick's borrower interest, then fiat reserve interest and subsidy inside the money-growth budget.
_Avoid_: savings rate, policy rate (those set the posted coupon; this is the payment)

**Lender of last resort**:
Hybrid central-bank capital support for insolvent banks, run once per tick before resolution may merge or bail in.
_Avoid_: bail-in, bank resolution (those happen after support if equity is still negative)

**Carried bitcoin**:
The ledger value of outstanding bitcoin units at the price they were acquired or last marked, so a price move can seat on bank equity.
_Avoid_: bitcoin balance (that is the unit count; this is the value stock)

**Fiat money growth**:
The weight on how strongly the fiat central bank grows broad money with the inflation target, productivity, and the
inflation gap. It cannot be zero.
_Avoid_: printing, monetization, crisis stimulus

**Crisis stimulus**:
Extra fiat broad-money growth per unit of lagged demand or credit contraction pressure.
_Avoid_: printing, QE, bailout

**Stimulus lag**:
Months before crisis stimulus begins after a demand or credit contraction starts, and months it continues after that
contraction ends.
_Avoid_: policy lag, recognition lag

## Events

**Shock**:
A scheduled credit, demand, or productivity disturbance lasting twenty-four months: twelve of expansion, then twelve of
contraction for demand and credit.
_Avoid_: Impulse, noise, disturbance

**Expansion**:
The first twelve months of a shock, when its impulse is positive.
_Avoid_: Boom, upswing

**Contraction**:
The second twelve months of a demand or credit shock, when its impulse is negative. A productivity shock has no
contraction.
_Avoid_: Bust, downturn

**Credit write-off**:
The moment at the turn of a credit shock when a fixed share of firm loans is written off.
_Avoid_: Default, bankruptcy

**Transition**:
The months of fiat rules before a one-time switch to bitcoin, set by the transition length.
_Avoid_: Regime change, conversion window

**Rebase**:
The last month of a transition, when debts may be haircut, deposits are reassigned, bank-held government bonds are
cleared, and the active regime becomes bitcoin.
_Avoid_: Switch, conversion, monetary change
