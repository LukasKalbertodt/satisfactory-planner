//! Encode the full state as a compact "digest".
//!
//! The JSON representation of the state is wastefully large. By using a custom encoding, utilizing
//! domain knowledge, this can be shrunk down a lot. This is able to store any state, but
//! user-invisible properties might change, for example:
//! - Order of nodes or edges
//! - Position of all nodes might be translated by a global vector
//!
//! Again, these things a user cannot observe, so it's fine. It just means an exact JSON roundtrip
//! cannot be guaranteed.
//!
//! The encoding operates on `BitBuf` to not be restricted to byte granularity. Here is an overview
//! of how data is stored (for more information see the `encode` function):
//!
//! - version: 8 bits
//! - Nodes
//!     - num nodes: 8 or 16 bits
//!     - Node positions
//!     - Node payload
//! - Edges
//!     - num edges: 8 or 16 bits
//!     - edges
//!
//! Here is an unordered list of possible improvements:
//! - Node positions: here is still redundancy. One could use sub-bit encoding, but that requires to
//!   encode `max_x - min_x` and `max_y - min_y`, which is not worth it for like 10 nodes. There is
//!   also lots of redundancy that I cannot figure out how to get rid of. Often, the same y occurs.
//! - Node kind: instead of encoding 3 bits for every node, one could simply encode the number of
//!   each node kind with sub-bit encoding.
//! - Recipe kind: one could sort recipe by expected usage, store the maximum recipe kind number and
//!   then store all recipe kinds with sub-bit coding. One could also order by recipe-kind. Then the
//!   maximum recipe kind could be implicitly the kind of the first one.
//! - Edges: instead of treating mergers/splitters as "unknown item" all the time, one can assign
//!   them once they are connected to something.

use std::{cmp::{max, min}, collections::BTreeMap, num::NonZero, ops::{Add, Not, Shl, Shr, Sub}};

use crate::{gamedata::{ItemKind, RecipeKind, SourceItemKind}, state::{self, HandleId, NodeId}};


const MIN_POS_BITS: u8 = 4;

pub fn encode(state: &state::Input) -> Vec<u8> {
    let mut buf = BitBuf::new();
    buf.write_u8(state.version as u8);
    let g = &state.state.graph;

    // ----- Write nodes ------------------------------
    buf.write_len(g.nodes.len());
    if g.nodes.len() > 0 {
        // ----- Write positions

        // Translate all nodes such that the node with the lowest x has x = 0, and same for y.
        let mut min_x = i32::MAX;
        let mut min_y = i32::MAX;
        let mut max_x = i32::MIN;
        let mut max_y = i32::MIN;
        for n in &g.nodes {
            min_x = min(min_x, n.pos().x);
            min_y = min(min_y, n.pos().y);
            max_x = max(max_x, n.pos().x);
            max_y = max(max_y, n.pos().y);
        }


        // Write "header" to specify how many bits per scalar we use. We subtract the minimum bits
        // to be able to only use 4 bits for the "bit length" encoding while still supporting up to
        // 2^4 + 4 = 20 bits.
        let bits_x = max(MIN_POS_BITS, required_bits_for((max_x - min_x) as u64 / 25 + 1));
        let bits_y = max(MIN_POS_BITS, required_bits_for((max_y - min_y) as u64 / 25 + 1));
        buf.write_bits((bits_x - MIN_POS_BITS) as u64, 4);
        buf.write_bits((bits_y - MIN_POS_BITS) as u64, 4);

        // Encode all positions (translated) in the calculated number of bits.
        for n in &g.nodes {
            let x = (n.pos().x - min_x) / 25;
            let y = (n.pos().y - min_y) / 25;
            buf.write_bits(x as u64, bits_x);
            buf.write_bits(y as u64, bits_y);
        }


        // ----- Write node payload
        for n in &g.nodes {
            match *n {
                state::Node::Recipe { recipe, buildings_count, overclock, .. } => {
                    buf.write_bits(0, 3); // Tag
                    write_recipe_kind(&mut buf, recipe);
                    write_overclock(&mut buf, overclock);
                    write_building_count(&mut buf, buildings_count);
                    // TODO: power amplification
                }
                state::Node::Merger { .. } => buf.write_bits(1, 3), // Tag
                state::Node::Splitter { .. } => buf.write_bits(2, 3), // Tag
                state::Node::Source { item, rate, .. } => {
                    buf.write_bits(3, 3); // Tag
                    write_source_item_kind(&mut buf, item);
                    write_source_rate(&mut buf, rate);
                }
            }
        }
    }


    // ----- Write edges ------------------------------
    buf.finish_byte();
    buf.write_len(g.edges.len());
    if g.edges.len() > 0 {
        let mut coder = EdgeCoder::new(&g.nodes);
        coder.encode(&mut buf, g);
    }

    buf.buf
}

