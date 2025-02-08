use std::num::NonZeroU32;

use serde::{Deserialize, Serialize};

use crate::gamedata::{RecipeKind, SourceItemKind};


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

#[derive(Clone, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Node {
    #[serde(rename_all = "camelCase")]
    Recipe {
        pos: Pos,
        recipe: RecipeKind,
        buildings_count: NonZeroU32,
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
        item: SourceItemKind,
        rate: u32,
    },
}

impl Node {
    pub fn pos(&self) -> &Pos {
        match self {
            Node::Recipe { pos, .. } => pos,
            Node::Merger { pos, .. } => pos,
            Node::Splitter { pos, .. } => pos,
            Node::Source { pos, .. } => pos,
        }
    }
}

#[derive(Copy, Clone, Deserialize, Serialize)]
pub struct Pos {
    pub x: i32,
    pub y: i32,
}
