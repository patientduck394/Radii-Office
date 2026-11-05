//! `inline()` from writeout/keydown-doc.js: one line of Keydown text to HTML.
//! It works like the JavaScript one: pieces that must stay literal or become their own element are put in a store
//! ("stashed") behind a placeholder, the triggers are applied from the longest opener down, then everything is put back.
//! What this port does not do yet makes it return None, and the caller then uses the JavaScript engine.

use crate::tables::{AN_STYLES, HL_COLORS, HL_STYLES, TRIGGERS, US_FAMS};
use crate::util::{collect, esc, index_of, is_space, slug, starts_with_at, trim_chars};
use std::collections::HashMap;
use std::sync::OnceLock;

const P1: char = '\u{1}';
const P2: char = '\u{2}';
const P3: char = '\u{3}';

/// Numbering of footnote references, shared by a whole document like `opts.notes`.
#[derive(Default)]
pub struct Notes(pub HashMap<String, usize>);

/// The triggers, longest opener first (a stable sort, like the JavaScript's).
fn order() -> &'static Vec<(Vec<char>, Vec<char>, &'static str, &'static str)> {
    static ORDER: OnceLock<Vec<(Vec<char>, Vec<char>, &'static str, &'static str)>> = OnceLock::new();
    ORDER.get_or_init(|| {
        let mut v: Vec<_> = TRIGGERS.iter().map(|t| (t.0.chars().collect::<Vec<_>>(), t.1.chars().collect::<Vec<_>>(), t.2, t.3)).collect();
        v.sort_by(|a, b| b.0.len().cmp(&a.0.len()));
        v
    })
}

/// Colors by key, longest key first (GL before G).
fn color_keys() -> &'static Vec<(Vec<char>, &'static str)> {
    static KEYS: OnceLock<Vec<(Vec<char>, &'static str)>> = OnceLock::new();
    KEYS.get_or_init(|| {
        let mut v: Vec<_> = HL_COLORS.iter().map(|c| (c.0.chars().collect::<Vec<_>>(), c.1)).collect();
        v.sort_by(|a, b| b.0.len().cmp(&a.0.len()));
        v
    })
}

struct Inline<'a> {
    store: Vec<String>,
    notes: &'a mut Notes,
}

pub fn inline(text: &str, notes: &mut Notes) -> Option<String> {
    let mut st = Inline { store: Vec::new(), notes };
    st.run(text)
}

impl<'a> Inline<'a> {
    fn stash(&mut self, html: String) -> String {
        self.store.push(html);
        format!("{}{}{}", P1, self.store.len() - 1, P1)
    }

    fn run(&mut self, text: &str) -> Option<String> {
        let mut s: Vec<char> = text.chars().collect();
        // ``` fences are taken literally (up to the closing ```, or the end if it never comes)
        s = self.fences(&s);
        // not ported yet: tables written as @@table=[...] and Skills (@@name="...")
        if index_of(&s, &['@', '@'], 0).is_some() {
            return None;
        }
        // `code` is taken literally
        s = self.code(&s);
        // not ported yet: {{templates}} and {{live values}}
        if index_of(&s, &['{', '{'], 0).is_some() {
            return None;
        }
        s = self.escaped_dollar(&s);
        // not ported yet: math ($x^2$ and $$...$$ are drawn by KaTeX in the JavaScript)
        if s.contains(&'$') {
            return None;
        }
        s = self.backslash(&s);
        // not ported yet: [[links]] (they look up titles), pictures and files inside the text, [words]{color=...}
        if index_of(&s, &['[', '['], 0).is_some() || index_of(&s, &['(', 'd', 'a', 't', 'a', ':'], 0).is_some() || index_of(&s, &[']', '{'], 0).is_some() {
            return None;
        }
        s = self.footnote_refs(&s);
        s = self.links(&s);
        let t = self.triggers(&s);
        Some(self.render(&t))
    }

    fn fences(&mut self, s: &[char]) -> Vec<char> {
        let mut out = Vec::with_capacity(s.len());
        let mut i = 0;
        while i < s.len() {
            if starts_with_at(s, i, "```") {
                let end = match index_of(s, &['`', '`', '`'], i + 3) {
                    Some(j) => j + 3,
                    None => s.len(),
                };
                let h = esc(&collect(&s[i..end]));
                out.extend(self.stash(h).chars());
                i = end;
            } else {
                out.push(s[i]);
                i += 1;
            }
        }
        out
    }

