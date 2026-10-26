# Clojure: the "Tip of the day" card on the home page!

`tips.cljs` is ClojureScript that runs straight in the browser through [Scittle](https://github.com/babashka/scittle)
(a ClojureScript interpreter), so there is no build step: edit the file and reload the page!

Files:
- `tips.cljs`: the tips, an atom holding which tip is showing (today's tip by default), and the Back/Next buttons!

`index.html` loads Scittle from jsDelivr, then `<script type="application/x-scittle" src="/clojure/tips.cljs">` runs this file!

## Whole apps in Clojure!

Three apps are written entirely in ClojureScript, run by Scittle in the same way:

- **Taskra** (`/taskra/`): `app.cljs` (the to-do list), `office.cljs` (the To Do ribbon) and `collab.cljs` (live editing together)!
- **Hexa** (`/hexa/`): `app.cljs` (calendar, agenda, Kanban boards, .ics and .kh files), `office.cljs` (the Outlook ribbon) and `collab.cljs` (live editing, with merged card order)!
- **Formly** (`/formly/`): `app.cljs` (the form builder, preview and .kfe / .kfv / .kfa files), `office.cljs` (the Forms ribbon) and `collab.cljs` (live editing that never redraws under your cursor)!

Each app keeps all its data in one atom as plain Clojure maps, and turns it into JSON only at the edges
(browser storage, files and live sessions)! The shared suite pieces (`office-shell.js`, `radii-collab.js`,
`radii-file.js`) stay JavaScript, since every app uses an identical copy of them!

Hosting note: Neocities only accepts `.cljs` uploads on supporter accounts!
