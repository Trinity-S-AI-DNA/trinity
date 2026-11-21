// hive-price/tool.js -- lesson 20 of queen-and-hive: the price of an operation. The price is
// price_tokens(cost), the month month_tokens(dollars), and reels_in and portraits_in of that month,
// fn bodies of gHashTag/t27 specs/automation/token-wallet.t27 compiled to wasm (./logic.js). Words are
// SAY_ and numbers K_ constants of specs/widgets/hive-price.t27.
import { monthTokens, portraitsIn, priceTokens, reelsIn } from './logic.js'
import { K, W, ask, controls, el, fill, root, say, source, tiles, verdict } from '../hive-kit.js'

const ctl = controls([
  { key: 'cost', label: say('SAY_COST'), min: 0, max: K('K_COST_MAX', 200000), step: K('K_COST_STEP', 100) },
  { key: 'usd', label: say('SAY_USD'), min: 0, max: K('K_USD_MAX', 200), step: 1 },
], { names: W.SAY_PRESET_NAMES, values: { cost: K('K_PRESET_COST', []), usd: K('K_PRESET_USD', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const price = priceTokens(s.cost)
  const month = monthTokens(s.usd)
  out.replaceChildren(
    verdict(fill(say('SAY_EACH'), price), 1, `${say('SAY_COST')}: ${s.cost}`),
    tiles([
      { label: say('SAY_PRICE'), value: String(price), tone: 1 },
      { label: say('SAY_MONTH'), value: String(month), tone: 0 },
      { label: say('SAY_REELS'), value: String(reelsIn(month)), tone: 3 },
      { label: say('SAY_PORTRAITS'), value: String(portraitsIn(month)), tone: 2 },
    ]))
}

ctl.start()