pub fn decode(data: &[u8]) -> Result<state::Input, String> {
    // Also check out `encode` for more explanation!

    let mut buf = BitReader::new(data);
    let version = buf.read_u8();

    // ----- Read nodes ------------------------------
    let num_nodes = buf.read_len();
    let mut nodes = Vec::with_capacity(num_nodes);
    if num_nodes > 0 {
        // ----- Read positions
        let bits_x = buf.read_bits(4) as u8 + MIN_POS_BITS;
        let bits_y = buf.read_bits(4) as u8 + MIN_POS_BITS;
        let mut positions = Vec::with_capacity(num_nodes);
        for _ in 0..num_nodes {
            let x = (buf.read_bits(bits_x) * 25) as i32;
            let y = (buf.read_bits(bits_y) * 25) as i32;
            positions.push(state::Pos { x, y });
        }

        // ----- Read node payload
        for i in 0..num_nodes {
            let pos = positions[i];
            let node = match buf.read_bits(3) {
                0 => state::Node::Recipe {
                    pos,
                    recipe: read_recipe_kind(&mut buf),
                    overclock: read_overclock(&mut buf),
                    buildings_count: read_building_count(&mut buf),
                },
                1 => state::Node::Merger { pos },
                2 => state::Node::Splitter { pos },
                3 => state::Node::Source {
                    pos,
                    item: read_source_item_kind(&mut buf),
                    rate: read_source_rate(&mut buf),
                },
                _ => Err("invalid node tag")?,
            };

            nodes.push(node);
        }
    }

    // ----- Read edges ------------------------------
    buf.finish_byte();
    let num_edges = buf.read_len();
    let mut edges = Vec::new();
    if num_edges > 0 {
        let mut coder = EdgeCoder::new(&nodes);
        edges = coder.decode(&mut buf, num_edges, &nodes);
    }

    Ok(state::Input {
        version: version as u32,
        state: state::State {
            graph: state::Graph { nodes, edges },
        },
    })
}

fn required_bits_for(count: u64) -> u8 {
    assert!(count > 0, "required_bits_for called with 0");
    if count == 1 {
        return 0;
    }

    (count - 1).ilog2() as u8 + 1
}

// ===============================================================================================
// ===== Read & write single special values
// ===============================================================================================

// To avoid duplication, the `write_` version contains comments/explanations, while the `read_`
// version does not.

fn write_recipe_kind(buf: &mut BitBuf, v: RecipeKind) {
    // There are more than 256 recipes, but a lot less than 512, so 9 bits should
    // suffice even with Ficmas and probably future DLCs. I don't think varints
    // would help here, even if we sort the recipe IDs by usage frequency, as the IDs
    // are not _that_ biased towards low values. It's just intuition, I did not
    // test it.
    buf.write_bits((v as u16).into(), 9);
}

fn read_recipe_kind(buf: &mut BitReader) -> RecipeKind {
    let id = buf.read_bits(9) as u16;
    RecipeKind::try_from(id).unwrap()
}

fn write_overclock(buf: &mut BitBuf, v: state::Overclock) {
    match v.0 {
        // The overclock value is very often 1.0.
        100_0000 => buf.write_bits(0b0, 1),

        // Otherwise, in most cases it's 0.5, 1.5, 2.0 or 2.5.
        50_0000 => buf.write_bits(0b1000, 4),
        150_0000 => buf.write_bits(0b1001, 4),
        200_0000 => buf.write_bits(0b1010, 4),
        250_0000 => buf.write_bits(0b1011, 4),

        // Only very rarely it's "any percentage" more precisely: a number between
        // 1% and 250% with 4 decimal digits of precision.
        v => {
            // Convert to value between 1_0000 and 250_0000. This can be encoded
            // with 22 bits. 0b11 is used as tag.
            buf.write_bits(0b11, 2);
            buf.write_bits(v.into(), 22);
        }
    }
}

fn read_overclock(buf: &mut BitReader) -> state::Overclock {
    if buf.read_bits(1) == 0 {
        return state::Overclock(100_0000);
    }

    if buf.read_bits(1) == 0 {
        match buf.read_bits(2) {
            0b00 => return state::Overclock(50_0000),
            0b01 => return state::Overclock(150_0000),
            0b10 => return state::Overclock(200_0000),
            0b11 => return state::Overclock(250_0000),
            _ => unreachable!(),
        }
    }

    state::Overclock(buf.read_bits(22) as u32)
}

