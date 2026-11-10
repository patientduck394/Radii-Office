# Security

Thank you for looking out for Radii Office users!

## Reporting a problem

Please report security problems privately, using GitHub's private reporting: **Security, then "Report a vulnerability"** on this repository
(https://github.com/patientduck394/Radii-Office/security/advisories/new). Please don't post details in a public issue until it is fixed.
Tell us what you found, which app, and the steps to see it. We'll answer as soon as we can.

## What is covered

The website and apps (https://radii-office.com and https://radii-office.pages.dev), the desktop apps in the releases, and the Yuzu mail Worker.

## How downloads are protected

- Every desktop release has a `SHA256SUMS` file and a signed build record for each file: `gh attestation verify <file> --repo patientduck394/Radii-Office`
- The source and offline downloads have `SHA256SUMS` and `SHA256SUMS.sig`, signed with a published key (see `src/signing/README.md`).
- The desktop apps can only read or write files and folders you picked in that app's own file dialogs.
- Libraries loaded from a CDN with a fixed version carry integrity checks, so a changed file is refused.
- Pages are served with `nosniff`, a strict referrer policy, a camera/microphone/location policy and `frame-ancestors 'self'`.

## Things worth knowing

- Documents live in your browser (or the file you chose). Anyone using your computer can open them: lock your computer, and don't paste secrets into notes.
- BitLang programs in a document run in your browser, so only play programs from people you trust (Python asks before it runs).
