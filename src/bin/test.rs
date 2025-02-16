

fn main() {
    let out = satisfactory_planner::compress_state(INPUT);
    println!("{} {}", out.len(), out);
    satisfactory_planner::decompress_state(&out);
}


const INPUT: &str = r#"{"state":{"graph":{"nodes":[{"type":"recipe","recipe":"aluminum-ingot","pos":{"x":950,"y":225},"buildingsCount":4,"overclock":1},{"type":"recipe","recipe":"aluminum-scrap","pos":{"x":475,"y":225},"buildingsCount":1,"overclock":1},{"type":"recipe","recipe":"alumina-solution","pos":{"x":100,"y":225},"buildingsCount":2,"overclock":1},{"type":"merger","pos":{"x":-25,"y":300}},{"type":"source","pos":{"x":-200,"y":300},"item":"water","rate":240},{"type":"source","pos":{"x":-75,"y":450},"item":"raw-quartz","rate":240},{"type":"recipe","recipe":"silica","pos":{"x":100,"y":400},"buildingsCount":6,"overclock":1},{"type":"merger","pos":{"x":475,"y":375}},{"type":"source","pos":{"x":250,"y":150},"item":"coal","rate":60},{"type":"merger","pos":{"x":750,"y":375}}],"edges":[{"source":{"node":1,"handle":5},"target":{"node":3,"handle":2}},{"source":{"node":1,"handle":4},"target":{"node":0,"handle":0}},{"source":{"node":2,"handle":4},"target":{"node":1,"handle":0}},{"source":{"node":2,"handle":5},"target":{"node":7,"handle":1}},{"source":{"node":3,"handle":3},"target":{"node":2,"handle":1}},{"source":{"node":4,"handle":0},"target":{"node":3,"handle":1}},{"source":{"node":5,"handle":0},"target":{"node":6,"handle":0}},{"source":{"node":6,"handle":4},"target":{"node":7,"handle":2}},{"source":{"node":7,"handle":3},"target":{"node":9,"handle":1}},{"source":{"node":8,"handle":0},"target":{"node":1,"handle":1}},{"source":{"node":9,"handle":3},"target":{"node":0,"handle":1}}]}},"version":0}"#;
// const INPUT: &str = r#"{"state":{"graph":{"nodes":[{"type":"recipe","recipe":"iron-ingot","pos":{"x":650,"y":375},"buildingsCount":1,"overclock":1}],"edges":[]}},"version":0}"#;