fn write_building_count(buf: &mut BitBuf, v: NonZero<u32>) {
    let v = v.get() as u64;
    match v {
        0 => unreachable!(),

        // Many nodes will have a fairly small building count. My non-scientific test of looking
        // at a few of my plans showed that <= 12 would cover a majority of nodes. And since
        // 11 = 0b1011, this case never sets the first two bits to 1.
        1..=12 => buf.write_bits(v - 1, 4),

        // Otherwise, we use a 9 bit number. I never had a plan with more than that number of
        // buildings. Since we already covered 1-12, these 9 bits can cover 13-(2^9 + 12) = 13-524.
        13..=524 => {
            buf.write_bits(0b110, 3);
            buf.write_bits(v - 13, 9);
        }

        // But just to make sure to be able to work with crazy plans, we have a 24bit backup.
        525.. => {
            buf.write_bits(0b111, 3);
            buf.write_bits(v - 525, 24);
        }
    }
}

fn read_building_count(buf: &mut BitReader) -> NonZero<u32> {
    let nz = |v: u64| NonZero::new(v as u32).unwrap();
    let first_two = buf.read_bits(2);

    // 4 bit number
    if first_two != 0b11 {
        return nz((first_two << 2 | buf.read_bits(2)) + 1);
    }

    // 9 Bit number
    if buf.read_bits(1) == 0 {
        return nz(buf.read_bits(9) + 13);
    }

    // 24 Bit number
    nz(buf.read_bits(24) + 525)
}

fn write_source_item_kind(buf: &mut BitBuf, v: SourceItemKind) {
    // We have 12 different source items and Satisfactory is unlikely to add lots more.
    buf.write_bits((v as u8).into(), 4);
}

fn read_source_item_kind(buf: &mut BitReader) -> SourceItemKind {
    let id = buf.read_bits(4) as u8;
    SourceItemKind::try_from(id).unwrap()
}

fn write_source_rate(buf: &mut BitBuf, v: u32) {
    match v {
        // We use four bits for common cases, while making sure that the two first bits are
        // never both 1.
        30 => buf.write_bits(0b0000, 4),
        60 => buf.write_bits(0b0001, 4),
        120 => buf.write_bits(0b0010, 4),
        240 => buf.write_bits(0b0011, 4),
        300 => buf.write_bits(0b0100, 4),
        480 => buf.write_bits(0b0101, 4),
        600 => buf.write_bits(0b0110, 4),
        960 => buf.write_bits(0b0111, 4),
        1200 => buf.write_bits(0b1000, 4),
        1920 => buf.write_bits(0b1001, 4),
        2400 => buf.write_bits(0b1010, 4),
        4800 => buf.write_bits(0b1011, 4),

        // In many many cases, the rate is a multiple of 30. Then using 9 bits for the number
        // gives us (2^9 - 1) * 30 = 15330.
        v if v % 30 == 0 && v / 30 < 2u32.pow(9) => {
            buf.write_bits(0b110, 3);
            buf.write_bits((v / 30).into(), 9);
        }

        // Otherwise, we use 17 bits. This can cover 2^17 - 1 = 131071 which is more than the
        // available iron on the whole map at 250% clock speed mk3 miner (which is 72780).
        _ => {
            assert!(v < 2u32.pow(17), "source rate {} too big to be encoded", v);
            buf.write_bits(0b111, 3);
            buf.write_bits(v.into(), 17);
        }
    }
}

fn read_source_rate(buf: &mut BitReader) -> u32 {
    let first_two = buf.read_bits(2);

    if first_two != 0b11 {
        return match first_two << 2 | buf.read_bits(2) {
            0b0000 => 30,
            0b0001 => 60,
            0b0010 => 120,
            0b0011 => 240,
            0b0100 => 300,
            0b0101 => 480,
            0b0110 => 600,
            0b0111 => 960,
            0b1000 => 1200,
            0b1001 => 1920,
            0b1010 => 2400,
            0b1011 => 4800,
            _ => unreachable!(),
        };
    }

    if buf.read_bits(1) == 0 {
        return buf.read_bits(9) as u32 * 30;
    }

    buf.read_bits(17) as u32
}


// ===============================================================================================
// ===== EdgeCoder
// ===============================================================================================

/// Helper to efficiently encode edges.
///
/// The first main idea is to flatten the two-level (node_id, handle_id) hierarchy and just have a
/// list of all input and output handles. We then only need to encode one number (index into the
/// corresponding list) instead of two. The next idea is to not encode an index, but a "rank" of all
/// handles that are even possible. For example, once a handle is used up, it is removed from the
/// pool, and we have one fewer option. Combining that with sub-bit encoding yields wins.
///
/// For one side of the edge (we chose target), we can do even better as not only can we ignore
/// "used" handles, but also handles with incompatible item (which is dictated by the start of the
/// edge). As a last trick, we sort the edges such that all edges targetting a merger or splitter
/// come first. We do need to encode how many that are, but that allows us to first only consider
/// splitter/merger nodes, and in the second half only consider other nodes. That again cuts down
/// the number of options. When encoding the targets, it's quite common to not need any bits for
/// the last few edges, as there is only one possible connection left.
///
/// The implementation is somewhat involved, partially because the sub-bit decoding requires us to
/// know all the "number of options" in advance. This also requires us to first encode all edge
/// sources, and then all edge targets.
struct EdgeCoder {
    outputs: Vec<EdgeCoderEntry>,
    inputs: Vec<EdgeCoderEntry>,
}

