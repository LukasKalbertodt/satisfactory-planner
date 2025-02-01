use std::{collections::HashMap, num::NonZeroU16};

use bitcode::{Decode, Encode};

use crate::{gamedata::{ItemKind, RecipeKind}, state::{self, HandleId, NodeId}};


impl State {
    pub fn from_state(orig: state::Input) -> Self {
        Self {
            version: orig.version as u8, // TODO
            graph: Graph::from_state(orig.state.graph),
        }
    }

    pub fn into_state(self) -> state::Input {
        state::Input {
            version: self.version.into(),
            state: state::State {
                graph: self.graph.into_state(),
            },
        }
    }
}

impl Graph {
    pub fn from_state(orig: state::Graph) -> Self {
        // Remap IDs: this is the only operation that destroys the JSON roundtrip: we don't care
        // about keeping the original IDs as they are not user-visible.
        let orig_id_to_idx: HashMap<NodeId, usize> = orig.nodes.keys().enumerate().map(|(idx, &id)| (id, idx)).collect();

        Self {
            nodes: orig.nodes.into_values().map(Node::from_state).collect(),
            edges: orig.edges.into_iter().map(|e| Edge::from_state(e, &&orig_id_to_idx)).collect(),
        }
    }

    pub fn into_state(self) -> state::Graph {
        state::Graph {
            nodes: self.nodes.into_iter()
                .enumerate().
                map(|(idx, n)| (idx as NodeId, n.into_state()))
                .collect(),
            edges: self.edges.into_iter().map(Edge::into_state).collect(),
        }
    }
}

impl Node {
    fn from_state(orig: state::Node) -> Self {
        match orig {
            state::Node::Recipe { pos, recipe, buildings_count, overclock } => Node {
                pos: Pos::from_state(pos),
                data: NodeData::Recipe {
                    recipe: recipe as u16,
                    buildings_count,
                    overclock: Overclock::from_state(overclock),
                },
            },
            state::Node::Merger { pos } => Node {
                pos: Pos::from_state(pos),
                data: NodeData::Merger {}
            },
            state::Node::Splitter { pos } => Node {
                pos: Pos::from_state(pos),
                data: NodeData::Splitter {}
            },
            state::Node::Source { pos, item, rate } => Node {
                pos: Pos::from_state(pos),
                data: NodeData::Source {
                    item: item as u8,
                    rate,
                },
            },
        }
    }

    fn into_state(self) -> state::Node {
        match self.data {
            NodeData::Recipe { recipe, buildings_count, overclock } => state::Node::Recipe {
                pos: self.pos.into_state(),
                recipe: RecipeKind::try_from(recipe).unwrap(),
                buildings_count,
                overclock: overclock.into_state(),
            },
            NodeData::Merger { } => state::Node::Merger {
                pos: self.pos.into_state(),
            },
            NodeData::Splitter { } => state::Node::Splitter {
                pos: self.pos.into_state(),
            },
            NodeData::Source { item, rate } => state::Node::Source {
                pos: self.pos.into_state(),
                item: ItemKind::try_from(item).unwrap(),
                rate,
            },
        }
    }
}

impl Edge {
    fn from_state(orig: state::Edge, orig_id_to_idx: &HashMap<NodeId, usize>) -> Self {
        Self {
            source: GraphHandle {
                node: orig_id_to_idx[&orig.source.node] as u16,
                // handle: if orig.source.handle >= 4 { orig.source.handle - 4 } else { orig.source.handle },
                handle: orig.source.handle,
            },
            target: GraphHandle {
                node: orig_id_to_idx[&orig.target.node] as u16,
                handle: orig.target.handle,
            },
        }
    }

    fn into_state(self) -> state::Edge {
        state::Edge {
            source: state::GraphHandle {
                node: self.source.node as NodeId,
                handle: self.source.handle,
            },
            target: state::GraphHandle {
                node: self.target.node as NodeId,
                handle: self.target.handle,
            },
        }
    }
}

#[derive(Encode, Decode)]
pub struct State {
    pub version: u8,
    pub graph: Graph,
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
    fn from_state(orig: f32) -> Self {
        match orig {
            0.5 => Self::Pe50,
            1.0 => Self::Pe100,
            1.5 => Self::Pe150,
            2.0 => Self::Pe200,
            2.5 => Self::Pe250,
            _ => Self::Custom(orig),
        }
    }

    fn into_state(self) -> f32 {
        match self {
            Self::Pe50 => 0.5,
            Self::Pe100 => 1.0,
            Self::Pe150 => 1.5,
            Self::Pe200 => 2.0,
            Self::Pe250 => 2.5,
            Self::Custom(f) => f,
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
    fn from_state(orig: state::Pos) -> Self {
        // All positions are multiples of GRID_SIZE, so we can compress them by dividing by it.
        Self {
            x: orig.x / Self::GRID_SIZE,
            y: orig.y / Self::GRID_SIZE,
        }
    }

    fn into_state(self) -> state::Pos {
        state::Pos {
            x: self.x * Self::GRID_SIZE,
            y: self.y * Self::GRID_SIZE,
        }
    }
}
