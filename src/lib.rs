use base64::Engine;

use wasm_bindgen::prelude::*;


#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[cfg(target_arch = "wasm32")]
#[macro_export]
macro_rules! log {
    ($($t:tt)*) => ($crate::log(&format!($($t)*)));
}

#[cfg(not(target_arch = "wasm32"))]
#[macro_export]
macro_rules! log {
    ($($t:tt)*) => (println!($($t)*));
}

mod gamedata;
mod state;
mod digest;


#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn compress_state(json: &str) -> String {
    set_panic_hook();

    let input = serde_json::from_str::<state::Input>(json).expect("Failed to deserialize");
    let new = digest::encode(&input);
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&new)
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn decompress_state(digest: &str) -> String {
    set_panic_hook();

    let binary = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(&digest)
        .expect("invalid base64");
    let state = digest::decode(&binary).expect("invalid digest");
    serde_json::to_string(&state).expect("Failed to serialize")
}

fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