#[derive(Debug)]
struct EdgeCoderEntry {
    node: NodeId,
    handle: HandleId,
    item: Option<ItemKind>,
    used: bool,
}

impl EdgeCoderEntry {
    fn is_for(&self, h: &state::GraphHandle) -> bool {
        self.node == h.node && self.handle == h.handle
    }
}

impl EdgeCoder {
    /// Creates a new edge coder. This just creates two lists of all input/output handles.
    fn new(nodes: &[state::Node]) -> Self {
        let mut inputs = Vec::with_capacity(nodes.len());
        let mut outputs = Vec::with_capacity(nodes.len());
        let e = |node, handle, item| EdgeCoderEntry { node, handle, item, used: false };
        for (node_id, node) in nodes.iter().enumerate() {
            let node_id = node_id as NodeId;
            match *node {
                state::Node::Recipe { recipe, .. } => {
                    for (i, input_item) in recipe.info().inputs.iter().enumerate() {
                        inputs.push(e(node_id, i as HandleId, Some(*input_item)));
                    }
                    for (i, output_item) in recipe.info().outputs.iter().enumerate() {
                        outputs.push(e(node_id, i as HandleId + 4, Some(*output_item)));
                    }
                }
                state::Node::Merger { .. } => {
                    inputs.push(e(node_id, 0, None));
                    inputs.push(e(node_id, 1, None));
                    inputs.push(e(node_id, 2, None));
                    outputs.push(e(node_id, 3, None));
                }
                state::Node::Splitter { .. } => {
                    inputs.push(e(node_id, 0, None));
                    outputs.push(e(node_id, 1, None));
                    outputs.push(e(node_id, 2, None));
                    outputs.push(e(node_id, 3, None));
                }
                state::Node::Source { item, .. } => {
                    outputs.push(e(node_id, 0, Some(item.into())))
                }
            }
        }

        Self {
            inputs,
            outputs,
        }
    }

    /// Encodes all edges from `graph` into `buf`. Number of edges should already been encoded.
    fn encode(&mut self, buf: &mut BitBuf, graph: &state::Graph) {
        // Sort edges to get all edges targetting a splitter/merger to the beginning. This allows
        // efficiency gains when encoding the edge targets.
        let edges = {
            let mut edges = graph.edges.clone();
            edges.sort_by_key(|e| {
                let source_split_merge = graph.node(e.source.node).is_split_merge();
                let target_split_merge = graph.node(e.target.node).is_split_merge();
                (!target_split_merge, !source_split_merge, e.target.node)
            });
            edges
        };

        // Encode how many edges target a splitter/merger
        let num_split_merge_target = edges.iter()
            .take_while(|e| graph.node(e.target.node).is_split_merge())
            .count();
        let mut coder = SubBitEncoder::new();
        coder.encode(buf, num_split_merge_target as u32, edges.len() as u32);

        // Encode all sources.
        let mut expected_items = Vec::new();
        for edge in &edges {
            let num_options = (self.outputs.len() - expected_items.len()) as u32;
            let (IndexRank { rank, .. }, e) = self.unused_outputs()
                .find(|(_, e)| e.is_for(&edge.source))
                .expect("failed to find edge source");
            coder.encode(buf, rank, num_options);
            e.used = true;
            expected_items.push(e.item);
        }
        coder.flush(buf);

        // Encode all targets
        let mut coder = SubBitEncoder::new();
        let infos = self.targets_iter(&graph.nodes, num_split_merge_target, &expected_items);
        for (info, edge) in infos.zip(edges) {
            let (IndexRank { idx, rank }, _) = info.relevant_inputs(&self.inputs)
                .find(|(_, e)| e.is_for(&edge.target))
                .expect("failed to find edge target");
            coder.encode(buf, rank, info.num_options);
            self.inputs[idx].used = true;
        }
        coder.flush(buf);
    }

