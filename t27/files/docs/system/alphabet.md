# The 27-agent alphabet

## Twenty-seven letters, three nonas

`docs/agents/AGENTS_ALPHABET.md` (v3.0, 2026-04-07) is the canon: "The Trinity system
employs 27 named agents -- corresponding to the 27 registers in `isa/registers.t27`
(Coptic / Trinity alphabet)." Each agent is bound to a letter and a register, has a domain
(physics, numeric, compiler, graph, experience, verdict, bench, DePIN, UI and so on), logs
to `.trinity/experience/` and is linked to nodes in `graph_v2.json`.

The alphabet is read in three layers of nine, which the document also calls nonas:

- **Archetypal, A-I (1-9)** -- "pure concept -- foundation: soul, base, types". A is the
  architecture and `SOUL.md` as primary cause; C the compiler; E the experience; I the ISA.
- **Spiritual, J-R (10-18)** -- "inner process -- life of the system: tasks, language,
  numbers, physics". L is the language; M the metrics; N the numeric formats; P the physics
  constants; Q the queue.
- **Physical, S-27th (19-27)** -- "manifestation -- proof: standards, verdict, deploy,
  gift". S is the specs; T the Queen, who "puts the final seal on everything"; V the
  verdict; W the workflow and tri cell ("double hash-seal"); Z the zero-touch UX and docs;
  the 27th letter, Ti, is security.

The same three-by-nine layout organises the documentation tree of the repository
(`docs/nona-01-foundation/`, `docs/nona-02-organism/`, `docs/nona-03-manifest/`, Article
DOCS-TREE of the constitution) and the ring on the site next to this chapter, where each
letter sits at its ordinal and is coloured by its layer.

## The table

The table the site renders next to this chapter is generated from
`public/agents/spec-agents.json`, which is itself generated from the 27 files
`specs/agents/<letter>.t27` through the compiler wasm -- it is not typed here. Per letter it
shows the ordinal, the letter name, the domain, the archetype, the register, the layer, and
the skills and tools the agent holds with their evidence. The FULL TABLE of the alphabet
document (letter, domain, archetype, key files, entry invariant, exit invariant, CLARA role)
is the source each spec was transcribed from; the spec's header names the row.

Two conventions of the table are worth stating. A letter's register comes from the schema
section of the alphabet document (for example T is R19, V is R21, W is R22); the ordinal is
the position in the alphabet, 1..27, so T is 20 and the 27th letter is 27. Where the
alphabet document names two agents with the same Greek letter name (C and G are both
written "Gamma"), the spec keeps the document's spelling and the ID stays unambiguous
because it is the Latin letter, `t27/C` and `t27/G`.

## What a card carries

Beyond the alphabet row, an agent card on the site carries what the other layers say about
the letter:

- **Skills** -- IDs from `specs/skills` the agent holds, bound only where a source names the
  skill. At the commit this documentation was generated from one letter holds skills: T,
  from `.claude/agents/trinity.md`, which names `phi-loop` and `tri-pipeline` in its Phase 2
  and Phase 4. The other 26 carry an empty list and a note saying which sources were read.
- **Tools** -- IDs from `specs/tools` the agent holds, bound in both directions (the tool
  spec names the letter back). Five commands are bound today: `tri gen` (C, T), `tri test`
  (T, V), `tri verdict` (V), `tri experience` (E), `tri cell` (W); the sources are the phase
  descriptions of the alphabet document and the `.claude/agents/*.md` files.
- **Crons** -- jobs whose `RUNS` names a skill the agent holds; empty while every `RUNS` is
  empty.
- **Experience** -- episodes attributed to the letter in `.trinity/experience/`; none is
  attributed today, and the card says so rather than showing a number it cannot source.
- **Sources** -- the three binding documents (`SOUL.md`, `AGENTS.md`, the alphabet) at the
  pinned commit, and the spec file itself.
