# Yuzu Mail server

This one Cloudflare Worker gives Yuzu real **name@radii-office.com** addresses. It receives mail for the domain, keeps each
address's messages in a D1 database, lets people make an address and sign in with a name and password, and sends mail out.
Mail between two Yuzu addresses is delivered straight into the other inbox. Messages from outside are stored as plain text only.

You do this once (about 15 minutes). Radii Office's own site does not need to change.

1. **Install and sign in.** In this folder run `npm install`, then `npx wrangler login`.
2. **Make the database.** `npx wrangler d1 create yuzu-mail` prints a `database_id`: paste it into `wrangler.toml`.
   Then `npx wrangler d1 execute yuzu-mail --remote --file=schema.sql`.
3. **Set the secret** that signs sign-in tokens: `npx wrangler secret put SECRET` and paste a long random string (32+ characters).
4. **Turn on sending.** In the Cloudflare dashboard open the `radii-office.com` zone, then **Email** and turn on **Email Sending** for the domain
   (it adds the SPF, DKIM and DMARC records for you). If your account does not have it yet, remove the `[[send_email]]` block from
   `wrangler.toml`: Yuzu addresses still receive mail and can write to each other, and writing to outside addresses says it is not turned on.
5. **Deploy.** `npx wrangler deploy` prints the Worker's address (like `https://yuzu-mail.you.workers.dev`).
6. **Turn on receiving.** In the dashboard, **Email** → **Email Routing** → enable it for `radii-office.com` (it adds the MX records),
   then **Routing rules** → **Catch-all address** → **Send to a Worker** → `yuzu-mail`. Unknown names are refused by the Worker.
7. **Tell Yuzu where the server is.** Put the Worker's address in `yuzu/config.js` as `api`, or paste it into
   Yuzu's **Set up sign-in** window. Then anyone can press **Get your @radii-office.com address**.

If the website you use is not `radii-office.com` or `radii-office.pages.dev`, add it to `ORIGINS` in `wrangler.toml` and deploy again.

**Limits built in:** 5 new addresses per visitor a day, 50 sent messages per address a day, 20 recipients per message, 5 MB per incoming message,
8 wrong passwords locks sign-in for 15 minutes, and names like admin, postmaster and support are kept back.
Passwords are stored as salted PBKDF2 hashes and are never readable. There is no password reset yet, so a forgotten password means a new address.

**Try it on your computer:** `npx wrangler d1 execute yuzu-mail --local --file=schema.sql`, then
`npx wrangler dev --var SECRET:any-long-test-string-1234`, and put `http://localhost:8787` in Yuzu's Set up sign-in window.
Test incoming mail with `curl -X POST "http://localhost:8787/cdn-cgi/handler/email?from=a@b.com&to=you@radii-office.com" --data-binary @message.eml`.