    /// Decodes `num_edges` many edges from `buf`.
    fn decode(
        &mut self,
        buf: &mut BitReader,
        num_edges: usize,
        nodes: &[state::Node],
    ) -> Vec<state::Edge> {
        let mut out = Vec::with_capacity(num_edges);

        // Decode the number of edges targetting splitter/merge and all sources.
        let mut expected_items = Vec::with_capacity(num_edges);
        let num_options_list = [num_edges as u32].into_iter()
            .chain((0..=self.outputs.len() as u32).rev().take(num_edges));
        let ranks = decode_sub_bit_stream(buf, num_options_list);
        let num_split_merge_target = ranks[0];
        for &rank in &ranks[1..] {
            let (_, entry) = self.unused_outputs().nth(rank as usize).unwrap();
            entry.used = true;
            expected_items.push(entry.item);
            out.push(state::Edge {
                source: state::GraphHandle { node: entry.node, handle: entry.handle },
                // Dummy, overwritten below
                target: state::GraphHandle { node: u16::MAX, handle: u8::MAX },
            });
        }

        // Decode edge targets
        let targets = self.targets_iter(nodes, num_split_merge_target as usize, &expected_items)
            .collect::<Vec<_>>();
        let ranks = decode_sub_bit_stream(buf, targets.iter().map(|t| t.num_options));
        for (i, (rank, info)) in ranks.into_iter().zip(targets).enumerate() {
            let (IndexRank { idx, .. }, e) = info.relevant_inputs(&self.inputs).nth(rank as usize).unwrap();
            out[i].target = state::GraphHandle { node: e.node, handle: e.handle };
            self.inputs[idx].used = true;
        }

        out
    }

    /// Returns an iterator over all unused outputs, with rank and index.
    fn unused_outputs(&mut self) -> impl Iterator<Item = (IndexRank, &mut EdgeCoderEntry)> {
        self.outputs.iter_mut()
            .enumerate()
            .filter(|(_, e)| !e.used)
            .enumerate()
            .map(|(rank, (idx, e))| (IndexRank { idx, rank: rank as u32 }, e))
    }

    /// Helper to encode/decode edge targets.
    ///
    /// Due to using the sub-bit coder, we need to know all "number of options" in advance when
    /// decoding. By using this helper for the decoding and encoding, we make sure that the encoding
    /// is not accidentally relying on more information than the decoder has at the time.
    ///
    /// This returns an iterator over an "info" object for the a specific edge target. The iterator
    /// yields one item per edge.
    fn targets_iter<'a>(
        &self,
        nodes: &'a [state::Node],
        num_split_merge_target: usize,
        expected_items: &'a [Option<ItemKind>],
    ) -> impl 'a + Iterator<Item = EdgeTargetInfo<'a>> {
        // Prepare some data for the iterator. We need to know the number of splitter/merger inputs
        // as well as the number of all other inputs.
        let num_split_merges_total = self.inputs.iter()
            .filter(|input| nodes[input.node as usize].is_split_merge())
            .count();
        let mut num_other_total = (self.inputs.len() - num_split_merges_total) as u32;

        // But we also need a map to keep track of how many inputs for a specific item we have. This
        // wouldn't be necessary without the sub-bit encoding, as then we could just decode each
        // rank at a time, mark the node as `used` and use that.
        let mut num_per_item = BTreeMap::new();
        for input in &self.inputs {
            let Some(item) = input.item else {
                continue;
            };
            if nodes[input.node as usize].is_split_merge() {
                continue;
            }

            *num_per_item.entry(item).or_insert(0) += 1;
        }

        expected_items.iter().enumerate().map(move |(i, &expected_item)| {
            let targets_split_merge = i < num_split_merge_target;

            // The following calculation needs to mirror the filter in `EdgeTargetInfo::relevant_inputs`
            // below. We need `num_options` to be exactly `relevant_inputs().count()`.
            let num_options = if targets_split_merge {
                (num_split_merges_total - i) as u32
            } else {
                // In case the edge targets another node that has an `item` annotation, the filter
                // is more complex and we need to consider the expected item.
                let num = if let Some(expected_item) = expected_item {
                    let out = num_per_item[&expected_item];
                    *num_per_item.get_mut(&expected_item).unwrap() -= 1;
                    out
                } else {
                    num_other_total
                };

                num_other_total -= 1;

                num
            };

            EdgeTargetInfo {
                num_options,
                nodes,
                targets_split_merge,
                expected_item,
            }
        })
    }
}

/// Provides information for an edge target. Specifically: `num_options` and the `relevant_inputs`
/// iterator.
struct EdgeTargetInfo<'a> {
    num_options: u32,
    nodes: &'a [state::Node],
    targets_split_merge: bool,
    expected_item: Option<ItemKind>,
}

impl<'a> EdgeTargetInfo<'a> {
    /// Returns an iterator over all inputs that this edge target needs to consider.
    ///
    /// This is kind of the core of the efficient edge target encoding, as it filters the possible
    /// options as much as possible to keep the possible ranks small.
    fn relevant_inputs<'s>(
        &'s self,
        inputs: &'a [EdgeCoderEntry],
    ) -> impl 's + Iterator<Item = (IndexRank, &'a EdgeCoderEntry)> {
        inputs.iter()
            .enumerate()
            .filter(|(_, e)| {
                let correct_node_type = self.nodes[e.node as usize].is_split_merge() == self.targets_split_merge;
                let item_matches = match (e.item, self.expected_item) {
                    (Some(a), Some(b)) => a == b,
                    _ => true,
                };
                !e.used && correct_node_type && item_matches
            })
            .enumerate()
            .map(|(rank, (idx, e))| (IndexRank { idx, rank: rank as u32 }, e))
    }
}

