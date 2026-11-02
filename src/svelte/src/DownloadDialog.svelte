<script>
    // The Download popup: pick your operating system to get an app's desktop build!
    // Every build lives in the "desktop" release on GitHub (made by the workflow in desktop/workflow/),
    // and a button only works when GitHub says its file is really there!
    const RELEASE = 'https://github.com/patientduck394/Radii-Office/releases/download/desktop/';
    const API = 'https://api.github.com/repos/patientduck394/Radii-Office/releases/tags/desktop';
    const NOT_BUILT = 'Coming soon!';
    const SYSTEMS = [
        { id: 'mac-arm', os: 'macOS', note: 'Apple Silicon (M1 and newer)', file: '-macOS-AppleSilicon.dmg' },
        { id: 'mac-intel', os: 'macOS', note: 'Intel', file: '-macOS-Intel.dmg' },
        { id: 'windows', os: 'Windows', note: '10 and 11, 64-bit', file: '-Windows.exe' },
        { id: 'linux', os: 'Linux', note: 'AppImage, 64-bit', file: '-Linux.AppImage' },
    ];
    const TIPS = {
        mac: ' Drag it to Applications, and the first time, right-click it and pick Open!',
        windows: ' Run the installer! If SmartScreen warns you, click More info, then Run anyway!',
        linux: ' Make it runnable (chmod +x the file, or tick "Allow executing" in its Properties), then open it!',
    };

    let dialog;
    let app = $state(null); // the app's name, like "Writeout"
    let have = $state(undefined); // the release's file names (null: GitHub can't be asked, so every link is offered)
    let status = $state('');

    // Which files the release really has (asked once)!
    let asked = null;
    function releaseFiles() {
        if (!asked) asked = fetch(API)
            .then((r) => {
                if (r.status === 404) return new Set();
                if (!r.ok) throw new Error(String(r.status));
                return r.json().then((d) => new Set((d.assets || []).map((a) => a.name)));
            })
            .catch(() => null);
        return asked;
    }

    export async function open(name) {
        app = name;
        status = '';
        have = await releaseFiles();
        if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    }
    function close() {
        if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    }

    const fileName = (sys) => app + sys.file;
    const ready = (sys) => have === null || !!(have && have.has(fileName(sys)));

    function download(sys) {
        const a = document.createElement('a');
        a.href = RELEASE + fileName(sys);
        a.download = fileName(sys);
        document.body.appendChild(a);
        a.click();
        a.remove();
        status = 'Downloading ' + app + ' for ' + sys.os + '!' + TIPS[sys.id.startsWith('mac') ? 'mac' : sys.id];
    }
</script>

<!-- Clicking the dimmed area outside the popup closes it too! -->
<dialog bind:this={dialog} class="dl-dialog" aria-labelledby="dl-title" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="dl-head">
        <h3 id="dl-title">Download {app || ''}</h3>
        <button type="button" class="dl-close" aria-label="Close" onclick={close}>X</button>
    </div>
    <p class="dl-sub">Pick your operating system to download the latest desktop app!</p>
    <div class="os-grid">
        {#each SYSTEMS as sys (sys.id)}
            {@const ok = ready(sys)}
            <button type="button" class="os-btn" disabled={!ok} onclick={() => download(sys)}
                aria-label={'Download ' + app + ' for ' + sys.os + ' ' + sys.note + (ok ? '' : ' (' + NOT_BUILT + ')')}>
                <span class="os-name">{sys.os}</span>
                <span class="os-note">{ok ? sys.note : sys.note + ' · ' + NOT_BUILT}</span>
            </button>
        {/each}
    </div>
    <p class="dl-status" aria-live="polite">{status}</p>
</dialog>

<style>
    .dl-dialog {
        width: min(520px, calc(100vw - 32px));
        box-sizing: border-box;
        padding: 22px;
        border: 2px solid rgba(5, 147, 255, 0.5);
        border-radius: 16px;
        background: linear-gradient(180deg, #06293a 0%, #021521 100%);
        color: #ffffff;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(5, 130, 255, 0.25);
    }
    .dl-dialog::backdrop { background: rgba(0, 10, 18, 0.7); backdrop-filter: blur(4px); }
    .dl-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .dl-head h3 { margin: 0; font-size: 1.2rem; }
    .dl-close {
        background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(158, 221, 255, 0.5); border-radius: 8px;
        color: #ffffff; font: inherit; font-weight: 800; padding: 4px 10px; cursor: pointer;
    }
    .dl-sub { margin: 8px 0 14px; font-size: 0.85rem; color: #bae6fd; }
    .os-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
    .os-btn {
        display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left;
        padding: 10px 12px; border-radius: 10px; cursor: pointer; font: inherit; color: #ffffff;
        background: linear-gradient(180deg, #5e9cff 0%, #0582ff 100%); border: 1px solid #9eddff;
        box-shadow: 0 4px 12px rgba(5, 130, 255, 0.35); transition: all 0.2s ease;
    }
    .os-btn:hover:not(:disabled) { box-shadow: 0 6px 18px rgba(5, 130, 255, 0.7); transform: translateY(-2px); }
    .os-btn:disabled { cursor: not-allowed; background: rgba(255, 255, 255, 0.06); border-color: rgba(158, 221, 255, 0.25); box-shadow: none; color: #94a3b8; }
    .os-btn:focus-visible, .dl-close:focus-visible { outline: 2px solid #9eddff; outline-offset: 2px; }
    .os-name { font-weight: 800; font-size: 0.9rem; }
    .os-note { font-size: 0.72rem; opacity: 0.85; }
    .dl-status { min-height: 1.2em; margin: 12px 0 0; font-size: 0.8rem; color: #bae6fd; }
</style>
