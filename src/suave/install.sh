#!/bin/sh
# Installs Suave, Lake and Laker on a Mac (or Linux): puts the commands  suave  lake  laker  where your terminal finds them.
#
#   One line, from anywhere (downloads Suave first):
#       curl -fsSL https://radii-office.com/suave/install.sh | sh
#
#   From a downloaded copy of the Suave folder:
#       ./install.sh              install (installs Deno first if you do not have it)
#       ./install.sh --uninstall  remove the commands again (and the downloaded copy in ~/.suave)
#
#   Run it again any time to update.  "suave upgrade" does the same thing.
#   Settings (all optional):  SUAVE_URL=<where suave.tar.gz lives>  SUAVE_HOME=<where to keep it, default ~/.suave>  SUAVE_BIN=<where the commands go, default ~/.local/bin>
set -e
SELF="$0"
case "$SELF" in */install.sh|install.sh) HERE=$(cd "$(dirname "$SELF")" && pwd) ;; *) HERE="" ;; esac
BIN="${SUAVE_BIN:-$HOME/.local/bin}"
SUAVE_HOME="${SUAVE_HOME:-$HOME/.suave}"
SUAVE_URL="${SUAVE_URL:-https://radii-office.com/suave}"

if [ "$1" = "--uninstall" ]; then
  for c in suave lake laker; do rm -f "$BIN/$c"; done
  if [ -f "$SUAVE_HOME/.installed-by-curl" ]; then rm -rf "$SUAVE_HOME"; echo "Removed $SUAVE_HOME"; fi
  echo "Removed suave, lake and laker from $BIN"
  exit 0
fi

# no Suave folder next to this script (you used curl ... | sh), so download one
if [ -z "$HERE" ] || [ ! -f "$HERE/bin/suave" ]; then
  have() { command -v "$1" >/dev/null 2>&1; }
  fetch() { if have curl; then curl -fsSL "$1" -o "$2"; elif have wget; then wget -q -O "$2" "$1"; else echo "I need curl or wget to download Suave, and found neither."; exit 1; fi; }
  have tar || { echo "I need tar to unpack Suave, and did not find it."; exit 1; }
  TMP=$(mktemp -d "${TMPDIR:-/tmp}/suave-install.XXXXXX")
  trap 'rm -rf "$TMP"' EXIT
  echo "Downloading Suave from $SUAVE_URL ..."
  fetch "$SUAVE_URL/suave.tar.gz" "$TMP/suave.tar.gz" || { echo "The download failed. Check your internet connection and try again."; exit 1; }
  # make sure the file is the real one (a checksum is published next to it)
  if fetch "$SUAVE_URL/suave.tar.gz.sha256" "$TMP/suave.sha256" 2>/dev/null; then
    WANT=$(cut -d' ' -f1 "$TMP/suave.sha256")
    if have shasum; then GOT=$(shasum -a 256 "$TMP/suave.tar.gz" | cut -d' ' -f1); elif have sha256sum; then GOT=$(sha256sum "$TMP/suave.tar.gz" | cut -d' ' -f1); else GOT="$WANT"; fi
    if [ "$WANT" != "$GOT" ]; then echo "The downloaded file does not match its checksum, so I stopped. Try again in a minute."; exit 1; fi
  fi
  tar -xzf "$TMP/suave.tar.gz" -C "$TMP"
  [ -f "$TMP/suave/bin/suave" ] || { echo "The download did not contain Suave. Please tell the Suave team!"; exit 1; }
  rm -rf "$SUAVE_HOME.old"
  [ -e "$SUAVE_HOME" ] && mv "$SUAVE_HOME" "$SUAVE_HOME.old"
  mkdir -p "$(dirname "$SUAVE_HOME")"
  mv "$TMP/suave" "$SUAVE_HOME"
  rm -rf "$SUAVE_HOME.old"
  touch "$SUAVE_HOME/.installed-by-curl"
  HERE="$SUAVE_HOME"
fi

echo "Installing Suave from $HERE"

# files that came from the internet are blocked by macOS until you say they are fine
if command -v xattr >/dev/null 2>&1; then xattr -dr com.apple.quarantine "$HERE" 2>/dev/null || true; fi
chmod +x "$HERE/bin/suave" "$HERE/bin/lake" "$HERE/bin/laker" "$HERE/bin/suave.js" 2>/dev/null || true

# Suave runs on Deno
if ! command -v deno >/dev/null 2>&1; then
  if [ -x "$HOME/.deno/bin/deno" ]; then
    export PATH="$HOME/.deno/bin:$PATH"
  else
    echo "Deno is not installed yet, so I will install it first (this needs the internet)..."
    curl -fsSL https://deno.land/install.sh | sh -s -- -y
    export PATH="$HOME/.deno/bin:$PATH"
  fi
fi
echo "Using $(deno --version | head -1)"

mkdir -p "$BIN"
for c in suave lake laker; do
  ln -sf "$HERE/bin/$c" "$BIN/$c"
done

# make sure new terminal windows can find the commands (and Deno)
add_path() {
  FILE="$1"; LINE="$2"
  [ -f "$FILE" ] || touch "$FILE"
  grep -qsF "$LINE" "$FILE" || printf '\n# added by the Suave installer\n%s\n' "$LINE" >> "$FILE"
}
case ":$PATH:" in
  *":$BIN:"*) ;;
  *) for f in "$HOME/.zprofile" "$HOME/.zshrc" "$HOME/.bash_profile"; do add_path "$f" "export PATH=\"$BIN:\$PATH\""; done; export PATH="$BIN:$PATH"; NEWPATH=1 ;;
esac
if [ -d "$HOME/.deno/bin" ]; then
  case ":$PATH:" in *":$HOME/.deno/bin:"*) ;; *) for f in "$HOME/.zprofile" "$HOME/.zshrc"; do add_path "$f" 'export PATH="$HOME/.deno/bin:$PATH"'; done; export PATH="$HOME/.deno/bin:$PATH"; NEWPATH=1 ;; esac
fi

echo
if "$BIN/suave" eval '"Suave works: " + str(1 + 2)' ; then
  echo
  echo "Done! Try:  suave eval '1 + 2'      or      suave repl"
  [ -n "$NEWPATH" ] && echo "(Open a NEW terminal window first, so it picks up the new PATH.)"
else
  echo
  echo "Suave installed but did not start. Copy the message above and send it to Claude!"
  exit 1
fi
