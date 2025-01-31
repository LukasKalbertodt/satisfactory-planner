use std::{collections::BTreeMap, num::NonZeroU16};

use serde::Deserialize;

use crate::gamedata::{ItemKind, RecipeKind};


#[derive(Deserialize)]
pub struct Input {
    pub state: State,
    #[allow(dead_code)]
    pub version: u32,
}

#[derive(Deserialize)]
pub struct State {
    pub graph: Graph,
}

#[derive(Deserialize)]
pub struct Graph {
    pub nodes: BTreeMap<NodeId, Node>,
    pub edges: Vec<Edge>,
}

pub type NodeId = u16;
pub type HandleId = u8;

#[derive(Deserialize)]
pub struct Edge {
    pub source: GraphHandle,
    pub target: GraphHandle,
}

#[derive(Deserialize)]
pub struct GraphHandle {
    pub node: NodeId,
    pub handle: HandleId,
}

#[derive(Deserialize)]
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

#[derive(Deserialize)]
pub struct Pos {
    pub x: i32,
    pub y: i32,
}
