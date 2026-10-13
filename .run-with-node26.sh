#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 26 >/dev/null 2>&1
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$NVM_DIR/versions/node/v26.11.1/bin:$PNPM_HOME/bin:$PNPM_HOME:$PATH"
cd /workspace
"$@"
