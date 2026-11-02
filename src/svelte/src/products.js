// The Products page's Svelte parts: the "Find an app" bar above the cards and the Download popup!
import { mount } from 'svelte';
import ProductFinder from './ProductFinder.svelte';
import DownloadDialog from './DownloadDialog.svelte';

// Each app's name exactly as its desktop files are named in the release (Writeout-Windows.exe...)!
const APPS = { inkpath: 'Inkpath', mainkey: 'Mainkey', imbuer: 'Imbuer', writeout: 'Writeout', amber: 'Amber', omicron: 'Omicron', formly: 'Formly', opendb: 'OpenDB', peeker: 'Peeker', cabinet: 'Cabinet', phosphor: 'Phosphor', bitbook: 'Bitbook', hexa: 'Hexa', taskra: 'Taskra', waterflow: 'Waterflow' };

function start() {
    const grid = document.querySelector('.product-grid');
    if (grid) {
        const host = document.createElement('div');
        grid.parentNode.insertBefore(host, grid);
        mount(ProductFinder, { target: host, props: { grid, archives: document.getElementById('archives') } });
    }
    // One popup for every card's Download button (data-download-app="writeout" -> Writeout's builds)!
    const popup = mount(DownloadDialog, { target: document.body });
    document.querySelectorAll('[data-download-app]').forEach((b) => {
        const name = APPS[b.getAttribute('data-download-app')];
        if (name) b.addEventListener('click', () => popup.open(name));
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
