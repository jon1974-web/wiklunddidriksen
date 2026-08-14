# Chat Improvement Plan

## Current State
- Basic text + image messaging
- Reactions (like, smile, heart)
- Real-time updates via Firestore
- 100 message limit, no pagination
- No date/time separators between messages
- Hardcoded strings (no i18n)
- No push notifications
- No message management (delete/edit)

---

## Must-Have Improvements

### 1. Date & Time Separators
- Show date headers between message groups (e.g. "I dag", "I går", "12. januar")
- Show time on each message (already exists but only HH:MM)
- Date separators should be styled with a pill/chip design

### 2. Message Management
- Long-press → delete own messages (with confirmation via ActionModal)
- Long-press → copy text to clipboard
- Only allow deleting your own messages

### 3. i18n Fixes
- Replace all hardcoded strings with `t()` translations
- Add missing translation keys for "Send", camera permissions, error messages
- Use existing `chat.noMessages` for empty state

### 4. Push Notifications
- Cloud Function `notifyNewChatMessage` already exists
- Verify it's working correctly
- Notify family members when new message arrives

### 5. Unread Tracking
- Store last seen timestamp per user in Firestore
- Show unread badge on Chat tab in CustomTabBar
- Mark messages as read when entering chat
- Reset unread count when user opens chat

---

## Nice-to-Have Improvements

### 6. Message Grouping
- Show avatar + name only for first message in a consecutive sequence from same sender
- Reduces visual noise
- Show time only on first message of group

### 7. Link Detection
- Auto-detect URLs in messages and make them clickable
- Open in browser via `Linking.openURL`
- Style links with underline and accent color

### 8. Load More / Pagination
- Show "Load older messages" button at top
- Instead of hard 100 limit
- Use Firestore cursor-based pagination

### 9. Reply to Message
- Long-press → reply
- Show quoted message preview in the reply bubble
- Store replyTo field in message

### 10. Emoji Reactions Enhancement
- More reaction options (👍 ❤️ 😂 😮 😢 🙏)
- Show reaction count on message

---

## Creative / Fun Ideas

### 11. Message Reactions with Animation
- When adding a reaction, show a small animation (emoji pops up)

### 12. Voice Messages
- Record and send short voice clips (like WhatsApp)
- Use Web Audio API on web, native audio on mobile

### 13. Sticker Packs
- Family-specific stickers (custom uploaded)
- Pre-made fun stickers

### 14. "Good Morning" / Quick Replies
- Pre-defined quick reply buttons ("Takk!", "Bra!", "Ja", "Nei")
- Quick reactions without opening keyboard

### 15. Message Themes / Bubble Styles
- Different bubble styles for different message types
- Photo messages get a different layout

### 16. Pinned Messages
- Pin important messages to top of chat
- Family announcements

### 17. Search in Chat
- Search through old messages
- Filter by sender or date

### 18. Typing Indicator
- Show when someone is typing (real-time via Firestore)

---

## Priority Order

1. **Date separators + time display** — immediate UX improvement
2. **Push notifications** — already have the Cloud Function, just verify
3. **i18n fixes** — quick win, already have translations
4. **Long-press → delete/copy** — essential message management
5. **Message grouping** — cleaner visual appearance
6. **Load more** — important for active families
7. **Unread tracking** — nice to have
8. **Link detection** — quality of life
