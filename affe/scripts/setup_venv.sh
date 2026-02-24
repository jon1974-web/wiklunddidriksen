#!/usr/bin/env bash
# Run from the affe project root. Creates/repairs venv and installs AFFE.
set -e
cd "$(dirname "$0")/.."

if [[ ! -d .venv ]]; then
  echo "Creating .venv..."
  python3 -m venv .venv
fi

source .venv/bin/activate

# Ensure pip exists (venvs from Xcode Python sometimes don't include it)
if ! python3 -c "import pip" 2>/dev/null; then
  echo "Bootstrapping pip..."
  python3 -m ensurepip --upgrade
fi

pip install --upgrade pip
pip install -e .

echo "Done. Activate the venv with: source .venv/bin/activate"
echo "Then run: affe \"What meetings do I have tomorrow?\""
