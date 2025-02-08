use std::{cmp::{max, min}, num::NonZero, ops::{Add, Not, Shl, Shr, Sub}};

use crate::{gamedata::{RecipeKind, SourceItemKind}, state::{self, HandleId, NodeId}};


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
        let bits_x = max(MIN_POS_BITS, ((max_x - min_x) / 25).ilog2() as u8 + 1);
        let bits_y = max(MIN_POS_BITS, ((max_y - min_y) / 25).ilog2() as u8 + 1);
        buf.write_bits((bits_x - MIN_POS_BITS) as u32, 4);
        buf.write_bits((bits_y - MIN_POS_BITS) as u32, 4);

        // Encode all positions (translated) in the calculated number of bits.
        for n in &g.nodes {
            let x = (n.pos().x - min_x) / 25;
            let y = (n.pos().y - min_y) / 25;
            buf.write_bits(x as u32, bits_x);
            buf.write_bits(y as u32, bits_y);
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
        // How many bits are required to store any node ID
        let id_bits = (g.nodes.len() - 1).max(1).ilog2() as u8 + 1;

        for edge in &g.edges {
            buf.write_bits(edge.source.node as u32, id_bits);
            match g.nodes[edge.source.node as usize] {
                // These only have one output handle, so no need to encode anything.
                state::Node::Merger { .. } | state::Node::Source { .. } => {}

                // Output handles of splitters have IDs 1, 2 or 3. We can simply encode them with
                // 2 bits.
                state::Node::Splitter { .. } => buf.write_bits(edge.source.handle as u32, 2),

                // Recipes can have up to 8 handles, but only 4 output handles. The output handles
                // have IDs 4-7, so we subtract 4 and encode them with 2 bits.
                state::Node::Recipe { .. } => buf.write_bits(edge.source.handle as u32 - 4, 2),
            }

            buf.write_bits(edge.target.node as u32, id_bits);
            match g.nodes[edge.target.node as usize] {
                // These only have one input handle, so no need to encode anything.
                state::Node::Splitter { .. } => {}

                // Input handles of merges have IDs 0, 1, or 2. We can simply encode them with
                // 2 bits.
                state::Node::Merger { .. } => buf.write_bits(edge.target.handle as u32, 2),

                // Input handles of recipes have IDs 0-3. We can simply encode them with 2 bits.
                // TODO: with recipe knowledge, we don't need to encode this as there is only one
                // valid handle.
                state::Node::Recipe { .. } => buf.write_bits(edge.target.handle as u32, 2),

                state::Node::Source { .. } => unreachable!("source node as target"),
            }
        }
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
    let mut edges = Vec::with_capacity(num_edges);
    if num_edges > 0 {
        let id_bits = (num_nodes - 1).max(1).ilog2() as u8 + 1;
        for _ in 0..num_edges {
            let source_node_idx = buf.read_bits(id_bits) as NodeId;
            let source_node = nodes.get(source_node_idx as usize)
                .ok_or("source node ID out of bounds")?;
            let source_handle = match source_node {
                state::Node::Merger { .. } => 3,
                state::Node::Source { .. } => 0,
                state::Node::Splitter { .. } => buf.read_bits(2) as HandleId,
                state::Node::Recipe { .. } => buf.read_bits(2) as HandleId + 4,
            };

            let target_node_idx = buf.read_bits(id_bits) as NodeId;
            let target_node = nodes.get(target_node_idx as usize)
                .ok_or("target node ID out of bounds")?;
            let target_handle = match target_node {
                state::Node::Splitter { .. } => 0,
                state::Node::Merger { .. } => buf.read_bits(2) as HandleId,
                state::Node::Recipe { .. } => buf.read_bits(2) as HandleId,
                state::Node::Source { .. } => unreachable!("source node as target"),
            };

            edges.push(state::Edge {
                source: state::GraphHandle {
                    node: source_node_idx,
                    handle: source_handle,
                },
                target: state::GraphHandle {
                    node: target_node_idx,
                    handle: target_handle,
                },
            });
        }
    }

    Ok(state::Input {
        version: version as u32,
        state: state::State {
            graph: state::Graph { nodes, edges },
        },
    })
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

fn write_overclock(buf: &mut BitBuf, v: f32) {
    match v {
        // The overclock value is very often 1.0.
        1.0 => buf.write_bits(0b0, 1),

        // Otherwise, in most cases it's 0.5, 1.5, 2.0 or 2.5.
        0.5 => buf.write_bits(0b1000, 4),
        1.5 => buf.write_bits(0b1001, 4),
        2.0 => buf.write_bits(0b1010, 4),
        2.5 => buf.write_bits(0b1011, 4),

        // Only very rarely it's "any percentage" more precisely: a number between
        // 1% and 250% with 4 decimal digits of precision.
        _ => {
            // Convert to value between 1_0000 and 250_0000. This can be encoded
            // with 22 bits. 0b11 is used as tag.
            let int = (v * 100.0 * 1000.0) as u32;
            buf.write_bits(0b11, 2);
            buf.write_bits(int, 22);
        }
    }
}

fn read_overclock(buf: &mut BitReader) -> f32 {
    if buf.read_bits(1) == 0 {
        return 1.0;
    }

    if buf.read_bits(1) == 0 {
        match buf.read_bits(2) {
            0b00 => return 0.5,
            0b01 => return 1.5,
            0b10 => return 2.0,
            0b11 => return 2.5,
            _ => unreachable!(),
        }
    }

    let int = buf.read_bits(22);
    int as f32 / 1000.0 / 100.0
}

fn write_building_count(buf: &mut BitBuf, v: NonZero<u32>) {
    let v = v.get();
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
    let first_two = buf.read_bits(2);

    // 4 bit number
    if first_two != 0b11 {
        return NonZero::new((first_two << 2 | buf.read_bits(2)) + 1).unwrap();
    }

    // 9 Bit number
    if buf.read_bits(1) == 0 {
        return NonZero::new(buf.read_bits(9) + 13).unwrap();
    }

    // 24 Bit number
    NonZero::new(buf.read_bits(24) + 525).unwrap()
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
            buf.write_bits(v / 30, 9);
        }

        // Otherwise, we use 17 bits. This can cover 2^17 - 1 = 131071 which is more than the
        // available iron on the whole map at 250% clock speed mk3 miner (which is 72780).
        _ => {
            assert!(v < 2u32.pow(17), "source rate {} too big to be encoded", v);
            buf.write_bits(0b111, 3);
            buf.write_bits(v, 17);
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
        return buf.read_bits(9) * 30;
    }

    buf.read_bits(17)
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
        self.write_bits(value as u32, 8);
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
    fn write_bits(&mut self, v: u32, mut count: u8) {
        self.reserve(count as usize);
        let mut v = {
            let masked = v & u32::bitmask_lsb(count as u32);
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
            v &= u32::bitmask_lsb(count as u32);
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
    fn read_bits(&mut self, mut count: u8) -> u32 {
        let mut out = 0;
        while count > 0 {
            let byte = &self.buf[self.pos / 8];
            let pos_in_byte = (self.pos % 8) as u8;
            let bits_left_in_byte = 8 - pos_in_byte;
            let next_read = min(bits_left_in_byte, count);

            let bits = (*byte >> (bits_left_in_byte - next_read)) & u8::bitmask_lsb(next_read);
            out = (out << next_read) | bits as u32;

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


// ===============================================================================================
// ===== Tests
// ===============================================================================================

#[cfg(test)]
mod tests {
    use super::*;

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

    const PREFIXES: [(u8, u32); 8] = [
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
        let test = |v| test_roundtrip(v, write_overclock, read_overclock);

        test(1.0);
        test(0.5);
        test(1.5);
        test(2.0);
        test(2.5);
        test(0.01);
        // TODO: float inaccuracy
        // test(1.33_3333);
        // test(2.49_9999);
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
}