struct IndexRank {
    idx: usize,
    rank: u32,
}


// ===============================================================================================
// ===== Sub bit encoding
// ===============================================================================================

/// Encoder for our "sub bit encoding".
///
/// Allows encoding a list of numbers (each with a known `max)`) in a more compact form than
/// encoding each individually. For example, if we want to encode two numbers:
/// - a could be 0, 1 or 2 (i.e. 3 options)
/// - b could be 0 - 4 (i.e. 5 options)
///
/// Encoding them individually would take 2 bits + 3 bits. But in total, there are only 15 options,
/// so 4 bits should suffice in total. We can achieve that by multiplying/adding them together and
/// extracting them again via modular division. 64 bit chunks are used so that we don't need bigints
/// for arithmetic.
///
/// The main disadvantage is that you need to know all "number of options" beforehand for decoding.
/// And the division part makes decoding not exactly "fast". But on average it saves roughly half a
/// bit per entry, assuming the "num options" are randomly distributed.
struct SubBitEncoder {
    acc: u64,
    num_options: u64,
}

impl SubBitEncoder {
    fn new() -> Self {
        Self {
            acc: 0,
            num_options: 1,
        }
    }

    fn encode(&mut self, buf: &mut BitBuf, v: u32, num_options: u32) {
        if self.num_options.checked_mul(num_options.into()).is_none() {
            self.flush(buf);
        }
        self.num_options *= num_options as u64;
        self.acc = self.acc * num_options as u64 + v as u64;
    }

    fn flush(&mut self, buf: &mut BitBuf) {
        let bits = required_bits_for(self.num_options);
        buf.write_bits(self.acc, bits);
        *self = Self::new();
    }
}

/// Decodes our "sub bit encoding". See `SubBitEncoder` for more information.
fn decode_sub_bit_stream(
    buf: &mut BitReader,
    num_option_list: impl IntoIterator<Item = u32>,
) -> Vec<u32> {
    let mut out = Vec::new();
    let mut it = num_option_list.into_iter().peekable();

    // Each iteration decodes on chunk
    let mut slots = Vec::new();
    while it.peek().is_some() {
        slots.clear();

        // Try to fit as many entries as can fit in one u64.
        let mut total_num_options = 1u64;
        while let Some(&num_options) = it.peek() {
            if let Some(p) = total_num_options.checked_mul(num_options.into()) {
                total_num_options = p;
                slots.push(num_options);
                let _ = it.next();
            } else {
                break;
            }
        }

        let mut acc = buf.read_bits(required_bits_for(total_num_options));
        // This is a bit weird but we use the vector that is holding the number of options for each
        // slot, to also hold the output value for each slot. It works because that's the same type
        // and we just need one to map to the other.
        for slot in slots.iter_mut().rev() {
            let num_options = *slot;
            *slot = (acc % num_options as u64) as u32;
            acc /= num_options as u64;
        }

        out.extend_from_slice(&slots);
    }

    out
}


// ===============================================================================================
// ===== BitBuf and BitReader
// ===============================================================================================

/// A bit buffer for writing a sequence of bits.
///
/// This is basically "big endian" in that bit 0 is the MSBit of the first byte. And bit 9 is the
/// second MSBit of the second byte.
struct BitBuf {
    buf: Vec<u8>,
    /// In bits.
    pos: usize,
}

impl BitBuf {
    fn new() -> Self {
        Self {
            buf: Vec::new(),
            pos: 0,
        }
    }

    fn reserve(&mut self, bits: usize) {
        let bytes = (self.pos + bits + 7) / 8;
        self.buf.resize(bytes, 0);
    }

    fn finish_byte(&mut self) {
        self.pos = (self.pos + 7) / 8 * 8;
    }

    fn write_u8(&mut self, value: u8) {
        self.write_bits(value.into(), 8);
    }

    /// Write the length of nodes/edges as varint (either 1 or 2 bytes). Can encode only up to
    /// 2^15 - 1 = 32767.
    fn write_len(&mut self, len: usize) {
        debug_assert!(len < 32768);
        if len < 0x80 {
            self.write_u8(len as u8);
        } else {
            self.write_u8(0x80 | (len >> 8) as u8);
            self.write_u8((len & 0xFF) as u8);
        }
    }

