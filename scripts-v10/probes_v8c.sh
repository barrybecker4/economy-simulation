#!/usr/bin/env bash
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"; O=../data-v10/review
r() { local tag=$1; shift; env "$@" node review_check.mjs ${G} > $O/$tag.json 2> $O/$tag.log; }
G=base r base_noRebate NSEEDS=10 LIB=patched P_NO_REBATE=1
G=m7 r m7 NSEEDS=6
G=sink r sink NSEEDS=6
G=hoard r hoard NSEEDS=6
echo done
