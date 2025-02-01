use base64::Engine;
use deflate::Compression;

use wasm_bindgen::prelude::*;


#[path ="gamedata/data.rs"]
mod gamedata;
mod state;
mod digest;


#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[macro_export]
macro_rules! log {
    ($($t:tt)*) => ($crate::log(&format!($($t)*)));
}




#[wasm_bindgen]
pub fn compress_state(json: &str) -> String {
    set_panic_hook();

    let input = serde_json::from_str::<state::Input>(json).expect("Failed to deserialize");
    let digest_state = digest::State::from_state(input);
    let encoded = bitcode::encode(&digest_state);
    let compressed = deflate::deflate_bytes_conf(&encoded, Compression::Best);
    let base64 = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&encoded);

    log!("{: >4} ({: >4} compressed)", encoded.len(), compressed.len());
    base64
}

#[wasm_bindgen]
pub fn decompress_state(digest: &str) -> String {
    set_panic_hook();

    let binary = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(&digest)
        .expect("invalid base64");
    let digest_state = bitcode::decode::<digest::State>(&binary).expect("failed to decode");
    let state = digest_state.into_state();
    let json = serde_json::to_string(&state).expect("Failed to serialize");

    json
}

fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
