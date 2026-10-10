#!/usr/bin/env bash
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"; O=../data-v10/review
r() { local tag=$1; shift; env "$@" node review_check.mjs ${G} > $O/$tag.json 2> $O/$tag.log; }
G=stimsign r stimsign_cs0 NSEEDS=5 CS0=1
G=stimsign r stimsign     NSEEDS=3
G=endo r endo_cs0b NSEEDS=4 CS0=1
echo done
