#!/usr/bin/env bash
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"; O=../data-v10/review
r() { local tag=$1; shift; env "$@" node review_check.mjs ${G} > $O/$tag.json 2> $O/$tag.log; }
G=cs   r cs            NSEEDS=10
G=base r base_cs0      NSEEDS=10 CS0=1
G=base r base          NSEEDS=10
G=rebateOff r rebateOff_cs0 NSEEDS=10 CS0=1
G=rebateOff r rebateOff NSEEDS=10
G=stim7 r stim7_cs0    NSEEDS=6 CS0=1
G=endo r endo_cs0      NSEEDS=6 CS0=1
G=slump r slump_cs0    NSEEDS=6 CS0=1
G=stim7 r stim7        NSEEDS=3
echo done
