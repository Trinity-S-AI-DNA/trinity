// karate.js -- Zachary's karate club, embedded.
//
// 34 nodes, 78 undirected edges. The nodes are members of a university karate
// club; the edges are interactions observed outside karate practice. After a
// feud between the instructor ("Mr. Hi") and the administrator ("John A."),
// the club split, and each member's allegiance is the label (17 / 17).
//
// Source: W. W. Zachary, "An Information Flow Model for Conflict and Fission
// in Small Groups", Journal of Anthropological Research 33(4), pp. 452-473,
// 1977. The edge list and faction labels are the standard encoding of
// Zachary's data exactly as networkx ships karate_club_graph (verified
// against networkx at authoring time; 78 edges, 0-indexed).
//
// This file is data: ASCII, dependency-free, no DOM, no network.

export const KARATE_NODES = 34;

// Undirected edges, upper triangle, 0-indexed. 78 entries.
export const KARATE_EDGES = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  [0, 7], [0, 8], [0, 10], [0, 11], [0, 12], [0, 13],
  [0, 17], [0, 19], [0, 21], [0, 31], [1, 2], [1, 3],
  [1, 7], [1, 13], [1, 17], [1, 19], [1, 21], [1, 30],
  [2, 3], [2, 7], [2, 8], [2, 9], [2, 13], [2, 27],
  [2, 28], [2, 32], [3, 7], [3, 12], [3, 13], [4, 6],
  [4, 10], [5, 6], [5, 10], [5, 16], [6, 16], [8, 30],
  [8, 32], [8, 33], [9, 33], [13, 33], [14, 32], [14, 33],
  [15, 32], [15, 33], [18, 32], [18, 33], [19, 33], [20, 32],
  [20, 33], [22, 32], [22, 33], [23, 25], [23, 27], [23, 29],
  [23, 32], [23, 33], [24, 25], [24, 27], [24, 31], [25, 31],
  [26, 29], [26, 33], [27, 33], [28, 31], [28, 33], [29, 32],
  [29, 33], [30, 32], [30, 33], [31, 32], [31, 33], [32, 33],
];

// Faction after the split: 0 = Mr. Hi (17 members), 1 = John A. (17 members).
// This is Zachary's recorded outcome, node for node (networkx "club").
export const KARATE_LABELS = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1,
  0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1,
];

export const KARATE_FACTIONS = ['Mr. Hi', 'John A.'];

// Mr. Hi (0-indexed): nodes 0-8, 10-13, 16, 17, 19, 21. John A.: the rest.
// Cross-check: 17 + 17 = 34 labels, every node in exactly one faction,
// 78 edges, and the hand-written list above is the same 78 pairs.
const mrHi = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 16, 17, 19, 21]);
const pairs = new Set(KARATE_EDGES.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
let consistent = mrHi.size === 17 && KARATE_EDGES.length === 78 && pairs.size === 78;
for (let i = 0; i < KARATE_NODES && consistent; i++) {
  consistent = KARATE_LABELS[i] === (mrHi.has(i) ? 0 : 1);
}
export const KARATE_CONSISTENT = consistent;