    /// Writes the `count` least significant bits from `v` into `self`, start with the most
    /// significant bit of the those.
    fn write_bits(&mut self, v: u64, mut count: u8) {
        self.reserve(count as usize);
        let mut v = {
            let masked = v & u64::bitmask_lsb(count as u64);
            debug_assert_eq!(masked, v, "value {v} too big to be encoded in {count} bits");
            masked
        };
        while count > 0 {
            let byte = &mut self.buf[self.pos / 8];
            let pos_in_byte = (self.pos % 8) as u8;
            let bits_left_in_byte = 8 - pos_in_byte;
            let next_write = min(bits_left_in_byte, count);

            // The byte needs to keep its `pos_in_byte` most significant bits.
            let keep_mask = u8::bitmask_msb(pos_in_byte);
            let bits_to_write = (v >> (count - next_write)) as u8;

            *byte = (*byte & keep_mask) | (bits_to_write << (bits_left_in_byte - next_write));
            self.pos += next_write as usize;
            count -= next_write;
            v &= u64::bitmask_lsb(count as u64);
        }
    }
}

struct BitReader<'a> {
    buf: &'a [u8],
    pos: usize,
}

impl<'a> BitReader<'a> {
    fn new(buf: &'a [u8]) -> Self {
        Self { buf, pos: 0 }
    }

    fn read_u8(&mut self) -> u8 {
        self.read_bits(8) as u8
    }

    fn finish_byte(&mut self) {
        self.pos = (self.pos + 7) / 8 * 8;
    }

    /// Write the length of nodes/edges as varint (either 1 or 2 bytes). Can encode only up to
    /// 2^15 - 1 = 32767.
    fn read_len(&mut self) -> usize {
        if self.read_bits(1) == 0 {
            self.read_bits(7) as usize
        } else {
            ((self.read_bits(7) << 8) | self.read_bits(8)) as usize
        }
    }

    /// Writes `count` bits from `v` and returns them in the LSBits of the result.
    fn read_bits(&mut self, mut count: u8) -> u64 {
        let mut out = 0;
        while count > 0 {
            let byte = &self.buf[self.pos / 8];
            let pos_in_byte = (self.pos % 8) as u8;
            let bits_left_in_byte = 8 - pos_in_byte;
            let next_read = min(bits_left_in_byte, count);

            let bits = (*byte >> (bits_left_in_byte - next_read)) & u8::bitmask_lsb(next_read);
            out = (out << next_read) | bits as u64;

            self.pos += next_read as usize;
            count -= next_read;
        }
        out
    }
}


// ===============================================================================================
// ===== Helper for easy to read bit masking
// ===============================================================================================

trait BitNum: Copy
    + Add<Output = Self>
    + Sub<Output = Self>
    + Shl<Self, Output = Self>
    + Shr<Self, Output = Self>
    + Not<Output = Self>
    + Eq
{
    const ZERO: Self;
    const ONE: Self;
    const EIGHT: Self;
    const BIT_WIDTH: Self;

    /// Returns `Self` with the `n` least significant bits set to 1.
    fn bitmask_lsb(n: Self) -> Self {
        if n == Self::BIT_WIDTH {
            return !Self::ZERO;
        } else {
            (Self::ONE << n) - Self::ONE
        }
    }
    /// Returns `Self` with the `n` most significant bits set to 1.
    fn bitmask_msb(n: Self) -> Self {
        !Self::bitmask_lsb(Self::BIT_WIDTH - n)
    }
}

impl BitNum for u8 {
    const ZERO: Self = 0;
    const ONE: Self = 1;
    const EIGHT: Self = 8;
    const BIT_WIDTH: Self = 8;
}
impl BitNum for u32 {
    const ZERO: Self = 0;
    const ONE: Self = 1;
    const EIGHT: Self = 8;
    const BIT_WIDTH: Self = 32;
}
impl BitNum for u64 {
    const ZERO: Self = 0;
    const ONE: Self = 1;
    const EIGHT: Self = 8;
    const BIT_WIDTH: Self = 64;
}


