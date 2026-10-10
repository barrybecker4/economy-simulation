#!/usr/bin/env bash
# Rebuild the core and run every spec in parallel. Outputs go to ../data-v10/<spec>.jsonl
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.local/node22/bin:$PATH"
(cd ../repo-v10 && npx tsc -b --pretty false) || echo "tsc reported errors (cli package only); core dist built"
python3 make_specs.py
mkdir -p ../data-v10; ls ../specs-v10/*.json | xargs -P 8 -I{} sh -c 'n=$(basename {} .json); node runner.mjs {} ../data-v10/$n.jsonl 2> ../data-v10/$n.log'
echo done
