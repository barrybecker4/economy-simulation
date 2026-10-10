#!/usr/bin/env bash
# Resume: run every spec whose jsonl is missing. Outputs go to ../data-v10/<spec>.jsonl
cd "$(dirname "$0")"
export PATH="$HOME/.local/node22/bin:$PATH"
for f in ../specs-v10/*.json; do n=$(basename $f .json); [ -s ../data-v10/$n.jsonl ] || echo $f; done | xargs -P 7 -I{} sh -c 'n=$(basename {} .json); node runner.mjs {} ../data-v10/$n.jsonl 2> ../data-v10/$n.log'
echo done
