# Phosphor Live! 💬

Talk together, live — **no signup, no password, no setup, no commands!**

## How to use it!

1. Open `index.html` (or visit the site — that's literally it)!
2. Pick a display name!
3. Hit **New Space** (or Join with a friend's code)!
4. Share the invite code — anyone who opens the page and enters it
   joins the same live conversation!

## How does it work with no server?!

Every Space talks **WebRTC only**: messages, files, presence and moderation go
straight from browser to browser over DataChannels, never through a server!
Browsers can't find each other on their own, so a free public MQTT relay carries
just the little "how do I reach you" notes (offers, answers, network hints), the
Space's directory card (its name and owner) and call setup! Whoever links up later
gets the last 60 messages handed over directly by someone already there!

- No accounts: your identity is a random ID + name in this browser!
- No history server: the last 100 messages per Space stay on your devices!
- Someone has to be online: messages travel only between browsers that are open!
- Anyone with a Space code can join and read that Space, so don't share secrets!
- No TURN server, so some strict networks can't link directly!

## Calls!

Press **Voice** or **Video** in a Space's header! Calls run straight between
browsers (WebRTC, encrypted with DTLS-SRTP) with mute, camera and screen sharing!
Everyone links to everyone, so calls shine with up to about 6 people! There is no
TURN server, so some strict networks can't connect directly!

## Moderation: owner, admins and blocked words!

The Space creator is the **owner** 👑 and can name **admins** 🛡! Over WebRTC every
message comes from the browser that really sent it, so nobody can fake an owner or
admin action!

Owner only:

- `/admin @name` — make them an admin! `/admin` on its own lists the admins!
- `/demote @name` — take their admin powers back!

Owner and admins:

- `/kick @name [reason]` — remove them (they can rejoin with the code)!
- `/ban @name [reason]` — remove and block them until `/unban`!
- `/unban @name` — lift the ban!
- `/warn @name "message"` — private warning card only they can see,
  with full Keydown formatting!
- `/delete 1-3&5` — delete messages by number (top is 1, `-` for ranges,
  `&` for multiples, combinable like `1-10&7-3&6-8`)! Every bubble shows
  its number, and every device deletes the same messages!
- `/blockword AGPL` — nobody but the owner and admins can post that word (or
  phrase) anymore! Matching ignores capitals and only hits whole words!
- `/unblockword MIT` — allow it again! `/blockword` on its own lists them!

Admins can't moderate the owner or each other! The admin list and blocked words
travel with the Space, so people who join later get them from the owner or an admin!

## Mention filter!

Trolls in your @ suggestions? Hit the ✖ on any suggestion to hide them,
or open `Mention filter!` in the sidebar to unhide people and clear the
index of everyone ever seen! Hidden people can still be moderated, and
typing them out still notifies them — hiding only cleans up suggestions!

## Files!

- `index.html` — the whole page!
- `styles.css` — the glow!
- `mqtt.js` — tiny dependency-free MQTT-over-WebSocket client (for the handshake notes only)!
- `nets.js` — the WebRTC DataChannel mesh every Space talks over!
- `app.js` — identity, Spaces, presence, live chat, mentions, file + folder sharing!
- `sound.js` — tiny Web Audio synth for UI sounds (no audio files)! Click the speaker icon to mute!
