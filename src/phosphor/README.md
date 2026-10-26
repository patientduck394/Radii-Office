# Phosphor Live! 💬

Talk together, live — **no signup, no password, no setup, no commands!**

## How to use it!

1. Open `index.html` (or visit the site — that's literally it)!
2. Pick a display name!
3. Hit **New Space** (or Join with a friend's code)!
4. Share the invite code — anyone who opens the page and enters it
   joins the same live conversation!

## How does it work with no server?!

Your browser talks straight to a free public MQTT relay over WebSockets!
Everyone meets on ONE central relay by default, so near + far devices always
overlap! Backup relays idle in the background and take over instantly if
central drops, then hand traffic back when it returns! Messages fly
room-to-room live, Space directories + presence ride on retained topics,
and your name, Spaces, and recent messages live in `localStorage`!

- No accounts: your identity is a random ID + name in this browser!
- No history server: the last 100 messages per Space stay on your devices!
- Public relays: anyone with a Space code can read that Space — it's a
  cozy public park, not a vault! Don't share secrets!

## Space networks!

Every new Space picks how its messages travel:

- **☁ EMQX** — its own link to the public EMQX broker (`broker.emqx.io`)! Zero setup!
- **🐇 RabbitMQ** — your own RabbitMQ server with the Web MQTT plugin
  (`rabbitmq-plugins enable rabbitmq_web_mqtt`, then `wss://host:15676/ws`)!
  Add a username (`vhost:user` for a vhost) and password if the server needs one!
  Invite links carry the login in their `#` part, which browsers never send to servers!
- **⇄ WebRTC** — browser to browser over DataChannels! The relays only carry the
  connection notes, never the messages! Whoever links up later gets the last 60
  messages handed over directly!

Joining by code? Pick **Auto** and Phosphor asks the Space's directory card which
network it uses! Older Spaces keep the shared relay network!

## Calls!

Press **Voice** or **Video** in a Space's header! Calls run straight between
browsers (WebRTC, encrypted with DTLS-SRTP) with mute, camera and screen sharing!
Everyone links to everyone, so calls shine with up to about 6 people! There is no
TURN server, so some strict networks can't connect directly!

## Space owner commands!

The Space creator can moderate from the message bar! Enforcement is
cooperative (every client obeys what it can verify), so it keeps honest
rooms tidy rather than stopping determined spoofers!

- `/kick @name [reason]` — remove them (they can rejoin with the code)!
- `/ban @name [reason]` — remove and block them until `/unban`!
- `/unban @name` — lift the ban!
- `/warn @name "message"` — private warning card only they can see,
  with full Keydown formatting! (Public relays carry it, so treat it
  like a loud whisper, not a sealed letter!)
- `/delete 1-3&5` — delete messages by number (top is 1, `-` for ranges,
  `&` for multiples, combinable like `1-10&7-3&6-8`)! Every bubble shows
  its number, and every device deletes the same messages!

## Mention filter!

Trolls in your @ suggestions? Hit the ✖ on any suggestion to hide them,
or open `Mention filter!` in the sidebar to unhide people and clear the
index of everyone ever seen! Hidden people can still be moderated, and
typing them out still notifies them — hiding only cleans up suggestions!

## Files!

- `index.html` — the whole page!
- `styles.css` — the glow!
- `mqtt.js` — tiny dependency-free MQTT-over-WebSocket client!
- `app.js` — identity, Spaces, presence, live chat, mentions, file + folder sharing!
- `sound.js` — tiny Web Audio synth for UI sounds (no audio files)! Click the speaker icon to mute!
