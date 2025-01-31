use std::{collections::HashMap, num::NonZeroU16};

use bitcode::{Decode, Encode};

use crate::{original::{self, HandleId, NodeId}};


impl Graph {
    pub fn from(orig: original::Graph) -> Self {
        // Remap IDs: this is the only operation that destroys the JSON roundtrip: we don't care
        // about keeping the original IDs as they are not user-visible.
        let orig_id_to_idx: HashMap<NodeId, usize> = orig.nodes.keys().enumerate().map(|(idx, &id)| (id, idx)).collect();

        let map_graph_handle = |gh: original::GraphHandle| {
            GraphHandle {
                node: orig_id_to_idx[&gh.node] as u16,
                handle: gh.handle,
            }
        };
        let edges = orig.edges.into_iter().map(|e| {
            Edge {
                source: map_graph_handle(e.source),
                target: map_graph_handle(e.target),
            }
        }).collect();

        Self {
            nodes: orig.nodes.into_values().map(Node::from).collect(),
            edges,
        }
    }
}

impl Node {
    fn from(orig: original::Node) -> Self {
        match orig {
            original::Node::Recipe { pos, recipe, buildings_count, overclock } => Node::Recipe {
                pos: Pos::from(pos),
                recipe: recipe as u16,
                buildings_count,
                overclock,
            },
            original::Node::Merger { pos } => Node::Merger {
                pos: Pos::from(pos),
            },
            original::Node::Splitter { pos } => Node::Splitter {
                pos: Pos::from(pos),
            },
            original::Node::Source { pos, item, rate } => Node::Source {
                pos: Pos::from(pos),
                item: item as u8,
                rate,
            },
        }
    }
}


#[derive(Encode, Decode)]
pub struct Graph {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

#[derive(Encode, Decode)]
pub struct Edge {
    pub source: GraphHandle,
    pub target: GraphHandle,
}

#[derive(Encode, Decode)]
pub struct GraphHandle {
    pub node: NodeId,
    pub handle: HandleId,
}

#[derive(Encode, Decode)]
pub enum Node {
    Recipe {
        pos: Pos,
        recipe: u16,
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
        item: u8,
        rate: u32,
    },
}

#[derive(Encode, Decode)]
pub struct Pos {
    x: i32,
    y: i32,
}

impl Pos {
    const GRID_SIZE: i32 = 25;
    fn from(orig: original::Pos) -> Self {
        // All positions are multiples of GRID_SIZE, so we can compress them by dividing by it.
        Self {
            x: orig.x / Self::GRID_SIZE,
            y: orig.y / Self::GRID_SIZE,
        }
    }
}
