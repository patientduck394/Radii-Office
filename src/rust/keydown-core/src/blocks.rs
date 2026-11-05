//! `textToHtml()` from writeout/keydown-doc.js: Keydown text (many lines) to editor HTML.
//! Lines it does not handle yet (@@ skills and tables, {{templates}}, pictures, $$ math and ::blocks) make it return None,
//! and the caller then draws the whole text with the JavaScript engine.

use crate::inline::{inline, Notes};
use crate::util::{esc, is_space, slug, trim};

fn skip_space(s: &[char], mut i: usize) -> usize {
    while i < s.len() && is_space(s[i]) {
        i += 1;
    }
    i
}

/// `^(#{1,4})\s+(\S.*)$`
fn heading(t: &[char]) -> Option<(usize, String)> {
    let mut n = 0;
    while n < t.len() && t[n] == '#' {
        n += 1;
    }
    if n == 0 || n > 4 || n >= t.len() || !is_space(t[n]) {
        return None;
    }
    let r = skip_space(t, n);
    if r >= t.len() {
        return None;
    }
    Some((n, t[r..].iter().collect()))
}

/// `^X\s+(\S.*)$` for X = * or >
fn marker(t: &[char], m: char) -> Option<String> {
    if t.len() < 3 || t[0] != m || !is_space(t[1]) {
        return None;
    }
    let r = skip_space(t, 1);
    if r >= t.len() {
        return None;
    }
    Some(t[r..].iter().collect())
}

/// `^\[\^([^\]\s][^\]]*)\]:\s*(.*)$`
fn footnote_def(t: &[char]) -> Option<(String, String)> {
    if t.len() < 5 || t[0] != '[' || t[1] != '^' || t[2] == ']' || is_space(t[2]) {
        return None;
    }
    let mut q = 3;
    while q < t.len() && t[q] != ']' {
        q += 1;
    }
    if q + 1 >= t.len() || t[q] != ']' || t[q + 1] != ':' {
        return None;
    }
    let label: String = t[2..q].iter().collect();
    let r = skip_space(t, q + 2);
    Some((label, t[r..].iter().collect()))
}

/// `^\|.*\|(\{[a-z]+\})?$` (a pipe table row)
fn is_table_row(t: &str) -> bool {
    let c: Vec<char> = t.chars().collect();
    if c.len() < 2 || c[0] != '|' {
        return false;
    }
    if c[c.len() - 1] == '|' {
        return true;
    }
    // ...|{style}
    if c[c.len() - 1] == '}' {
        if let Some(open) = c.iter().rposition(|x| *x == '{') {
            let name = &c[open + 1..c.len() - 1];
            return open >= 2 && c[open - 1] == '|' && !name.is_empty() && name.iter().all(|x| x.is_ascii_lowercase());
        }
    }
    false
}

/// `^\|(\s*:?-{3,}:?\s*\|)+(\{([a-z]+)\})?$`: Some(style) when the line is a separator
fn table_sep(t: &str) -> Option<Option<String>> {
    let c: Vec<char> = t.chars().collect();
    if c.is_empty() || c[0] != '|' {
        return None;
    }
    let mut i = 1;
    let mut cells = 0;
    loop {
        let mut j = skip_space(&c, i);
        if j < c.len() && c[j] == ':' {
            j += 1;
        }
        let d0 = j;
        while j < c.len() && c[j] == '-' {
            j += 1;
        }
        if j - d0 < 3 {
            break;
        }
        if j < c.len() && c[j] == ':' {
            j += 1;
        }
        j = skip_space(&c, j);
        if j < c.len() && c[j] == '|' {
            cells += 1;
            i = j + 1;
        } else {
            break;
        }
    }
    if cells == 0 {
        return None;
    }
    if i == c.len() {
        return Some(None);
    }
    if c[i] == '{' && c[c.len() - 1] == '}' {
        let name = &c[i + 1..c.len() - 1];
        if !name.is_empty() && name.iter().all(|x| x.is_ascii_lowercase()) {
            return Some(Some(name.iter().collect()));
        }
    }
    None
}

fn cells(line: &str) -> Vec<String> {
    let mut c: Vec<char> = line.chars().collect();
    if c.first() == Some(&'|') {
        c.remove(0);
    }
    // a final | (not an escaped \|) ends the last cell
    if c.last() == Some(&'|') && (c.len() == 1 || c[c.len() - 2] != '\\') {
        c.pop();
    }
    let mut out = Vec::new();
    let mut cur = String::new();
    let mut prev: Option<char> = None;
    for ch in c {
        if ch == '|' && prev != Some('\\') {
            out.push(cur.clone());
            cur.clear();
        } else {
            cur.push(ch);
        }
        prev = Some(ch);
    }
    out.push(cur);
    out.iter().map(|x| trim(x).replace("\\|", "|")).collect()
}

fn table_html(block: &[String], notes: &mut Notes) -> Option<String> {
    let sep = block.iter().position(|l| table_sep(l).is_some())?;
    if sep != 0 && sep != 1 {
        return None;
    }
    let style = table_sep(&block[sep]).flatten().unwrap_or_else(|| "blue".to_string());
    let row = |line: &str, tag: &str, notes: &mut Notes| -> Option<String> {
        let mut h = String::from("<tr>");
        for c in cells(line) {
            h.push_str(&format!("<{}>{}</{}>", tag, if c.is_empty() { "<br>".to_string() } else { inline(&c, notes)? }, tag));
        }
        h.push_str("</tr>");
        Some(h)
    };
    let mut html = format!("<table class=\"rt-table rt-{}\">", esc(&style));
    if sep == 1 {
        html.push_str(&format!("<thead>{}</thead>", row(&block[0], "th", notes)?));
    }
    html.push_str("<tbody>");
    for (k, l) in block.iter().enumerate() {
        if k == sep || (sep == 1 && k == 0) {
            continue;
        }
        html.push_str(&row(l, "td", notes)?);
    }
    html.push_str("</tbody></table>");
    Some(html)
}

