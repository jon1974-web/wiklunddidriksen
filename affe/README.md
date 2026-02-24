# AFFE

Manager agent with voice and text interface. AFFE routes user requests to subagents; the first subagent is **Outlook** (mail, calendar, contacts via Microsoft Graph).

## Layout

- **`ARCHITECTURE.md`** – High-level design, components, data flow.
- **`src/affe/`** – Manager agent (intent, routing, reply).
- **`src/outlook_agent/`** – Outlook subagent (Graph client, capabilities).
- **`src/affe/main.py`** – CLI entrypoint.
- **`src/affe/ui.py`** – Web UI server (text + voice).
- **`docs/OUTLOOK_AUTH.md`** – Auth and config for Outlook/Graph.
- **`docs/UI_AND_VOICE.md`** – Web UI, voice (push-to-talk), and “Hey AFFE” options.

## Setup and run

### 1. Python (recommended: avoid system Python)

Use **Python 3.10+** in a **virtual environment** so you don’t need admin rights or system site-packages.

**Option A – Homebrew (Mac):**
```bash
brew install python@3.12
```
Then use `python3.12` in the steps below.

**Option B – Installer:** Install from [python.org](https://www.python.org/downloads/) (3.10 or newer), then use that `python3` and `pip3`.

### 2. Virtual environment (in the `affe` folder)

```bash
cd /Users/jonwiklunddidriksen/wiklunddidriksen/affe

# Create venv (use python3.12 if you installed via Homebrew)
python3.12 -m venv .venv
# or: python3 -m venv .venv

# Activate it (you need to do this in each new terminal)
source .venv/bin/activate

# Install AFFE in editable mode
pip install -e .
```

### 3. Azure app and env

- **Azure app** (one-time): Create an app in [Azure Portal](https://portal.azure.com) → App registrations. Redirect URI `http://localhost` (Mobile and desktop). Copy the Application (client) ID.
- **Env**: In the `affe` folder, copy `.env.example` to `.env` and set `AFFE_OUTLOOK_CLIENT_ID=your-client-id`.

### 4. Run

```bash
# With venv activated (see step 2)
affe "What meetings do I have tomorrow?"
```
First run opens the browser to sign in to Microsoft; tokens are cached in `~/.affe/`.

**Example prompts:** "Meetings today", "Show my inbox", "Find contact Jane".

**Other subagents (no Outlook needed):** Time ("What time is it?"), Weather ("Weather in Oslo"), Notes ("Add note: buy milk", "List notes"), Search ("Search for Python"). You can combine: "What's the weather and the time?".

---

## Web UI (text + voice)

Run the simple web interface with text input and **push-to-talk voice** (uses your Mac’s built-in mic via the browser):

```bash
affe-ui
```

Then open **http://127.0.0.1:5050** in your browser. Type in the box or click the mic, speak, and AFFE replies. See **`docs/UI_AND_VOICE.md`** for details and “Hey AFFE” wake-word options.
