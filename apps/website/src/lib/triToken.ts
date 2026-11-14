// TRI, THE TOKEN: where it lives, and how to read it without trusting a copy.
//
// Owner's word, 2026-10-02: a tab with the token and its leaderboard. Every
// number on that tab is read, not written here:
//
// - the cap, what has been minted, the epoch and the signer quorum come from
//   the minter's own `get_tri_state` get-method, so the page cannot disagree
//   with the contract that enforces them;
// - who has earned what is counted by the leaderboard (owner, 2026-10-03;
//   lanes struck from the count by the owner, 2026-10-10: only .t27 spec
//   creators and their bees earn, and the board credits the login, not the
//   agent): its one read, summed in lib/triBoard.ts, at the rate the Queen's
//   `/queen/public-earnings` ledger states. `readTriCounts` is that one read,
//   for the TOKEN tab and the landing alike.
//
// The one thing a chain cannot answer is how many base units make one TRI: the
// jetton's metadata is where wallets read that, and it says 3 (t27.ai
// /tri/jetton.json, the minter's `content`). It is written once, below.

import { QUEEN_API } from './queenApi'
import { readSpecAuthors, type SpecAuthors } from './queenPeople'
import { triBoard, validRate, type TriBoard } from './triBoard'

/** The only minter there is. TESTNET: there is no mainnet TRI. */
export const TRI_MINTER = 'kQBtPS1btdHCml1vunIhNIBRRS-pfXggMWVbiLhrsvGjbX8X'
export const TRI_NETWORK = 'testnet' as const
const TONCENTER = 'https://testnet.toncenter.com/api/v3'
export const TRI_EXPLORER = `https://testnet.tonviewer.com/${TRI_MINTER}`

/** mTRI per TRI: the jetton's decimals are 3 (tri_minter.fc, "Units"). */
export const MTRI_PER_TRI = 1000

/** What the minter says about itself, in mTRI. */
export interface MinterState {
  minted: bigint
  cap: bigint
  epoch: number
  threshold: number
  signers: number
}

/** One earning, as the Queen's ledger publishes it. */
export interface TriEarning {
  workId: string
  repo: string
  issue: number
  specPaths: string[]
  acceptedAt: string
  revokedAt: string | null
}

/** One lender of a lane, as the Queen's ledger gathers them. */
export interface TriEarner {
  name: string
  claimed: boolean
  github?: string
  keys: number[]
  earned: number
  revoked: number
}

export interface TriEarnings {
  measuredAt: string
  scheme: string
  status: string
  triPerSpec: number
  earners: TriEarner[]
  recent?: TriEarning[]
}

/** `27000n` mTRI -> `"27"`; `1500n` -> `"1.5"`. Exact, no float on the way. */
export function formatTri(mtri: bigint): string {
  const unit = BigInt(MTRI_PER_TRI)
  const whole = (mtri / unit).toLocaleString('en-US')
  const frac = (mtri % unit).toString().padStart(3, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole
}

/** toncenter v3 get-method stack: `[{type:'num', value:'0x…'}]`. */
export function parseMinterState(stack: Array<{ type: string; value: string }>): MinterState {
  if (stack.length < 5 || stack.some((s) => s.type !== 'num')) {
    throw new Error('get_tri_state: unexpected stack')
  }
  const n = stack.map((s) => BigInt(s.value))
  return {
    minted: n[0],
    cap: n[1],
    epoch: Number(n[2]),
    threshold: Number(n[3]),
    signers: Number(n[4]),
  }
}

export async function readMinterState(signal?: AbortSignal): Promise<MinterState> {
  const res = await fetch(`${TONCENTER}/runGetMethod`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address: TRI_MINTER, method: 'get_tri_state', stack: [] }),
    credentials: 'omit',
    signal,
  })
  if (!res.ok) throw new Error(`toncenter ${res.status}`)
  const body = (await res.json()) as { exit_code: number; stack: Array<{ type: string; value: string }> }
  if (body.exit_code !== 0) throw new Error(`get_tri_state exit ${body.exit_code}`)
  return parseMinterState(body.stack)
}

/** `null` when the Queen does not publish the ledger yet (404): not an error. */
export async function readEarnings(signal?: AbortSignal): Promise<TriEarnings | null> {
  const res = await fetch(`${QUEEN_API}/queen/public-earnings`, { credentials: 'omit', signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`queen ${res.status}`)
  return (await res.json()) as TriEarnings
}

/** What the TRI board is counted from: the leaderboard's read and the rate. */
export interface TriCounts {
  authors: SpecAuthors
  /** The ledger's rate; null when the ledger could not say, or said something
   *  validRate refuses. Gated here, at the one read, so no caller can show it. */
  triPerSpec: number | null
}

/**
 * The count is required. The rate is not: without it the units still stand,
 * and the TRI is shown as unknown.
 */
export async function readTriCounts(signal?: AbortSignal): Promise<TriCounts> {
  const [authors, triPerSpec] = await Promise.all([
    readSpecAuthors(signal),
    readEarnings(signal).then(
      (e) => {
        const rate: unknown = e?.triPerSpec
        return validRate(rate) ? rate : null
      },
      () => null,
    ),
  ])
  return { authors, triPerSpec }
}

/** The board those counts make: the one call both the tab and the landing use. */
export const boardOf = ({ authors, triPerSpec }: TriCounts): TriBoard =>
  triBoard(authors.people, triPerSpec, authors.unattributed?.commits ?? 0)
