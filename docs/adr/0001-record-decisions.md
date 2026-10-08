# ADR 0001: Record decisions

## Status

Accepted

## Context

Design choices in this repository change what the simulation means. Later phases need a short record so those choices
are not reversed by accident.

## Decision

- A significant design decision gets a numbered file in `docs/adr/`.
- The same change updates `docs/PLAN.md` and, when behavior changes, `docs/model.md`.
- An ADR states status, context, decision, and consequences.

## Consequences

Reviewers can see why a rule exists without reading the whole history.
