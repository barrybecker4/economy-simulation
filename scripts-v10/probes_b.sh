#!/usr/bin/env bash
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"; O=../data-v10/review
r() { local tag=$1; shift; env "$@" node review_check.mjs ${G} > $O/$tag.json 2> $O/$tag.log; }
G=qe r qe_cs0          NSEEDS=6 CS0=1
G=qe r qe_cs0_patch1x  NSEEDS=6 CS0=1 LIB=patched P_QE_1X=1
G=qe r qe_cs0_patchExcess NSEEDS=6 CS0=1 LIB=patched P_QE_EXCESS=1
G=ratecap r ratecap_cs0 NSEEDS=6 CS0=1
G=wages r wages_cs0    NSEEDS=6 CS0=1
G=wageElast r wageElast_cs0 NSEEDS=6 CS0=1
G=sink r sink_cs0      NSEEDS=10 CS0=1
G=e4spike r e4spike_cs0 NSEEDS=10 CS0=1
G=hoard r hoard_cs0    NSEEDS=6 CS0=1
G=m7 r m7_cs0          NSEEDS=6 CS0=1
G=wages r wages        NSEEDS=4
G=e4spike r e4spike    NSEEDS=6
echo done