    fn code(&mut self, s: &[char]) -> Vec<char> {
        let mut out = Vec::with_capacity(s.len());
        let mut i = 0;
        while i < s.len() {
            if s[i] == '`' {
                let mut q = i + 1;
                while q < s.len() && s[q] != '`' && s[q] != '\n' {
                    q += 1;
                }
                if q > i + 1 && q < s.len() && s[q] == '`' {
                    let h = format!("<code>{}</code>", esc(&collect(&s[i + 1..q])));
                    out.extend(self.stash(h).chars());
                    i = q + 1;
                    continue;
                }
            }
            out.push(s[i]);
            i += 1;
        }
        out
    }

    fn escaped_dollar(&mut self, s: &[char]) -> Vec<char> {
        let mut out = Vec::with_capacity(s.len());
        let mut i = 0;
        while i < s.len() {
            if s[i] == '\\' && i + 1 < s.len() && s[i + 1] == '$' {
                out.extend(self.stash("<span class=\"kd-esc\">$</span>".to_string()).chars());
                i += 2;
            } else {
                out.push(s[i]);
                i += 1;
            }
        }
        out
    }

    // a backslash keeps the next symbol as itself; letters, digits and spaces are never touched
    fn backslash(&mut self, s: &[char]) -> Vec<char> {
        let mut out = Vec::with_capacity(s.len());
        let mut i = 0;
        while i < s.len() {
            if s[i] == '\\' && i + 1 < s.len() && !s[i + 1].is_ascii_alphanumeric() && !is_space(s[i + 1]) {
                let h = format!("<span class=\"kd-esc\">{}</span>", esc(&s[i + 1].to_string()));
                out.extend(self.stash(h).chars());
                i += 2;
            } else {
                out.push(s[i]);
                i += 1;
            }
        }
        out
    }

    fn footnote_refs(&mut self, s: &[char]) -> Vec<char> {
        let mut out = Vec::with_capacity(s.len());
        let mut i = 0;
        while i < s.len() {
            if s[i] == '[' && i + 2 < s.len() && s[i + 1] == '^' && s[i + 2] != ']' && !is_space(s[i + 2]) {
                // label: one char that is not ] or a space, then anything up to the first ]
                let mut q = i + 3;
                while q < s.len() && s[q] != ']' {
                    q += 1;
                }
                if q < s.len() {
                    let label = collect(&s[i + 2..q]);
                    let key = slug(&label);
                    let n = self.notes.0.entry(key.clone()).or_insert(0);
                    *n += 1;
                    let h = format!("<a class=\"kd-footnote-ref\" id=\"fnref-{}-{}\" href=\"#fn-{}\" spellcheck=\"false\">{}</a>", key, n, key, esc(&label));
                    out.extend(self.stash(h).chars());
                    i = q + 1;
                    continue;
                }
            }
            out.push(s[i]);
            i += 1;
        }
        out
    }

    // [words](https://..), [words](mailto:..), [words](#place)
    fn links(&mut self, s: &[char]) -> Vec<char> {
        let mut out = Vec::with_capacity(s.len());
        let mut i = 0;
        while i < s.len() {
            if s[i] == '[' {
                let mut q = i + 1;
                while q < s.len() && s[q] != ']' {
                    q += 1;
                }
                if q > i + 1 && q + 1 < s.len() && s[q] == ']' && s[q + 1] == '(' {
                    let u0 = q + 2;
                    let scheme = if starts_with_at(s, u0, "https://") {
                        8
                    } else if starts_with_at(s, u0, "http://") {
                        7
                    } else if starts_with_at(s, u0, "mailto:") {
                        7
                    } else if starts_with_at(s, u0, "#") {
                        1
                    } else {
                        0
                    };
                    if scheme > 0 {
                        let mut e = u0 + scheme;
                        while e < s.len() && s[e] != ')' && !is_space(s[e]) {
                            e += 1;
                        }
                        if e > u0 + scheme && e < s.len() && s[e] == ')' {
                            let h = format!("<a href=\"{}\" target=\"_blank\" rel=\"noopener\">{}</a>", esc(&collect(&s[u0..e])), esc(&collect(&s[i + 1..q])));
                            out.extend(self.stash(h).chars());
                            i = e + 1;
                            continue;
                        }
                    }
                }
            }
            out.push(s[i]);
            i += 1;
        }
        out
    }

