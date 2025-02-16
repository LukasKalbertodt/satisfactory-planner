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

impl Graph {
    pub fn node(&self, id: NodeId) -> &Node {
        &self.nodes[id as usize]
    }
}

pub type NodeId = u16;
pub type HandleId = u8;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Edge {
    pub source: GraphHandle,
    pub target: GraphHandle,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
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

    pub fn is_split_merge(&self) -> bool {
        matches!(self, Self::Splitter { .. } | Self::Merger { .. })
    }
}

#[derive(Copy, Clone, Deserialize, Serialize)]
pub struct Pos {
    pub x: i32,
    pub y: i32,
}
