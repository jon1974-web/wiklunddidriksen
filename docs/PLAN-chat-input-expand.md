# Chat Input — Expand on Focus Plan

## Mockup
See `mockup-chat-input-v5.html` in root.

## Behavior

### State 1: Default (no focus)
- Camera + image icons visible
- Short text input (~100px) with "Skriv..." placeholder
- Send arrow hidden
- Big plus button visible on tab bar (center)

### State 2: Focused (no text)
- Camera + image icons stay visible
- Input expands to full width with blue focus ring
- Send arrow still hidden
- Big plus button hides (opacity 0 + scale down, 0.3s transition)

### State 3: Typing (focused + text)
- Same as focused
- Send arrow fades in inside input (right-aligned)

### Blur behavior
- If text is empty → collapse input, show plus button
- If text exists → stay expanded, plus stays hidden

## Implementation

### ChatScreen
- Add `inputFocused` state
- `onFocus`: set focused = true
- `onBlur`: if no text, set focused = false
- Conditional styles on input wrapper and plus button

### Tab bar (CustomTabBar)
- Accept `chatInputFocused` prop
- When true, hide plus button with transition

### Styles
- Input: short ~100px → full width, transition 0.3s
- Plus button: opacity 1 + scale 1 → opacity 0 + scale 0.5, transition 0.3s
- Focus ring: boxShadow accent color

## Files to modify
- `src/screens/ChatScreen.tsx` — inputFocused state, conditional styles
- `src/components/CustomTabBar.tsx` — accept chatInputFocused prop, hide plus
