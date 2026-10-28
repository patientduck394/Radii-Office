// The "Tip of the day" card on the home page! Plain JavaScript, no build step!
(function () {
    'use strict';

    const TIPS = [
        'In Bitbook or Omicron, type ::aqua and press Space to turn text into a glossy chip!',
        "Bitbook's Programs skill lets you write little games in BitLang, then click the chip to play them!",
        'Share & Chat lets you edit together in real time, and every message is end-to-end encrypted!',
        'Mainkey can host a database straight from your browser tab: click 📡 Host and share the snippet!',
        'Annotate in Bitbook has over 30 highlight styles, from Gel Bubble to Gel Torpedo!',
        'Omicron exports your page as a ZIP or as one HTML file with every style built in!',
        'Every app has a Classic toggle, so you can switch between the Office ribbon and the classic look!',
        'Want to see how it all works? The Source Code page lets you download the whole suite!',
        'BitLang programs can call Python, Lua and SQLite with a single use line!',
        'On the Products page, press / to search every app!',
    ];

    const mod = (a, n) => ((a % n) + n) % n;
    let i = mod(Math.floor(Date.now() / 86400000), TIPS.length);

    function el(tag, className, text) {
        const e = document.createElement(tag);
        e.className = className;
        if (text) e.textContent = text;
        return e;
    }

    function render() {
        const text = document.querySelector('.rt-text');
        if (!text) return;
        text.textContent = TIPS[i];
        document.querySelector('.rt-count').textContent = (i + 1) + ' / ' + TIPS.length;
    }

    function button(label, title, n) {
        const b = el('button', 'rt-btn', label);
        b.type = 'button';
        b.setAttribute('aria-label', title);
        b.addEventListener('click', () => { i = mod(i + n, TIPS.length); render(); });
        return b;
    }

    function mount() {
        const anchor = document.querySelector('.hero-text-block');
        if (!anchor || document.querySelector('.rt-card')) return;
        const card = el('aside', 'rt-card');
        const head = el('div', 'rt-head');
        const text = el('p', 'rt-text', '');
        const nav = el('div', 'rt-nav');
        card.setAttribute('aria-label', 'Tip of the day');
        head.append(el('span', 'rt-title', '💡 Tip of the day'), el('span', 'rt-count', ''));
        text.setAttribute('aria-live', 'polite');
        nav.append(button('‹ Back', 'Previous tip', -1), button('Next ›', 'Next tip', 1));
        card.append(head, text, nav);
        anchor.append(card);
        render();
    }

    mount();
})();
