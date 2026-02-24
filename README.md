# Wiklund Didriksen

This repository contains:

- **[jwd-info/](jwd-info/)** – Personal site (jwd.info): homepage, CV, projects, contact, chat widget. See `jwd-info/README.md` for setup and local development.
- **[affe/](affe/)** – AFFE: manager agent with subagents (Outlook, time, notes, search, weather) and a simple web UI. See `affe/README.md` for setup and run.

## Structure

```
wiklunddidriksen/
├── jwd-info/     # jwd.info site (HTML, CSS, JS, assets, api, chat)
├── affe/         # AFFE agent (Python, subagents, web UI)
└── README.md     # This file
```

## Deploying jwd.info

If you deploy with Vercel (or similar), set the **root directory** for the site to **`jwd-info`** so the build serves from that folder.
