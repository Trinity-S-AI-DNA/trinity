// The words of the TOKEN tab, apart from the component so a plain-node
// contract (qa/tri-board-contract.mjs) can hold them. How the board counts is
// in lib/triBoard.ts: the leaderboard's own units, at the ledger's rate.
//
// No imports on purpose: plain node runs this without Vite.

export interface TokenCopy {
  title: string
  lead: string
  status: string
  minted: string
  cap: string
  epoch: string
  quorum: (threshold: number, signers: number) => string
  minter: string
  chainFailed: string
  boardTitle: string
  /** The rate, when the ledger states a valid one. */
  rate: (triPerSpec: number) => string
  /** Who earns, by the leaderboard. The landing's agent prompt quotes it too. */
  rule: string
  noRate: string
  specCommits: (n: string) => string
  nobody: (commits: string, tri: string) => string
  total: (tri: string, minted: string) => string
  totalNoChain: (tri: string) => string
  leaderboardLink: string
  failed: string
  empty: string
  loading: string
  withdraw: string
  withdrawLink: string
  measured: string
}

export const TOKEN_COPY: Record<'en' | 'ru', TokenCopy> = {
  en: {
    title: 'TRI',
    lead: 'The token an accepted .t27 spec mints. There is no pre-mine and no sale: every TRI that exists was minted for a spec the Queen accepted and its pull request merged.',
    status: 'Testnet only — V1, signer quorum, NOT trustless. A TRI here has no market and no price.',
    minted: 'Minted',
    cap: 'Cap',
    epoch: 'Epoch',
    quorum: (threshold, signers) => `${threshold} of ${signers} signers`,
    minter: 'Minter',
    chainFailed: 'The minter could not be read from TON testnet.',
    boardTitle: 'WHO EARNED IT',
    rate: (triPerSpec) => `${triPerSpec} TRI per spec, as the ledger states it.`,
    rule: 'Counted by the leaderboard, for every .t27 spec: to its author by GitHub login (spec commits). The board credits the login, not the agent, so a creator\'s bees earn under that creator\'s login. Lanes are not counted.',
    noRate: 'The rate per spec could not be read from the ledger, so the units are shown and the TRI is not guessed.',
    specCommits: (n) => `${n} spec commits`,
    nobody: (commits, tri) =>
      `${commits} spec commits have no GitHub account behind them: ${tri} TRI counted here and credited to nobody.`,
    total: (tri, minted) => `Earned in all: ${tri} TRI. Minted on chain so far: ${minted} TRI.`,
    totalNoChain: (tri) => `Earned in all: ${tri} TRI. How much is minted only the minter can say, and it could not be read.`,
    leaderboardLink: 'The leaderboard these counts come from',
    failed: 'The leaderboard could not be read.',
    empty: 'Nobody has earned TRI yet.',
    loading: 'Reading the chain and the leaderboard…',
    withdraw: 'To withdraw what you earned: open your profile in the app, link GitHub and a TON wallet, and press Withdraw. Your own wallet signs the mint and pays the gas.',
    withdrawLink: 'Open my profile',
    measured: 'Measured',
  },
  ru: {
    title: 'TRI',
    lead: 'Токен, который выпускает принятая спека .t27. Ни предварительного выпуска, ни продажи: каждый существующий TRI выпущен за спеку, которую приняла Королева и чей пулл-реквест смержен.',
    status: 'Только testnet — V1, кворум подписантов, НЕ trustless. У TRI здесь нет рынка и нет цены.',
    minted: 'Выпущено',
    cap: 'Потолок',
    epoch: 'Эпоха',
    quorum: (threshold, signers) => `${threshold} из ${signers} подписантов`,
    minter: 'Минтер',
    chainFailed: 'Минтер в TON testnet прочитать не удалось.',
    boardTitle: 'КТО ЗАРАБОТАЛ',
    rate: (triPerSpec) => `${triPerSpec} TRI за спеку — так пишет журнал.`,
    rule: 'Считается по лидерборду, за каждую спеку .t27: её автору по логину GitHub (коммиты в спеки). Доска засчитывает логин, а не агента, поэтому пчёлы автора зарабатывают под логином своего создателя. Полосы не считаются.',
    noRate: 'Ставку за спеку из журнала прочитать не удалось, поэтому показаны единицы, а TRI не угадывается.',
    specCommits: (n) => `коммитов в спеки: ${n}`,
    nobody: (commits, tri) =>
      `Коммитов в спеки без аккаунта GitHub: ${commits} — это ${tri} TRI, посчитаны здесь и не приписаны никому.`,
    total: (tri, minted) => `Заработано всего: ${tri} TRI. Выпущено в сети на сейчас: ${minted} TRI.`,
    totalNoChain: (tri) => `Заработано всего: ${tri} TRI. Сколько выпущено, знает только минтер, а его прочитать не удалось.`,
    leaderboardLink: 'Лидерборд, из которого эти числа',
    failed: 'Лидерборд прочитать не удалось.',
    empty: 'TRI пока никто не заработал.',
    loading: 'Читаю цепочку и лидерборд…',
    withdraw: 'Чтобы вывести заработанное: откройте свой профиль в приложении, привяжите GitHub и TON-кошелёк и нажмите «Вывести». Минт подписывает ваш собственный кошелёк, он же платит газ.',
    withdrawLink: 'Открыть мой профиль',
    measured: 'Измерено',
  },
}
