#!/usr/bin/env bash
# Round-6 mechanism probes (wages, stimulus, freeze, premium, sink). Outputs ../data-v10/review/
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"
R=../data-v10/review
node review_check.mjs wages > $R/wages.json 2> $R/wages.log &
node review_check.mjs wagesNoBook > $R/wagesNoBook.json 2> $R/wagesNoBook.log &
NSEEDS=10 node review_check.mjs stimulus > $R/stimulus.json 2> $R/stimulus.log &
node review_check.mjs freeze > $R/freeze.json 2> $R/freeze.log &
(node review_check.mjs premium > $R/premium.json 2> $R/premium.log; node review_check.mjs sink > $R/sink.json 2> $R/sink.log) &
wait
echo v6-probes-done
