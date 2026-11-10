# Checking a Radii Office download

Every file in the Radii Office downloads and releases can be checked, so you know it is the real thing and nothing changed on the way to you!

## The source and offline downloads (radii-office-source.zip, radii-office-source.kc)

Next to the downloads is a list of fingerprints (`SHA256SUMS`) and a signature over that list (`SHA256SUMS.sig`).

1. Check the fingerprints: `shasum -a 256 -c SHA256SUMS`
2. Check the signature (get `allowed_signers` from this folder, or from https://radii-office.com/signing/allowed_signers):
   `ssh-keygen -Y verify -f allowed_signers -I radii-office -n radii-office -s SHA256SUMS.sig < SHA256SUMS`

You should see: `Good "radii-office" signature for radii-office with ED25519 key SHA256:3Uaau2hpU4KQOx8NNUc7WWfbqEzGuuCIYoXZjuZJaLk`.
That fingerprint is the release key, also published in `radii-office-signing.pub`.

## The desktop apps (GitHub releases)

Every release has a `SHA256SUMS` and, for each app, a signed build record from GitHub (it proves the file was built by this repository's workflow):

`gh attestation verify <the file> --repo patientduck394/Radii-Office`

When an Apple Developer ID or a Windows code-signing certificate has been added to the repository, the macOS and Windows apps are also signed (and notarized) the normal way.

## For the person who builds the releases

The private key is `~/.radii-office-signing/id_ed25519` (or the file named in `RADII_SIGNING_KEY`). `node scripts/build_source.mjs` signs the downloads with it.
Keep a backup of that file somewhere private (a password manager or an encrypted drive), and never put it in the repository or on the site.
If it is ever lost or exposed: make a new key with `ssh-keygen -t ed25519 -N "" -f ~/.radii-office-signing/id_ed25519`, replace `radii-office-signing.pub` and `allowed_signers` here, and say so in the release notes.
