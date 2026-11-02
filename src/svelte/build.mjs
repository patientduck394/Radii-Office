// Builds the site's Svelte parts into one small file the pages load (no build step on the server)!
// Run: cd svelte && npm install && npm run build
import * as esbuild from 'esbuild';
import sveltePlugin from 'esbuild-svelte';

await esbuild.build({
    entryPoints: ['src/products.js'],
    outfile: 'products.js',
    bundle: true,
    format: 'iife',
    minify: true,
    target: ['es2020'],
    // Svelte's browser runtime in production mode (no dev checks)!
    conditions: ['svelte', 'browser', 'production'],
    define: { 'process.env.NODE_ENV': '"production"' },
    legalComments: 'none',
    // component styles ride inside the script, so a page needs just the one file!
    plugins: [sveltePlugin({ compilerOptions: { css: 'injected' } })],
    logLevel: 'info',
});
