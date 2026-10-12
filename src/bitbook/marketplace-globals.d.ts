// marketplace-globals.d.ts — ambient declarations for cross-file browser globals!
// No runtime impact: these names come from sibling scripts loaded by the page!
// Recompile with: npx -y -p typescript tsc --project tsconfig.dom.json

declare function playAeroClickSound(frequency?: number, duration?: number): void;
declare function autoSaveCanvasContent(): void;
declare const WriteoutSettings: any;

interface Window {
    WriteoutMarketplace?: any;
    WriteoutSettings?: any;
}

interface HTMLElement {
    _mktUpdate?: any;
    _mktOutside?: any;
    _mktRefresh?: any;
}
