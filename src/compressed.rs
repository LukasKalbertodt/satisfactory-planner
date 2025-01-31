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
            original::Node::Recipe { pos, recipe, buildings_count, overclock } => Node {
                pos: Pos::from(pos),
                data: NodeData::Recipe {
                    recipe: recipe as u16,
                    buildings_count,
                    overclock: Overclock::from(overclock),
                },
            },
            original::Node::Merger { pos } => Node {
                pos: Pos::from(pos),
                data: NodeData::Merger {}
            },
            original::Node::Splitter { pos } => Node {
                pos: Pos::from(pos),
                data: NodeData::Splitter {}
            },
            original::Node::Source { pos, item, rate } => Node {
                pos: Pos::from(pos),
                data: NodeData::Source {
                    item: item as u8,
                    rate,
                },
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
pub struct Node {
    pos: Pos,
    data: NodeData,
}

#[derive(Encode, Decode)]
pub enum NodeData {
    Recipe {
        recipe: u16,
        buildings_count: NonZeroU16,
        overclock: Overclock,
    },
    Merger { },
    Splitter { },
    Source {
        item: u8,
        rate: u32,
    },
}

#[derive(Encode, Decode)]
pub enum Overclock {
    Pe50,
    Pe100,
    Pe150,
    Pe200,
    Pe250,
    Custom(f32),
}

impl Overclock {
    fn from(orig: f32) -> Self {
        match orig {
            0.5 => Self::Pe50,
            1.0 => Self::Pe100,
            1.5 => Self::Pe150,
            2.0 => Self::Pe200,
            2.5 => Self::Pe250,
            _ => Self::Custom(orig),
        }
    }
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
