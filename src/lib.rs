use base64::Engine;
use deflate::Compression;

use wasm_bindgen::prelude::*;


#[path ="gamedata/data.rs"]
mod gamedata;
mod original;
mod compressed;


#[wasm_bindgen]
pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}


#[wasm_bindgen]
pub fn compress_state(json: &str) -> String {
    let input = serde_json::from_str::<original::Input>(json).expect("Failed to deserialize");
    let orig_graph = input.state.graph;
    let compressed_graph = compressed::Graph::from(orig_graph);
    let encoded = bitcode::encode(&compressed_graph);
    let compressed = deflate::deflate_bytes_conf(&encoded, Compression::Best);
    let base64 = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&compressed);

    base64
}
