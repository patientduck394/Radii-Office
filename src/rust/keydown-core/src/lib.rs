//! keydown-core: Keydown's text engine in Rust.
//! `text_to_html` and `inline_html` return None for anything not ported yet; the JavaScript engine handles those.
pub mod blocks;
pub mod inline;
pub mod tables;
pub mod util;

pub use inline::Notes;

pub fn text_to_html(src: &str) -> Option<String> {
    blocks::text_to_html(src, &mut Notes::default())
}

pub fn inline_html(src: &str) -> Option<String> {
    inline::inline(src, &mut Notes::default())
}

/* ---------- the WebAssembly door: plain exports, no glue generator needed ----------
   JavaScript allocates a buffer with kd_alloc, copies the UTF-8 text in, calls kd_text_to_html / kd_inline_html,
   gets the length back (u32::MAX means "not ported yet, use the JavaScript engine") and reads the result at kd_result_ptr. */
#[cfg(target_arch = "wasm32")]
mod ffi {
    use std::cell::RefCell;
    thread_local! { static RESULT: RefCell<Vec<u8>> = RefCell::new(Vec::new()); }

    #[no_mangle]
    pub extern "C" fn kd_alloc(len: usize) -> *mut u8 {
        let mut v: Vec<u8> = Vec::with_capacity(len.max(1));
        let p = v.as_mut_ptr();
        std::mem::forget(v);
        p
    }
    #[no_mangle]
    pub unsafe extern "C" fn kd_free(ptr: *mut u8, cap: usize) {
        drop(Vec::from_raw_parts(ptr, 0, cap.max(1)));
    }
    fn run(ptr: *const u8, len: usize, f: fn(&str) -> Option<String>) -> u32 {
        let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
        let text = match std::str::from_utf8(bytes) {
            Ok(t) => t,
            Err(_) => return u32::MAX,
        };
        match f(text) {
            Some(h) => RESULT.with(|r| {
                *r.borrow_mut() = h.into_bytes();
                r.borrow().len() as u32
            }),
            None => u32::MAX,
        }
    }
    #[no_mangle]
    pub extern "C" fn kd_text_to_html(ptr: *const u8, len: usize) -> u32 {
        run(ptr, len, super::text_to_html)
    }
    #[no_mangle]
    pub extern "C" fn kd_inline_html(ptr: *const u8, len: usize) -> u32 {
        run(ptr, len, super::inline_html)
    }
    #[no_mangle]
    pub extern "C" fn kd_result_ptr() -> *const u8 {
        RESULT.with(|r| r.borrow().as_ptr())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bold_and_chips() {
        assert_eq!(inline_html("**hi**").unwrap(), "<strong>hi</strong>");
        let h = inline_html("++C~Saved++").unwrap();
        assert!(h.contains("gel-aerotoast-chip gel-aero-cyan") && h.contains("Saved"));
    }

    #[test]
    fn blocks() {
        assert_eq!(text_to_html("# Title").unwrap(), "<h1 class=\"header-1\">Title</h1>");
        assert_eq!(text_to_html("* a\n* b").unwrap(), "<ul class=\"bulleted-list\"><li>a</li><li>b</li></ul>");
        assert_eq!(text_to_html("|indented").unwrap(), "<div style=\"text-indent: 2.5rem;\">indented</div>");
        assert_eq!(text_to_html("").unwrap(), "<div><br></div>");
    }

    #[test]
    fn not_ported_yet_goes_back_to_javascript() {
        assert!(inline_html("math $x^2$").is_none());
        assert!(inline_html("a {{template}}").is_none());
        assert!(text_to_html("::glass{Hi}").is_none());
        assert!(text_to_html("@@dice=\"x\"").is_none());
    }

    #[test]
    fn escapes_and_code() {
        assert_eq!(inline_html("a \\*b\\*").unwrap(), "a <span class=\"kd-esc\">*</span>b<span class=\"kd-esc\">*</span>");
        assert_eq!(inline_html("`**x**`").unwrap(), "<code>**x**</code>");
    }
}
