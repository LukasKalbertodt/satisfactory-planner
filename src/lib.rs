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
    let graph = input.state.graph;
    let digest_graph = digest::Graph::from_state(graph);
    let encoded = bitcode::encode(&digest_graph);
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
    let digest_graph = bitcode::decode::<digest::Graph>(&binary).expect("failed to decode");
    let graph = digest_graph.into_state();
    let state = state::Input {
        state: state::State { graph },
        version: 0, // TODO
    };
    let json = serde_json::to_string(&state).expect("Failed to serialize");

    json
}

fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