    /// Keydown triggers: the inside of each goes through the triggers too, so a highlight can hold bold or a chip.
    fn triggers(&mut self, input: &[char]) -> Vec<char> {
        let mut s = self.unique_styles(input);
        s = self.highlights(&s);
        s = self.annotate_names(&s);
        s = self.color_ink(&s);
        for (open, close, tag, cls) in order().iter() {
            let mut at = index_of(&s, open, 0);
            while let Some(a) = at {
                let end = match index_of(&s, close, a + open.len()) {
                    Some(e) => e,
                    None => break,
                };
                let body: Vec<char> = trim_chars(&s[a + open.len()..end]).to_vec();
                if body.is_empty() {
                    at = index_of(&s, open, a + open.len());
                    continue;
                }
                let html = if cls.contains("aero-duplex-input-chassis") {
                    // duplex chips: every | starts another box
                    let mut parts: Vec<Vec<char>> = body.split(|c| *c == '|').map(|p| p.to_vec()).collect();
                    if parts.len() < 2 {
                        parts.push(Vec::new());
                    }
                    let n = parts.len();
                    let mut h = format!("<span class=\"{}\" spellcheck=\"false\">", cls);
                    for (i, p) in parts.iter().enumerate() {
                        let inner = self.triggers(trim_chars(p));
                        let inner = if inner.is_empty() { "\u{200B}".to_string() } else { collect(&inner) };
                        h.push_str(&format!("<span class=\"{}\">{}{}{}</span>", if i < n - 1 { "input-left" } else { "input-right" }, P2, inner, P3));
                    }
                    h.push_str("</span>");
                    h
                } else {
                    let inner = collect(&self.triggers(&body));
                    if cls.is_empty() {
                        format!("<{}>{}{}{}</{}>", tag, P2, inner, P3, tag)
                    } else {
                        format!("<{} class=\"{}\" spellcheck=\"false\">{}{}{}</{}>", tag, cls, P2, inner, P3, tag)
                    }
                };
                let ph = self.stash(html);
                let mut ns: Vec<char> = s[..a].to_vec();
                ns.extend(ph.chars());
                ns.extend_from_slice(&s[end + close.len()..]);
                s = ns;
                at = index_of(&s, open, 0);
            }
        }
        s
    }

    // @family-N@text@ (N is the colorway, 1 to 5)
    fn unique_styles(&mut self, s: &[char]) -> Vec<char> {
        let mut out = Vec::with_capacity(s.len());
        let mut i = 0;
        while i < s.len() {
            if s[i] == '@' {
                let mut q = i + 1;
                while q < s.len() && (s[q].is_ascii_lowercase() || s[q].is_ascii_digit()) {
                    q += 1;
                }
                if q > i + 1 {
                    let fam = collect(&s[i + 1..q]);
                    let mut n: Option<char> = None;
                    let mut r = q;
                    if r + 1 < s.len() && s[r] == '-' && ('1'..='5').contains(&s[r + 1]) {
                        n = Some(s[r + 1]);
                        r += 2;
                    }
                    if r < s.len() && s[r] == '@' {
                        // body: at least one char that is not @ or a newline, up to the next @
                        let mut b = r + 1;
                        while b < s.len() && s[b] != '@' && s[b] != '\n' {
                            b += 1;
                        }
                        if b > r + 1 && b < s.len() && s[b] == '@' {
                            if US_FAMS.contains(&fam.as_str()) {
                                let body = trim_chars(&s[r + 1..b]).to_vec();
                                let inner = collect(&self.triggers(&body));
                                let h = format!("<span class=\"us-chip us-{} us-{}-{}\" spellcheck=\"false\">{}{}{}</span>", fam, fam, n.unwrap_or('1'), P2, inner, P3);
                                out.extend(self.stash(h).chars());
                            } else {
                                out.extend_from_slice(&s[i..b + 1]);
                            }
                            i = b + 1;
                            continue;
                        }
                    }
                }
            }
            out.push(s[i]);
            i += 1;
        }
        out
    }

    // the color key at s[at..] followed by `next` (GL before G), and where it ends
    fn color_at(s: &[char], at: usize) -> Option<(&'static str, usize)> {
        for (key, name) in color_keys().iter() {
            if at + key.len() <= s.len() && s[at..at + key.len()] == key[..] {
                return Some((name, at + key.len()));
            }
        }
        None
    }

    // #R#text## #R#text#_ ... : a highlight, each with its NEAREST ending
    fn highlights(&mut self, s: &[char]) -> Vec<char> {
        let mut out = Vec::with_capacity(s.len());
        let mut i = 0;
        while i < s.len() {
            if s[i] == '#' {
                if let Some((color, k)) = Self::color_at(s, i + 1) {
                    if k < s.len() && s[k] == '#' {
                        let mut b = k + 1;
                        while b < s.len() && s[b] != '#' {
                            b += 1;
                        }
                        if b > k + 1 && b + 1 < s.len() && s[b] == '#' && "#_~=]-".contains(s[b + 1]) {
                            let end = format!("#{}", s[b + 1]);
                            let style = HL_STYLES.iter().find(|x| x.0 == end).map(|x| x.1).unwrap_or("");
                            let body = trim_chars(&s[k + 1..b]).to_vec();
                            let inner = collect(&self.triggers(&body));
                            let h = format!("<mark class=\"an-hl an-hl-{}{}\" spellcheck=\"false\">{}{}{}</mark>", color, style, P2, inner, P3);
                            out.extend(self.stash(h).chars());
                            i = b + 2;
                            continue;
                        }
                    }
                }
            }
            out.push(s[i]);
            i += 1;
        }
        out
    }

