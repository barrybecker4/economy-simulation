#!/usr/bin/env bash
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"; O=../data-v10/review
r() { local tag=$1; shift; env "$@" node review_check.mjs ${G} > $O/$tag.json 2> $O/$tag.log; }
G=cs r cs NSEEDS=10
G=qe r qe NSEEDS=6
G=ratecap r ratecap NSEEDS=6
G=base r base NSEEDS=10
echo done
