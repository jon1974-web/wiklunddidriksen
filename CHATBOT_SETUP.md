# Chatbot Setup (Option B: API on Vercel)

The site stays on GitHub Pages. The chat API runs on Vercel.

## 1. Deploy API to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use GitHub).
2. Click **Add New** → **Project**.
3. Import your `wiklunddidriksen` repository.
4. Vercel will detect the project. Use default settings.
5. Before deploying, add an **Environment Variable**:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** your OpenAI API key (from [platform.openai.com](https://platform.openai.com/api-keys))
6. Deploy.

## 2. Get the API URL

After deployment, you’ll get a URL like:

```
https://wiklunddidriksen.vercel.app
```

The chat API is available at:

```
https://wiklunddidriksen.vercel.app/api/chat
```

## 3. Configure the frontend

In `chat-config.js`, set your Vercel URL:

```javascript
window.CHAT_API_URL = 'https://YOUR_VERCEL_PROJECT.vercel.app/api/chat';
```

Replace `YOUR_VERCEL_PROJECT` with your actual Vercel project URL.

## 4. Optional: Custom subdomain

To use `https://api.jwd.info` for the API:

1. In Vercel: **Project** → **Settings** → **Domains**.
2. Add `api.jwd.info`.
3. Add a CNAME record in your DNS (one.com):
   - **Host:** `api`
   - **Points to:** `cname.vercel-dns.com` (or the value Vercel shows).
4. In `chat-config.js`:

```javascript
window.CHAT_API_URL = 'https://api.jwd.info/api/chat';
```

## Summary

- **Site:** GitHub Pages (jwd.info)
- **Chat API:** Vercel (`/api/chat`)
- **CV:** `assets/cv/cv.md`
- **AI:** OpenAI (gpt-4o-mini)