    // #R.halo(text): every other Annotate style by name
    fn annotate_names(&mut self, s: &[char]) -> Vec<char> {
        let mut out = Vec::with_capacity(s.len());
        let mut i = 0;
        while i < s.len() {
            if s[i] == '#' {
                if let Some((color, k)) = Self::color_at(s, i + 1) {
                    if k < s.len() && s[k] == '.' {
                        let mut n = k + 1;
                        while n < s.len() && s[n].is_ascii_lowercase() {
                            n += 1;
                        }
                        if n > k + 1 && n < s.len() && s[n] == '(' {
                            let mut b = n + 1;
                            while b < s.len() && s[b] != '(' && s[b] != ')' {
                                b += 1;
                            }
                            if b > n + 1 && b < s.len() && s[b] == ')' {
                                let name = collect(&s[k + 1..n]);
                                if let Some(st) = AN_STYLES.iter().find(|x| x.0 == name) {
                                    let body = trim_chars(&s[n + 1..b]).to_vec();
                                    let inner = collect(&self.triggers(&body));
                                    let h = format!("<mark class=\"an-hl an-hl-{}{}\" spellcheck=\"false\">{}{}{}</mark>", color, st.1, P2, inner, P3);
                                    out.extend(self.stash(h).chars());
                                } else {
                                    out.extend_from_slice(&s[i..b + 1]);
                                }
                                i = b + 1;
                                continue;
                            }
                        }
                    }
                }
            }
            out.push(s[i]);
            i += 1;
        }
        out
    }

    // #R(text): Color Ink
    fn color_ink(&mut self, s: &[char]) -> Vec<char> {
        let mut out = Vec::with_capacity(s.len());
        let mut i = 0;
        while i < s.len() {
            if s[i] == '#' {
                if let Some((color, k)) = Self::color_at(s, i + 1) {
                    if k < s.len() && s[k] == '(' {
                        let mut b = k + 1;
                        while b < s.len() && s[b] != '(' && s[b] != ')' {
                            b += 1;
                        }
                        if b > k + 1 && b < s.len() && s[b] == ')' {
                            let body = trim_chars(&s[k + 1..b]).to_vec();
                            let inner = collect(&self.triggers(&body));
                            let h = format!("<mark class=\"an-hl an-hl-{} an-s-ink\" spellcheck=\"false\">{}{}{}</mark>", color, P2, inner, P3);
                            out.extend(self.stash(h).chars());
                            i = b + 1;
                            continue;
                        }
                    }
                }
            }
            out.push(s[i]);
            i += 1;
        }
        out
    }

    // escape what is left as plain text, then put the stashed pieces back (nested ones too)
    fn render(&self, raw: &[char]) -> String {
        let escaped: Vec<char> = esc(&collect(raw)).chars().collect();
        let mut out = String::with_capacity(escaped.len() + 16);
        let mut i = 0;
        while i < escaped.len() {
            if escaped[i] == P1 {
                let mut j = i + 1;
                while j < escaped.len() && escaped[j].is_ascii_digit() {
                    j += 1;
                }
                if j > i + 1 && j < escaped.len() && escaped[j] == P1 {
                    let idx: usize = collect(&escaped[i + 1..j]).parse().unwrap_or(usize::MAX);
                    if let Some(entry) = self.store.get(idx) {
                        out.push_str(&self.fill(entry));
                    }
                    i = j + 1;
                    continue;
                }
            }
            out.push(escaped[i]);
            i += 1;
        }
        out
    }

    // a stored piece: each \u2 ... \u3 inside it is drawn as text again
    fn fill(&self, entry: &str) -> String {
        let chars: Vec<char> = entry.chars().collect();
        let mut out = String::with_capacity(entry.len());
        let mut i = 0;
        while i < chars.len() {
            if chars[i] == P2 {
                if let Some(e) = chars[i + 1..].iter().position(|c| *c == P3) {
                    let inner = &chars[i + 1..i + 1 + e];
                    out.push_str(&self.render(inner));
                    i = i + 1 + e + 1;
                    continue;
                }
            }
            out.push(chars[i]);
            i += 1;
        }
        out
    }
}
