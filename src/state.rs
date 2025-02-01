use std::num::NonZeroU16;

use serde::{Deserialize, Serialize};

use crate::gamedata::{ItemKind, RecipeKind};


#[derive(Deserialize, Serialize)]
pub struct Input {
    pub state: State,
    #[allow(dead_code)]
    pub version: u32,
}

#[derive(Deserialize, Serialize)]
pub struct State {
    pub graph: Graph,
}

#[derive(Deserialize, Serialize)]
pub struct Graph {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

pub type NodeId = u16;
pub type HandleId = u8;

#[derive(Deserialize, Serialize)]
pub struct Edge {
    pub source: GraphHandle,
    pub target: GraphHandle,
}

#[derive(Deserialize, Serialize)]
pub struct GraphHandle {
    pub node: NodeId,
    pub handle: HandleId,
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Node {
    #[serde(rename_all = "camelCase")]
    Recipe {
        pos: Pos,
        recipe: RecipeKind,
        buildings_count: NonZeroU16,
        overclock: f32,
    },
    Merger {
        pos: Pos,
    },
    Splitter {
        pos: Pos,
    },
    Source {
        pos: Pos,
        item: ItemKind,
        rate: u32,
    },
}

#[derive(Deserialize, Serialize)]
pub struct Pos {
    pub x: i32,
    pub y: i32,
}
