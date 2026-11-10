// Fingerprints and signs the downloads (run: node scripts/sign_downloads.mjs; build_source.mjs runs it for you)!
//   downloads/SHA256SUMS      the SHA-256 fingerprint of every file in downloads/
//   downloads/SHA256SUMS.sig  a signature over that list, made with the release key (an Ed25519 key, via ssh-keygen -Y sign)
// Anyone can check a download (the key is public: /signing/radii-office-signing.pub and /signing/allowed_signers):
//   shasum -a 256 -c SHA256SUMS
//   ssh-keygen -Y verify -f allowed_signers -I radii-office -n radii-office -s SHA256SUMS.sig < SHA256SUMS
// The private key lives only on the computer that builds the release: ~/.radii-office-signing/id_ed25519 (or $RADII_SIGNING_KEY).
// Keep a backup of it somewhere safe and private, and never put it in the repository or the site!
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'downloads');
const KEY = process.env.RADII_SIGNING_KEY || path.join(os.homedir(), '.radii-office-signing', 'id_ed25519');
const SKIP = /^(SHA256SUMS(\.sig)?|\.DS_Store)$/;

export function sign() {
  if (!fs.existsSync(DIR)) return { files: 0, signed: false };
  const names = fs.readdirSync(DIR).filter((f) => !SKIP.test(f) && fs.statSync(path.join(DIR, f)).isFile()).sort();
  const lines = names.map((f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f))).digest('hex') + '  ' + f);
  const sums = path.join(DIR, 'SHA256SUMS');
  fs.writeFileSync(sums, lines.join('\n') + '\n');
  fs.rmSync(sums + '.sig', { force: true });
  if (!fs.existsSync(KEY)) { console.log('Fingerprints written (' + names.length + ' files), but there is no signing key at ' + KEY + ', so nothing was signed.'); return { files: names.length, signed: false }; }
  execFileSync('ssh-keygen', ['-Y', 'sign', '-q', '-f', KEY, '-n', 'radii-office', sums], { stdio: 'inherit' });
  // (check our own signature, so a broken key is noticed right away)
  const allowed = path.join(ROOT, 'signing', 'allowed_signers');
  execFileSync('ssh-keygen', ['-Y', 'verify', '-f', allowed, '-I', 'radii-office', '-n', 'radii-office', '-s', sums + '.sig'], { input: fs.readFileSync(sums), stdio: ['pipe', 'ignore', 'inherit'] });
  console.log('Signed ' + names.length + ' downloads (SHA256SUMS + SHA256SUMS.sig).');
  return { files: names.length, signed: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) sign();
