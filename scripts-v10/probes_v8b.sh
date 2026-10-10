#!/usr/bin/env bash
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"; O=../data-v10/review
r() { local tag=$1; shift; env "$@" node review_check.mjs ${G} > $O/$tag.json 2> $O/$tag.log; }
G=stimsign r stimsign NSEEDS=5
G=e4spike r e4spike NSEEDS=6
G=wageElast r wageElast NSEEDS=6
G=wages r wages NSEEDS=6
echo done