fn num(n: usize) -> String {
    let v = n as f64 * 2.5;
    format!("{}", v)
}

pub fn text_to_html(src: &str, notes: &mut Notes) -> Option<String> {
    let cleaned = src.replace('\r', "");
    let lines: Vec<&str> = cleaned.split('\n').collect();
    let mut out: Vec<String> = Vec::new();
    let mut list: Option<Vec<String>> = None;
    macro_rules! end_list {
        () => {
            if let Some(items) = list.take() {
                out.push(format!("<ul class=\"bulleted-list\">{}</ul>", items.concat()));
            }
        };
    }
    let mut i = 0;
    while i < lines.len() {
        let t0 = trim(lines[i]);
        // a pipe table is checked first
        if is_table_row(t0) {
            let mut block: Vec<String> = Vec::new();
            let mut j = i;
            while j < lines.len() && is_table_row(trim(lines[j])) {
                block.push(trim(lines[j]).to_string());
                j += 1;
            }
            if let Some(html) = table_html(&block, notes) {
                end_list!();
                out.push(html);
                i = j;
                continue;
            }
        }
        // each | (or old-style tab) at the start of a line is one indent step
        let tc: Vec<char> = t0.chars().collect();
        let lead = tc.iter().take_while(|c| **c == '\t' || **c == '|').count();
        let tabs = lead.min(8);
        let mut t: Vec<char> = if lead > 0 { trim(&tc[lead..].iter().collect::<String>()).chars().collect() } else { tc };
        // {align=center} at the start of a line
        let mut align = "";
        let ts: String = t.iter().collect();
        for a in ["left", "center", "right", "justify"] {
            let tag = format!("{{align={}}}", a);
            if ts.starts_with(&tag) {
                align = a;
                let rest: Vec<char> = ts[tag.len()..].chars().collect();
                let r = skip_space(&rest, 0);
                t = rest[r..].to_vec();
                break;
            }
        }
        let tstr: String = t.iter().collect();
        let ind = |h: String| -> String {
            let mut st = String::new();
            if tabs > 0 {
                st.push_str(&format!("text-indent: {}rem;", num(tabs)));
            }
            if !align.is_empty() {
                st.push_str(&format!(" text-align: {};", align));
            }
            let st = st.trim().to_string();
            if st.is_empty() {
                return h;
            }
            // <tag ... becomes <tag style="..." ...
            let tag_end = h[1..].find(|c: char| !(c.is_ascii_alphanumeric() || c == '_')).map(|p| p + 1).unwrap_or(h.len());
            format!("{} style=\"{}\"{}", &h[..tag_end], st, &h[tag_end..])
        };
        // not ported yet: @@ skills and tables
        if tstr.starts_with("@@") {
            return None;
        }
        if tstr.starts_with("```") {
            end_list!();
            let mut body: Vec<&str> = Vec::new();
            i += 1;
            while i < lines.len() && !trim(lines[i]).starts_with("```") {
                body.push(lines[i]);
                i += 1;
            }
            out.push(format!("<pre><code>{}</code></pre>", esc(&body.join("\n"))));
            i += 1;
            continue;
        }
        if let Some(rest) = marker(&t, '*') {
            list.get_or_insert_with(Vec::new).push(format!("<li>{}</li>", inline(&rest, notes)?));
            i += 1;
            continue;
        }
        end_list!();
        if tstr.is_empty() {
            out.push("<div><br></div>".to_string());
            i += 1;
            continue;
        }
        // not ported yet: {{template}} lines, pictures, $$ math and ::blocks
        if tstr.starts_with("{{") || tstr.starts_with("![") || tstr.starts_with("$$") || (tstr.starts_with("::") && tstr.chars().nth(2).map_or(false, |c| c.is_ascii_lowercase())) {
            return None;
        }
        if let Some((n, rest)) = heading(&t) {
            let body = inline(&rest, notes)?;
            out.push(ind(if n == 4 { format!("<h1 class=\"mega-header\">{}</h1>", body) } else { format!("<h{} class=\"header-{}\">{}</h{}>", n, n, body, n) }));
            i += 1;
            continue;
        }
        if let Some(rest) = marker(&t, '>') {
            out.push(ind(format!("<blockquote class=\"blockquote-list\">{}</blockquote>", inline(&rest, notes)?)));
            i += 1;
            continue;
        }
        if let Some((label, rest)) = footnote_def(&t) {
            out.push(format!("<div class=\"kd-footnote-def\" id=\"fn-{}\"><span class=\"kd-footnote-tag\">{}</span> <span class=\"kd-footnote-text\">{}</span></div>", slug(&label), esc(&label), inline(&rest, notes)?));
            i += 1;
            continue;
        }
        out.push(ind(format!("<div>{}</div>", inline(&tstr, notes)?)));
        i += 1;
    }
    end_list!();
    Some(out.concat())
}
