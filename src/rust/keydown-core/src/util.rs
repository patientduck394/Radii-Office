//! Small helpers that behave exactly like the JavaScript ones in keydown-doc.js.

/// JavaScript's `\s` (and what `String.prototype.trim` removes).
pub fn is_space(c: char) -> bool {
    matches!(c, ' ' | '\t' | '\n' | '\u{0b}' | '\u{0c}' | '\r' | '\u{a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}')
}

pub fn trim(s: &str) -> &str {
    s.trim_matches(is_space)
}

pub fn trim_chars(s: &[char]) -> &[char] {
    let mut a = 0;
    let mut b = s.len();
    while a < b && is_space(s[a]) {
        a += 1;
    }
    while b > a && is_space(s[b - 1]) {
        b -= 1;
    }
    &s[a..b]
}

/// `esc` in keydown-doc.js: & < > " only.
pub fn esc(s: &str) -> String {
    let mut o = String::with_capacity(s.len() + 8);
    for c in s.chars() {
        match c {
            '&' => o.push_str("&amp;"),
            '<' => o.push_str("&lt;"),
            '>' => o.push_str("&gt;"),
            '"' => o.push_str("&quot;"),
            _ => o.push(c),
        }
    }
    o
}

/// `slug` in keydown-doc.js.
pub fn slug(s: &str) -> String {
    let lower = s.to_lowercase();
    let t = trim(&lower);
    let mut out = String::new();
    let mut pending = false;
    for c in t.chars() {
        if c.is_ascii_lowercase() || c.is_ascii_digit() {
            if pending && !out.is_empty() {
                out.push('-');
            }
            pending = false;
            out.push(c);
        } else {
            pending = true;
        }
    }
    // (a leading or trailing run of symbols leaves no dash, like the .replace(/^-+|-+$/g, '') in the JavaScript)
    if out.is_empty() {
        "note".to_string()
    } else {
        out
    }
}

pub fn index_of(hay: &[char], needle: &[char], from: usize) -> Option<usize> {
    if needle.is_empty() {
        return if from <= hay.len() { Some(from) } else { None };
    }
    if hay.len() < needle.len() || from > hay.len() - needle.len() {
        return None;
    }
    let last = hay.len() - needle.len();
    let mut i = from;
    while i <= last {
        if hay[i] == needle[0] && hay[i..i + needle.len()] == *needle {
            return Some(i);
        }
        i += 1;
    }
    None
}

pub fn starts_with_at(hay: &[char], at: usize, needle: &str) -> bool {
    let mut i = at;
    for c in needle.chars() {
        if i >= hay.len() || hay[i] != c {
            return false;
        }
        i += 1;
    }
    true
}

pub fn collect(s: &[char]) -> String {
    s.iter().collect()
}
