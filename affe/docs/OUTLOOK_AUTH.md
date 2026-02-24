# Outlook subagent – Auth and config

- **Auth:** OAuth2 with Microsoft (MSAL). User signs in in the browser once; the app stores refresh tokens and gets access tokens for Microsoft Graph.
- **App registration:** Create an app in [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations. Use "Accounts in any organizational directory and personal Microsoft accounts" for personal Outlook/M365.
- **Redirect URI:** For a desktop app, use `http://localhost` or `http://localhost:PORT` and register it in the app.
- **Scopes (Graph):** Request the least privilege needed, e.g.:
  - Mail: `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`
  - Calendar: `Calendars.Read`, `Calendars.ReadWrite`
  - Contacts: `Contacts.Read`, `Contacts.ReadWrite`
- **Config:** Store `client_id` and optionally `tenant` (use `common` for personal + work) in environment or `.env`; never commit secrets. Token cache can be a file in user app data.
