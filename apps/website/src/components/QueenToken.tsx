// TOKEN: TRI, what it is right now, and who has earned it.
//
// Owner's word, 2026-10-02: a tab with the token and its leaderboard, ranked by
// GitHub account. Owner's word, 2026-10-03: the tokens are counted by the
// leaderboard. Owner's word, 2026-10-10: lanes never count -- only .t27 spec
// creators and their bees earn, under the creator's login. So every number
// here is read, nothing typed in by hand:
//
// - the minter's `get_tri_state` on TON testnet: minted, cap, epoch, quorum;
// - the leaderboard's count, the same file the LEADERBOARD tab reads:
//   spec commits per author (`roadmap/spec-authors.json`), summed per GitHub
//   account in lib/triBoard.ts;
// - the rate per spec, as the Queen's ledger states it (`triPerSpec`).
//
// The status line is not decoration. This is a testnet token under a signer
// quorum, and a page that showed balances without saying so would be making a
// claim about value that nothing here backs.
//
// Withdrawing is not done here: it needs the person's Telegram identity, a
// linked GitHub and their own TON wallet, and all three live in the app's
// profile, so this tab points there.

import { useEffect, useState } from 'react'
import { validRate } from '../lib/triBoard'
import { TOKEN_COPY, type TokenCopy } from '../lib/triTokenCopy'
import {
  boardOf,
  formatTri,
  readMinterState,
  readTriCounts,
  TRI_EXPLORER,
  TRI_MINTER,
  type MinterState,
  type TriCounts,
} from '../lib/triToken'
import './QueenPeople.css'
import './QueenToken.css'

const fmt = (n: number) => n.toLocaleString('en-US')

type Read<T> = { state: 'loading' } | { state: 'ok'; value: T } | { state: 'failed' }

export default function QueenToken({ lang }: { lang: 'en' | 'ru' }) {
  const c = TOKEN_COPY[lang === 'ru' ? 'ru' : 'en']
  const [minter, setMinter] = useState<Read<MinterState>>({ state: 'loading' })
  const [board, setBoard] = useState<Read<TriCounts>>({ state: 'loading' })

  useEffect(() => {
    const abort = new AbortController()
    readMinterState(abort.signal)
      .then((value) => setMinter({ state: 'ok', value }))
      .catch(() => !abort.signal.aborted && setMinter({ state: 'failed' }))
    readTriCounts(abort.signal)
      .then((value) => setBoard({ state: 'ok', value }))
      .catch(() => !abort.signal.aborted && setBoard({ state: 'failed' }))
    return () => abort.abort()
  }, [])

  return (
    <div className="qt">
      <header className="qt-head">
        <h2>{c.title}</h2>
        <p>{c.lead}</p>
        <p className="qt-status" role="note">
          {c.status}
        </p>
      </header>

      {minter.state === 'loading' ? (
        <p className="qp-note">{c.loading}</p>
      ) : minter.state === 'failed' ? (
        <p className="qp-note" role="alert">
          {c.chainFailed}
        </p>
      ) : (
        <dl className="qt-facts">
          <div>
            <dt>{c.minted}</dt>
            <dd>{formatTri(minter.value.minted)} TRI</dd>
          </div>
          <div>
            <dt>{c.cap}</dt>
            <dd>{formatTri(minter.value.cap)} TRI</dd>
          </div>
          <div>
            <dt>{c.epoch}</dt>
            <dd>{minter.value.epoch}</dd>
          </div>
          <div>
            <dt>{c.minter}</dt>
            <dd>
              <a href={TRI_EXPLORER} target="_blank" rel="noreferrer noopener" title={TRI_MINTER}>
                {TRI_MINTER.slice(0, 6)}…{TRI_MINTER.slice(-4)}
              </a>{' '}
              <small>{c.quorum(minter.value.threshold, minter.value.signers)}</small>
            </dd>
          </div>
        </dl>
      )}

      <section className="qp" aria-label={c.boardTitle}>
        <h3 className="qp-title">{c.boardTitle}</h3>
        <TokenBoard c={c} board={board} minter={minter} />
      </section>

      <p className="qt-withdraw">
        {c.withdraw}{' '}
        <a href="#/queen?tab=tri&screen=profile">{c.withdrawLink} →</a>
      </p>
    </div>
  )
}

function TokenBoard({
  c,
  board,
  minter,
}: {
  c: TokenCopy
  board: Read<TriCounts>
  minter: Read<MinterState>
}) {
  if (board.state === 'loading') return <p className="qp-note">{c.loading}</p>
  if (board.state === 'failed')
    return (
      <p className="qp-note" role="alert">
        {c.failed}
      </p>
    )

  const { authors, triPerSpec } = board.value
  const { rows, nobody, total } = boardOf(board.value)
  const tri = (n: number | null) => (n === null ? '—' : fmt(n))

  return (
    <>
      <p className="qp-lead">
        {validRate(triPerSpec) ? c.rate(triPerSpec) : c.noRate} {c.rule}
      </p>
      {rows.length === 0 ? (
        <p className="qp-note">{c.empty}</p>
      ) : (
        <ol className="qp-rows">
          {rows.map((row, i) => (
            <li key={row.login} className="qp-row">
              <span className="qp-rank">{i + 1}</span>
              <img
                className="qp-face"
                src={`https://github.com/${row.login}.png?size=96`}
                alt=""
                loading="lazy"
                width={36}
                height={36}
              />
              <span className="qp-who">
                <a href={`https://github.com/${row.login}`} target="_blank" rel="noreferrer noopener">
                  {row.login}
                </a>
                <b className="qp-repos">{c.specCommits(fmt(row.specCommits))}</b>
              </span>
              <span className="qp-commits">
                <b>{tri(row.tri)}</b> TRI
              </span>
            </li>
          ))}
        </ol>
      )}
      {nobody.specCommits > 0 && (
        <p className="qp-counted">{c.nobody(fmt(nobody.specCommits), tri(nobody.tri))}</p>
      )}
      {total !== null && (
        <p className="qp-counted">
          {minter.state === 'ok'
            ? c.total(fmt(total), formatTri(minter.value.minted))
            : c.totalNoChain(fmt(total))}
        </p>
      )}
      <p className="qp-counted">
        {c.measured}: {authors.measuredAt.slice(0, 10)} ·{' '}
        <a href="#/queen?tab=leaderboard">{c.leaderboardLink} →</a>
      </p>
    </>
  )
}
