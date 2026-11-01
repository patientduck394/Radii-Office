// Amber + radii-table.js: a table sits in a text box on the slide! Double-click it to type in the cells,
// and while you do, the bar above it adds or removes rows and columns.
(function () {
    'use strict';
    if (!window.RadiiTable) return;
    window.amberInsertTable = function () {
        RadiiTable.open({
            onInsert: function (table) {
                saveState();
                const rows = table.rows.length, cols = table.rows[0] ? table.rows[0].cells.length : 1;
                const id = 'el-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
                slides[activeSlideIndex].elements.push({
                    id: id, type: 'text', content: table.outerHTML,
                    top: 90, left: 40, width: Math.min(640, Math.max(220, cols * 120)), height: Math.min(300, rows * 34 + 6),
                    zIndex: slides[activeSlideIndex].elements.length + 1, fontSize: '16px', color: '#0c4a6e', textAlign: 'left'
                });
                activeElementId = id;
                editingElementId = null;
                renderThumbnails();
                renderActiveSlide();
                if (typeof amberQueueSave === 'function') amberQueueSave();
                try { if (window.OfficeShell) { OfficeShell.sync && OfficeShell.sync(); OfficeShell.toast('Table added! Double-click it to type in the cells!'); } } catch (e) {}
            }
        });
    };
    // the toolbar shows while a table's text box is being edited
    const start = function () {
        const c = document.getElementById('slide-canvas');
        if (c) RadiiTable.attach(c, { editable: function (t) { return !!t.closest('.slide-element.editing'); }, onChange: function () { try { renderThumbnails(); } catch (e) {} } });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