// ===============================================================================================
// ===== Tests
// ===============================================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn required_bits() {
        assert_eq!(required_bits_for(1), 0);
        assert_eq!(required_bits_for(2), 1);
        assert_eq!(required_bits_for(3), 2);
        assert_eq!(required_bits_for(4), 2);
        assert_eq!(required_bits_for(5), 3);
        assert_eq!(required_bits_for(6), 3);
        assert_eq!(required_bits_for(7), 3);
        assert_eq!(required_bits_for(8), 3);
        assert_eq!(required_bits_for(9), 4);
        assert_eq!(required_bits_for(15), 4);
        assert_eq!(required_bits_for(16), 4);
        assert_eq!(required_bits_for(17), 5);
        assert_eq!(required_bits_for(32), 5);
        assert_eq!(required_bits_for(33), 6);
    }

    #[test]
    fn bitbuf() {
        let mut buf = BitBuf::new();
        buf.write_bits(0b11010, 5);
        assert_eq!(buf.buf, vec![0b11010_000]);
        buf.write_bits(0b011101, 6);
        assert_eq!(buf.buf, vec![0b11010_011, 0b101_00000]);
        buf.write_bits(0b11000_11100_10101, 15);
        assert_eq!(buf.buf, vec![0b11010_011, 0b101_11000, 0b11100_101, 0b01_000000]);

        let mut reader = BitReader::new(&buf.buf);
        assert_eq!(reader.read_bits(3), 0b110);
        assert_eq!(reader.read_bits(1), 0b1);
        assert_eq!(reader.read_bits(6), 0b001110);
        assert_eq!(reader.read_bits(2), 0b11);
        assert_eq!(reader.read_bits(15), 0b10001_11001_01010);
    }

    const PREFIXES: [(u8, u64); 8] = [
        (0, 0b0),
        (1, 0b1),
        (2, 0b01),
        (3, 0b101),
        (4, 0b1010),
        (5, 0b10101),
        (6, 0b101010),
        (7, 0b0011001),
    ];

    fn test_roundtrip<T: Clone + std::fmt::Debug + PartialEq>(
        v: T,
        mut write: impl FnMut(&mut BitBuf, T),
        mut read: impl FnMut(&mut BitReader) -> T,
    ) {
        for (prefix_len, prefix) in PREFIXES {
            let mut buf = BitBuf::new();
            buf.write_bits(prefix, prefix_len);
            write(&mut buf, v.clone());

            let mut reader = BitReader::new(&buf.buf);
            let _ = reader.read_bits(prefix_len);
            let actual = read(&mut reader);
            if actual != v {
                panic!("roundtrip failed (with prefix len {prefix_len}): \n\
                    wrote: {v:?}\n\
                    read:  {actual:?}\n\
                    Raw vec: {}",
                    buf.buf.iter().map(|b| format!("{:08b} ", b)).collect::<String>(),
                );
            }
        }
    }

    #[test]
    fn bitbuf_len() {
        fn test(len: usize) {
            test_roundtrip(len, |buf, len| buf.write_len(len), |buf| buf.read_len());
        }

        test(0);
        test(1);
        test(5);
        test(16);
        test(100);
        test(126);
        test(127);
        test(128);
        test(129);
        test(190);
        test(23450);
        test(32767);
    }

    #[test]
    fn overclock() {
        let test = |v| test_roundtrip(state::Overclock(v), write_overclock, read_overclock);

        test(100_0000);
        test(050_0000);
        test(150_0000);
        test(200_0000);
        test(250_0000);
        test(001_0000);
        test(133_3333);
        test(249_9999);
    }

    #[test]
    fn buildings_count() {
        let test = |v| {
            let nz = NonZero::new(v).unwrap();
            test_roundtrip(nz, write_building_count, read_building_count);
        };

        test(1);
        test(2);
        test(3);
        test(4);
        test(5);
        test(6);
        test(7);
        test(8);
        test(9);
        test(10);
        test(11);
        test(12);

        test(13);
        test(14);
        test(15);
        test(16);
        test(17);
        test(81);
        test(195);
        test(277);
        test(512);
        test(523);
        test(524);
        test(525);
        test(526);
        test(999);
        test(1038);
        test(1_234_567);
    }

    #[test]
    fn source_rate() {
        let test = |v| test_roundtrip(v, write_source_rate, read_source_rate);

        test(30);
        test(60);
        test(120);
        test(240);
        test(300);
        test(480);
        test(600);
        test(960);
        test(1200);
        test(1920);
        test(2400);
        test(4800);

        test(90);
        test(150);
        test(1260);
        test(15330);
        test(15360);
        test(15390);

        test(0);
        test(1);
        test(2);
        test(29);
        test(31);
        test(31);
        test(12345);
        test(72780);
        test(131072);
    }


    #[test]
    fn sub_bit() {
        let test = |v: Vec<(u32, u32)>| test_roundtrip(
            v.clone(),
            |buf, v| {
                let mut coder = SubBitEncoder::new();
                for (val, num_options) in v {
                    coder.encode(buf, val, num_options);
                }
                coder.flush(buf);
            },
            |buf| {
                let num_options_list = v.iter().map(|(_, num_options)| *num_options);
                let values = decode_sub_bit_stream(buf, num_options_list.clone());
                values.into_iter().zip(num_options_list).collect()
            },
        );

        test(vec![(17, 32)]);
        test(vec![(2, 5), (3, 4)]);
        test(vec![(2, 5), (3, 4), (0, 3)]);
        test(vec![(5, 7), (1, 6), (2, 5), (1, 4), (2, 3), (0, 2), (0, 1)]);

        let p20 = 2u32.pow(20);
        let p16 = 2u32.pow(16);
        test(vec![(35, p20), (34, p20), (33, p20), (32, p20), (7, 244)]);
        test(vec![(35, p16), (34, p16), (33, p16), (32, p16), (7, 244)]);
    }
}
