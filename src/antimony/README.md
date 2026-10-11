# Antimony Boards! 📝

Look at fresh posts, live — **moderators post, everyone looks!**

Same engine as Phosphor (central relay + backups, local identity, retained
directories, live chat) with a darker teal glow — but only Space owners
(moderators!) can publish! Everyone else gets a read-only board!

## How to use it!

1. Open `index.html` (or visit the site — that's literally it)!
2. Pick a display name!
3. Hit **New Space** to moderate your own board, or **Join Space** with a
   friend's code to look at theirs!
4. Moderators: hit **📝 New Post!** for the Padlet-style posting menu with
   Keydown formatting + live preview! Viewers: just enjoy the board!

## How does it work with no server?!

Exactly like Phosphor: your browser talks straight to one central public
MQTT relay over WebSockets (backups idle for failover)! The Space creator is
the moderator — every client enforces it, so only the owner can publish!
Your name, Spaces, and recent posts live in `localStorage`!

- No accounts: your identity is a random ID + name in this browser!
- No history server: the last 100 posts per board stay on your devices!
- Read-only viewers: the composer hides and sending refuses — look, don't touch!
- Public relays: anyone with a Space code can read that board — it's a cozy
  gallery, not a vault! Don't share secrets!

## Moderator posting dock!

Hit **📝 New Post!** (or the **+ Post** button, bottom-right!) for the
composer card! Subject line, attach strip (file, photo, formatting, link,
mention, more blocks!), a Keydown toolbar with REAL formatting triggers:

- **B** → `**bold**`, *I* → `*italic*`, `<>` → `` `code` ``, <u>U</u> → `~U~`!
- 🟡 → `=Y=gel=Y=` orb, 💫 → `~S~glow~S~`, #️⃣ → `!#G#tag#` chip!
- 🚨 📦 ➖ 🪟 insert whole-post `::alert`, `::code`, `::divider`, `::glass`!
- The preview renders live via `kdRender` — what you see is what posts!
- Pick a card tone (White/Teal/Amber/Crimson), toggle extra fields, expand
  for room, minimize to the button, or schedule publishing for later!
- Drafts survive per board until you post or close!
- **All tools** opens a compact menu: search bar (paste a URL to insert it,
  or type words to web-search them!) plus Upload, Photo, Link, Mention,
  Location, and Blocks — only real, working options!

## Moderator commands!

The Space creator moderates from the message bar or the posting menu!

- `/kick @name [reason]` — remove them (they can rejoin with the code)!
- `/ban @name [reason]` — remove and block them until `/unban`!
- `/unban @name` — lift the ban!
- `/warn @name "message"` — private warning card only they can see!
- `/delete 1-3&5` — delete posts by number (top is 1, `-` ranges, `&` multiples)!

## Files!

- `index.html` — the whole page + posting menu!
- `styles.css` — the dark teal glow!
- `mqtt.js` — tiny dependency-free MQTT-over-WebSocket client!
- `app.js` — identity, boards, presence, live posts, Padlet composer!
- `sound.js` — tiny Web Audio synth for UI sounds (no audio files)! Click the speaker icon to mute!
