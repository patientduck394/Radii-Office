# Antimony Boards! 📝

Look at fresh posts, live — **moderators post, everyone looks!**

Same engine as Phosphor (WebRTC browser to browser, local identity, directory
cards, live chat) with a darker teal glow — but only the Space owner and admins
(moderators!) can publish! Everyone else gets a read-only board!

## How to use it!

1. Open `index.html` (or visit the site — that's literally it)!
2. Pick a display name!
3. Hit **New Space** to moderate your own board, or **Join Space** with a
   friend's code to look at theirs!
4. Moderators: hit **📝 New Post!** for the Padlet-style posting menu with
   Keydown formatting + live preview! Viewers: just enjoy the board!

## How does it work with no server?!

Posts travel **WebRTC only**: straight from browser to browser over DataChannels,
never through a server! Browsers can't find each other on their own, so a free
public MQTT relay carries just the little "how do I reach you" notes and the
board's directory card (its name and owner)! Whoever links up later gets the last
60 posts handed over by someone already there! The owner and admins are the
moderators, and every client enforces it, so only they can publish!

- No accounts: your identity is a random ID + name in this browser!
- No history server: the last 100 posts per board stay on your devices!
- Read-only viewers: the composer hides and sending refuses — look, don't touch!
- Someone has to be online: posts travel only between browsers that are open!
- Anyone with a Space code can read that board, so don't share secrets!

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

The Space creator is the **owner** 👑 and can name **admins** 🛡, who post and
moderate too! Over WebRTC every post comes from the browser that really sent it,
so nobody can fake an owner or admin!

Owner only:

- `/admin @name` — make them an admin (they can post right away)! `/admin` on its own lists the admins!
- `/demote @name` — take their admin powers back!

Owner and admins, from the message bar or the posting menu:

- `/kick @name [reason]` — remove them (they can rejoin with the code)!
- `/ban @name [reason]` — remove and block them until `/unban`!
- `/unban @name` — lift the ban!
- `/warn @name "message"` — private warning card only they can see!
- `/delete 1-3&5` — delete posts by number (top is 1, `-` ranges, `&` multiples)!
- `/blockword AGPL` — nobody but the owner and admins can post that word (or phrase)!
  Matching ignores capitals and only hits whole words!
- `/unblockword MIT` — allow it again! `/blockword` on its own lists them!

Admins can't moderate the owner or each other! The admin list and blocked words
travel with the board, so people who join later get them from the owner or an admin!

## Files!

- `index.html` — the whole page + posting menu!
- `styles.css` — the dark teal glow!
- `nets.js` — the WebRTC DataChannel mesh every board talks over!
- `mqtt.js` — tiny dependency-free MQTT-over-WebSocket client!
- `app.js` — identity, boards, presence, live posts, Padlet composer!
- `sound.js` — tiny Web Audio synth for UI sounds (no audio files)! Click the speaker icon to mute!
