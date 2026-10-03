# Phosphor Live! 💬

Talk together, live — **no signup, no password, no setup, no commands!**

## How to use it!

1. Open `index.html` (or visit the site — that's literally it)!
2. Pick a display name!
3. Hit **New Space** (or Join with a friend's code)!
4. Share the invite code — anyone who opens the page and enters it
   joins the same live conversation!

## How does it work with no server?!

Your browser talks straight to free public MQTT relays over WebSockets!
Messages fly room-to-room live, Space directories + presence ride on
retained topics, and your name, Spaces, and recent messages live in
`localStorage`!

- No accounts: your identity is a random ID + name in this browser!
- No history server: the last 100 messages per Space stay on your devices!
- Public relays: anyone with a Space code can read that Space — it's a
  cozy public park, not a vault! Don't share secrets!

## Files!

- `index.html` — the whole page!
- `styles.css` — the glow!
- `mqtt.js` — tiny dependency-free MQTT-over-WebSocket client!
- `app.js` — identity, Spaces, presence, live chat!
- `sound.js` — tiny Web Audio synth for UI sounds (no audio files)! Click the speaker icon to mute!
