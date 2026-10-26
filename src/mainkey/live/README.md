# Mainkey Live! 🌐

Turn a Mainkey `.kb` file into a live database on any website!

## Quick start

1. In Mainkey, click **🌐 Website Kit** and download `database.kb` and `mainkey-live.js`!
2. Upload both next to your page!
3. Paste this where the database should go:

```html
<div data-mainkey="database.kb"></div>
<script src="mainkey-live.js"></script>
```

That's it! Visitors can search, sort, switch between table and cards, add, edit, duplicate and delete records!

**One-file option:** the kit's `database.html` has the library and your data built in! It works on any host and even straight from your disk!

## Widget options (HTML attributes)

| Attribute | What it does | Default |
|---|---|---|
| `data-mainkey` | The database: a URL (`database.kb`) or an inline element (`#my-data`) | — |
| `data-mainkey-title` | Heading above the database | none |
| `data-mainkey-view` | `table` or `cards` | `table` |
| `data-mainkey-editable` | `false` makes it read-only | `true` |
| `data-mainkey-search` | `false` hides the search box | `true` |
| `data-mainkey-downloads` | `false` hides the .kb/.csv downloads | `true` |
| `data-mainkey-accent` | Accent color, e.g. `#0ea5e9` | `#a305ff` |
| `data-mainkey-height` | Max height before scrolling, e.g. `400` or `60vh` | none |
| `data-mainkey-key` | Storage name (handy for inline data) | the file's URL |
| `data-mainkey-persist` | `false` forgets edits on reload | `true` |
| `data-mainkey-host` | A host room (`id.key`): the database becomes **shared** and follows a Mainkey tab that is hosting it (see below) | none |

Several widgets pointing at the same file share **one** live database, so editing one updates the others instantly!

## JavaScript API

```js
const db = await Mainkey.load('database.kb');   // or '#inline-id', or { fields, records }

db.count;                         // number of records!
db.fields;                        // [{ id, name, type }]!
db.all();                         // every record!
db.get(1);                        // one record by id (or null)!

db.query({
  search: 'alpha',                // text search across all fields!
  where: { status: 'Done' },      // exact match, or { value: v => v > 100 }, or a function!
  sort: 'value', dir: 'desc',     // number fields sort numerically!
  limit: 10, offset: 0
});

db.stats('value');                // { count, sum, avg, min, max, median }!
db.counts('status');              // { Done: 3, Todo: 2 }!

db.insert({ title: 'New', status: 'Todo', value: 5 });   // returns the record with its id!
db.update(1, { status: 'Done' });
db.remove(1);
db.duplicate(2);
db.clear();
db.addField('Due Date', 'text');  // types: text, number, tag!
db.removeField('due_date');
db.revert();                      // drop this visitor's edits, back to the published file!
await db.replace(otherKbText);    // swap in a whole new database!

const stop = db.subscribe(change => console.log(change.type));  // insert, update, remove, ...
stop();

db.toKB();  db.toCSV();  db.toJSON();
db.download('kb');  db.download('csv');

Mainkey.mount('#somewhere', db, { view: 'cards', editable: false });
Mainkey.scan();                   // mount any [data-mainkey] added later!
```

`Mainkey.load()` also takes options: `{ key, persist, onChange(change, db) }`!

## How "live" works

- Edits are saved in each visitor's browser (localStorage) and survive reloads!
- Open tabs of the same site stay in sync automatically!
- Upload a new `database.kb` and every visitor gets it: their old local edits are replaced by your new version!
- On their own, visitors **don't** see each other's edits, because a static site has nowhere to store them! For a shared database, **host it** (next section), or send changes to your own server with `onChange` or `db.subscribe()`!

## Hosting: a browser tab is the server

Make the database **shared**, with no server of your own:

1. Open it in Mainkey and click **📡 Host**, then **Start hosting**. Keep that tab open!
2. Paste the snippet it gives you into your page (next to `database.kb` and `mainkey-live.js`):

```html
<div data-mainkey="database.kb" data-mainkey-host="ROOM-ID.ROOM-KEY"></div>
<script src="mainkey-live.js"></script>
```

Now every visitor reads and changes the **same live data**: their changes go to your Mainkey tab, which saves them and sends the new version to everyone, and your own edits in Mainkey reach them too!

- **How it travels:** through the same public relays Radii's live collaboration uses (MQTT over WebSocket). Every message is sealed with AES-GCM using the key in the room code, so the relays only carry locked boxes!
- **When your tab is closed,** visitors see the last shared copy (the relays keep it) and the widget says the host is away. Changes made meanwhile only show for that visitor until the host is back!
- **Read-only:** untick "Visitors can add and change records" and visitors can only look (the host refuses changes).
- **Mind this:** the room code is in your page, so anyone who can open your page can read the data (and change it, if you allow that). Don't host secrets! Clicking **New room link** makes a fresh code (the old snippet stops working). Keep the database under about 1 MB.

From code:

```js
const h = Mainkey.host(db, { room: Mainkey.makeRoom(), readOnly: false, onStatus: info => console.log(info.visitors) });
const shared = await Mainkey.load('database.kb', { host: h.room });   // on a visitor's page
shared.remote.state;   // 'live', 'away', 'waiting' or 'offline'
```

## Notes

- YAML `.kb` files use [js-yaml](https://github.com/nodeca/js-yaml), loaded from cdnjs on demand! JSON `.kb` files need nothing extra!
- Files are fetched, so a two-file setup needs a web server (any static host works)! Use the one-file `database.html` to open it straight from disk!
- All data is shown as text, never as HTML, so records can't inject code into your page!
- Works in Node too: `const Mainkey = require('./mainkey-live.js')`!
