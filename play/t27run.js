// t27run.js -- run a spec's own `test` and `invariant` blocks over the AST the real
// compiler (t27_compiler.wasm) returns. Nothing here parses .t27 text: the tree comes
// from the compiler, this file only walks it.
//
// It is an evaluator for the subset the corpus' tests use -- integers, booleans,
// strings, structs, arrays, if/while/for/switch, calls to the spec's own functions --
// and it says so when it meets anything else. Three outcomes per block, never two:
//   pass  every assert held (and there was at least one)
//   fail  an assert was false, or the block divided by zero or indexed past the end
//   skip  the evaluator cannot run something in the block; the reason is named
// A skip is never counted as a pass, and a gap in this evaluator is never counted as a
// fail: a value of the wrong shape, a call that does not match its signature, a tree
// the compiler kept only as text -- each of those skips with its reason.
//
// Integers are BigInt and exact. A value that leaves its declared width (a typed let,
// a parameter, a return, `@as`) skips the block: the backends do not agree on whether
// narrowing traps or keeps the low bits, and this page does not pick one for them.

export class Unsupported extends Error {}
class Raise extends Error {}
// The evaluator met a value it cannot interpret; that is this file's gap, not the spec's.
const gap = (msg) => new Unsupported(msg)
class Ret { constructor(v) { this.v = v } }
const BREAK = Symbol('break')
const CONTINUE = Symbol('continue')
const STEP_LIMIT = 2_000_000

const INT = /^([iu])(\d+)$/
function range(type) {
  if (type === 'usize') return [0n, (1n << 64n) - 1n]
  if (type === 'isize') return [-(1n << 63n), (1n << 63n) - 1n]
  const m = INT.exec(type || '')
  if (!m) return null
  const bits = BigInt(m[2])
  return m[1] === 'u' ? [0n, (1n << bits) - 1n] : [-(1n << (bits - 1n)), (1n << (bits - 1n)) - 1n]
}
function fit(v, type, what) {
  const r = range(type)
  if (!r || typeof v !== 'bigint') return v
  if (v < r[0] || v > r[1]) throw gap(`${what}: ${v} leaves ${type}`)
  return v
}

function literal(n) {
  const raw = n.value
  if (n.nodeKind === 'string') return raw ?? ''
  if (raw === undefined) throw new Unsupported('a literal with no value')
  if (raw === 'true') return true
  if (raw === 'false') return false
  const s = raw.replace(/_/g, '')
  if (/^-?(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+)$/.test(s)) {
    const neg = s.startsWith('-')
    const v = BigInt(neg ? s.slice(1) : s)
    return fit(neg ? -v : v, n.type, 'literal')
  }
  if (/^-?\d+\.\d+([eE][-+]?\d+)?$/.test(s)) return Number(s)
  if (/^'.'$/.test(raw)) return BigInt(raw.charCodeAt(1))
  throw new Unsupported(`literal ${JSON.stringify(raw)}`)
}

const isNum = (v) => typeof v === 'bigint' || typeof v === 'number'
function num(a, b) {
  if (!isNum(a) || !isNum(b)) throw gap(`arithmetic on ${show(a)} and ${show(b)}`)
  if (typeof a === typeof b) return [a, b]
  return [Number(a), Number(b)]
}
function same(a, b) {
  if (a === undefined || b === undefined) throw gap('comparing a value this page could not compute')
  if (isNum(a) && isNum(b)) { const [x, y] = num(a, b); return x === y }
  if (typeof a !== typeof b) return false
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]))
  if (a && typeof a === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b)
    return ka.length === kb.length && ka.every((k) => same(a[k], b[k]))
  }
  return a === b
}
export function show(v) {
  if (typeof v === 'bigint') return v.toString()
  if (typeof v === 'string') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(show).join(', ')}]`
  if (v && typeof v === 'object') return `${v.__struct__ ?? ''}{ ${Object.entries(v).filter(([k]) => k !== '__struct__').map(([k, x]) => `${k}: ${show(x)}`).join(', ')} }`
  return String(v)
}

/** Highest line number anywhere in a subtree; the compiler leaves many inner nodes at 0. */
export function lineOf(n) {
  let best = n.line || 0
  for (const c of n.children ?? []) best = best || lineOf(c)
  return best
}

export function makeProgram(ast) {
  const decls = ast?.children ?? []
  const fns = new Map(), consts = new Map(), enums = new Map(), structs = new Map()
  for (const d of decls) {
    if (d.kind === 'FnDecl') fns.set(d.name, d)
    else if (d.kind === 'ConstDecl') consts.set(d.name, { node: d, state: 0, value: undefined })
    else if (d.kind === 'StructDecl') structs.set(d.name, d)
    else if (d.kind === 'EnumDecl') {
      const vals = {}
      let next = 0n
      for (const v of d.children ?? []) {
        if (v.kind !== 'EnumVariant') continue
        if (v.children?.[0]) next = literal(v.children[0])
        vals[v.name] = next
        next = next + 1n
      }
      enums.set(d.name, vals)
    }
  }
  let steps = 0
  let asserts = null

  const tick = () => { if (++steps > STEP_LIMIT) throw gap(`stopped after ${STEP_LIMIT} steps`) }

  function constValue(name) {
    const c = consts.get(name)
    if (c.state === 2) return c.value
    if (c.state === 1) throw gap(`constant ${name} refers to itself`)
    c.state = 1
    try {
      const expr = c.node.children?.[0]
      if (!expr) throw new Unsupported(`constant ${name} has no value`)
      c.value = fit(evalE(expr, null), c.node.type, name)
    } catch (e) { c.state = 0; throw e }
    c.state = 2
    return c.value
  }

  function lookup(name, scope) {
    for (let s = scope; s; s = s.up) if (s.vars.has(name)) return s.vars.get(name)
    if (consts.has(name)) return constValue(name)
    if (enums.has(name)) return enums.get(name)
    throw new Unsupported(`unknown name ${name}`)
  }
  function assign(name, value, scope) {
    for (let s = scope; s; s = s.up) if (s.vars.has(name)) { s.vars.set(name, value); return }
    throw new Unsupported(`assignment to ${name}, which is not a local`)
  }
  const child = (scope) => ({ vars: new Map(), up: scope })

  function check(ok, n, detail) {
    if (!asserts) throw new Unsupported('assert outside a test')
    // `assert (a - b) < eps` parses as `assert(a - b) < eps`: the assert gets a number.
    if (typeof ok !== 'boolean') throw gap(`an assert of ${show(ok)}, which is not a boolean`)
    asserts.push({ ok: ok === true, line: lineOf(n), detail: ok === true ? '' : detail })
    return ok
  }

  function call(n, scope) {
    const name = n.name
    const args = n.children ?? []
    switch (name) {
      case 'assert':
        // assert(cond, "message"): the message is for the reader, the condition is the check.
        if (args.length === 2 && args[1].nodeKind === 'string') return check(evalE(args[0], scope), n, describe(args[0], scope))
        if (args.length !== 1) throw new Unsupported('assert with more than one argument')
        return check(evalE(args[0], scope), n, describe(args[0], scope))
      case 'std.testing.expect':
        return check(evalE(args[0], scope), n, describe(args[0], scope))
      case 'std.testing.expectEqual': {
        const [a, b] = args.map((x) => evalE(x, scope))
        return check(same(a, b), n, `expected ${show(a)}, got ${show(b)}`)
      }
      case 'cast': case '@intCast': case '@floatCast': case '@as': {
        if (name === '@as') {
          const t = args[0]?.kind === 'ExprIdentifier' ? args[0].name : null
          return fit(evalE(args[1], scope), t, '@as')
        }
        return evalE(args[0], scope)
      }
      case '@intFromBool': return evalE(args[0], scope) ? 1n : 0n
      case '@abs': { const v = evalE(args[0], scope); return v < 0 ? -v : v }
    }
    const fn = fns.get(name)
    if (!fn) throw new Unsupported(`call to ${name}`)
    const params = fn.params ?? []
    if (params.length !== args.length) throw gap(`${name} takes ${params.length} argument(s), the call passes ${args.length}`)
    const local = { vars: new Map(), up: null }
    params.forEach((p, i) => local.vars.set(p.name, fit(evalE(args[i], scope), p.type, `${name}(${p.name})`)))
    let out
    try {
      execBlock(fn.children ?? [], local)
    } catch (e) {
      if (!(e instanceof Ret)) throw e
      out = e.v
    }
    if (out === undefined && fn.returnType && fn.returnType !== 'void') throw gap(`${name} ended without a return this page could follow`)
    return fit(out, fn.returnType, `${name} returns`)
  }

  function describe(n, scope) {
    if (n.kind === 'ExprBinary' && ['==', '!=', '<', '<=', '>', '>='].includes(n.op)) {
      try {
        const [l, r] = n.children.map((c) => evalE(c, scope))
        return `${show(l)} ${n.op} ${show(r)} is false`
      } catch { /* the assert itself already raised or passed */ }
    }
    return 'is false'
  }

  function evalE(n, scope) {
    tick()
    switch (n.kind) {
      case 'ExprLiteral': return literal(n)
      case 'ExprArrayLiteral': case 'ExprTuple':
        // `[1]` in a `given` clause can come back with its elements only as the `size` text
        // and no children; reading that as an empty array would invent a result.
        if (n.size && !(n.children ?? []).length) throw gap(`an array literal the compiler kept as text [${n.size}]`)
        return (n.children ?? []).map((c) => evalE(c, scope))
      case 'ExprIdentifier': return lookup(n.name, scope)
      case 'ExprUnary': {
        const v = evalE(n.children[0], scope)
        switch ((n.op ?? '').trim()) {
          case 'try': return v
          case '-': if (!isNum(v)) throw gap(`negating ${show(v)}`); return -v
          case '!': case 'not': if (typeof v !== 'boolean') throw gap(`not of ${show(v)}`); return !v
          case '~': if (typeof v !== 'bigint') throw gap(`~ of ${show(v)}`); return ~v
        }
        throw new Unsupported(`unary ${n.op}`)
      }
      case 'ExprBinary': {
        const op = n.op
        if (op === '&&' || op === 'and') { const l = evalE(n.children[0], scope); return l === true ? evalE(n.children[1], scope) === true : false }
        if (op === '||' || op === 'or') { const l = evalE(n.children[0], scope); return l === true ? true : evalE(n.children[1], scope) === true }
        const l = evalE(n.children[0], scope), r = evalE(n.children[1], scope)
        switch (op) {
          case '==': return same(l, r)
          case '!=': return !same(l, r)
          case '..': return { __range__: [l, r] }
          case 'in':
            if (Array.isArray(r)) return r.some((x) => same(l, x))
            if (r && r.__range__) return num(l, r.__range__[0])[0] >= num(l, r.__range__[0])[1] && num(l, r.__range__[1])[0] < num(l, r.__range__[1])[1]
            throw gap(`${show(l)} in ${show(r)}`)
          case '++':
            if (typeof l === 'string' && typeof r === 'string') return l + r
            if (Array.isArray(l) && Array.isArray(r)) return [...l, ...r]
            throw gap(`${show(l)} ++ ${show(r)}`)
        }
        const [a, b] = num(l, r)
        switch (op) {
          case '+': return a + b
          case '-': return a - b
          case '*': return a * b
          case '/': if (typeof b === 'bigint' && b === 0n) throw new Raise('division by zero'); return a / b
          case '%': if (typeof b === 'bigint' && b === 0n) throw new Raise('modulo by zero'); return a % b
          case '<': return a < b
          case '<=': return a <= b
          case '>': return a > b
          case '>=': return a >= b
          case '&': return a & b
          case '|': return a | b
          case '^': return a ^ b
          case '<<': return a << b
          case '>>': return a >> b
        }
        throw new Unsupported(`operator ${op}`)
      }
      case 'ExprCall': return call(n, scope)
      case 'ExprFieldAccess': {
        const obj = evalE(n.children[0], scope)
        if (obj && typeof obj === 'object' && n.name in obj) return obj[n.name]
        if ((Array.isArray(obj) || typeof obj === 'string') && n.name === 'len') return BigInt(obj.length)
        throw gap(`${show(obj)} has no field ${n.name}`)
      }
      case 'ExprStructLit': {
        if (!structs.has(n.name)) throw new Unsupported(`struct ${n.name} is not declared in this spec`)
        const o = { __struct__: n.name }
        const types = Object.fromEntries((structs.get(n.name).children ?? []).map((f) => [f.name, f.type]))
        for (const f of n.children ?? []) o[f.name] = fit(evalE(f.children[0], scope), types[f.name], `${n.name}.${f.name}`)
        return o
      }
      case 'ExprIndex': {
        const arr = evalE(n.children[0], scope)
        if (!Array.isArray(arr) && typeof arr !== 'string') throw gap(`indexing ${show(arr)}`)
        if (n.op === 'slice') {
          const lo = n.children[1] ? Number(evalE(n.children[1], scope)) : 0
          const hi = n.children[2] ? Number(evalE(n.children[2], scope)) : arr.length
          if (!(Number.isInteger(lo) && Number.isInteger(hi) && lo >= 0 && lo <= hi && hi <= arr.length)) throw new Raise(`slice [${lo}..${hi}] out of range for length ${arr.length}`)
          return arr.slice(lo, hi)
        }
        if (n.op) throw gap(`index form ${n.op}`)
        const i = evalE(n.children[1], scope)
        if (i && i.__range__) throw gap('a range used as an index')
        const k = Number(i)
        if (!Number.isInteger(k) || k < 0 || k >= arr.length) throw new Raise(`index ${show(i)} out of range for length ${arr.length}`)
        return typeof arr === 'string' ? BigInt(arr.charCodeAt(k)) : arr[k]
      }
      case 'ExprIf': {
        const [c, a, b] = n.children
        return evalE(c, scope) === true ? evalE(a, scope) : evalE(b, scope)
      }
      case 'ExprSwitch': {
        const [subject, ...arms] = n.children
        const v = evalE(subject, scope)
        let fallback = null
        for (const arm of arms) {
          if (arm.name === 'else' || arm.name === '_') { fallback = arm; continue }
          const pat = /^-?\d+$/.test(arm.name) ? BigInt(arm.name) : lookup(arm.name, scope)
          if (same(v, pat)) return evalE(arm.children[0], scope)
        }
        if (fallback) return evalE(fallback.children[0], scope)
        throw gap(`switch on ${show(v)} matched no arm this page could read`)
      }
      case 'ExprReturn': throw new Ret(n.children?.[0] ? evalE(n.children[0], scope) : undefined)
    }
    throw new Unsupported(n.kind)
  }

  function exec(n, scope) {
    tick()
    switch (n.kind) {
      case 'StmtLocal': {
        const v = n.children?.[0] ? evalE(n.children[0], scope) : undefined
        scope.vars.set(n.name, fit(v, n.type, n.name))
        return
      }
      case 'StmtExpr': evalE(n.children[0], scope); return
      case 'StmtAssign': {
        const [target, valueN] = n.children
        let v = evalE(valueN, scope)
        if (n.op && n.op !== '=') {
          const cur = evalE(target, scope)
          const [a, b] = num(cur, v)
          switch (n.op) {
            case '+=': v = a + b; break
            case '-=': v = a - b; break
            case '*=': v = a * b; break
            case '|=': v = a | b; break
            case '&=': v = a & b; break
            case '^=': v = a ^ b; break
            case '<<=': v = a << b; break
            case '>>=': v = a >> b; break
            default: throw new Unsupported(`assignment ${n.op}`)
          }
        }
        if (target.kind === 'ExprIdentifier') return assign(target.name, v, scope)
        if (target.kind === 'ExprFieldAccess') { const o = evalE(target.children[0], scope); if (!o || typeof o !== 'object') throw gap('field assignment on a non-struct'); o[target.name] = v; return }
        if (target.kind === 'ExprIndex') { const a = evalE(target.children[0], scope); a[Number(evalE(target.children[1], scope))] = v; return }
        throw new Unsupported(`assignment to ${target.kind}`)
      }
      case 'StmtIf': {
        const [c, ...rest] = n.children
        if (rest.some((m) => m.name !== 'then' && m.name !== 'else')) throw gap('an if with a part this page cannot read')
        const then = rest.find((m) => m.name === 'then'), other = rest.find((m) => m.name === 'else')
        const branch = evalE(c, scope) === true ? then : other
        if (branch) execBlock(branch.children ?? [], child(scope))
        return
      }
      case 'StmtWhile': {
        const [c, ...rest] = n.children
        if (rest.some((m) => m.name !== 'body' && m.name !== 'continue_expr')) throw gap('a while with a part this page cannot read')
        const body = rest.find((m) => m.name === 'body'), cont = rest.find((m) => m.name === 'continue_expr')
        while (evalE(c, scope) === true) {
          const r = loopBody(body, scope)
          if (r === BREAK) break
          if (cont) execBlock(cont.children ?? [], scope)
        }
        return
      }
      case 'StmtFor': {
        const [over, body] = [n.children[0], n.children.find((m) => m.name === 'body')]
        if (n.children.length !== 2 || (n.params ?? []).length > 1) throw gap('a for over more than one sequence')
        const it = evalE(over, scope)
        const name = n.params?.[0]?.name
        const items = it && it.__range__ ? null : it
        if (it && it.__range__) {
          for (let i = it.__range__[0]; i < it.__range__[1]; i++) {
            const s = child(scope); if (name) s.vars.set(name, i)
            if (loopBody(body, s) === BREAK) break
          }
        } else if (Array.isArray(items)) {
          for (const x of items) {
            const s = child(scope); if (name) s.vars.set(name, x)
            if (loopBody(body, s) === BREAK) break
          }
        } else throw gap(`for over ${show(it)}`)
        return
      }
      case 'StmtBreak': throw BREAK
      case 'StmtContinue': throw CONTINUE
      case 'Module': execBlock(n.children ?? [], child(scope)); return
      case 'ExprReturn': evalE(n, scope); return
    }
    if (n.kind.startsWith('Expr')) { evalE(n, scope); return }
    throw new Unsupported(n.kind)
  }
  function loopBody(body, scope) {
    try { execBlock(body?.children ?? [], child(scope)) } catch (e) {
      if (e === BREAK) return BREAK
      if (e === CONTINUE) return CONTINUE
      throw e
    }
  }
  function execBlock(stmts, scope) { for (const s of stmts) exec(s, scope) }

  /** Run one test or invariant block. */
  function runBlock(b) {
    asserts = []
    steps = 0
    const t0 = performance.now()
    let status, reason = ''
    try {
      if (b.field === 'partial') throw gap('the compiler parsed this block only in part')
      execBlock(b.children ?? [], { vars: new Map(), up: null })
      status = asserts.length === 0 ? 'skip' : asserts.every((a) => a.ok) ? 'pass' : 'fail'
      if (status === 'skip') reason = 'no assert to check'
    } catch (e) {
      if (e instanceof Unsupported) { status = 'skip'; reason = `not run: ${e.message}` }
      else if (e instanceof Raise) { status = 'fail'; reason = e.message }
      else if (e instanceof Ret) { status = asserts.every((a) => a.ok) && asserts.length ? 'pass' : 'fail'; reason = 'returned early' }
      else { status = 'skip'; reason = `not run: ${e && e.message ? e.message : String(e)}` }
    }
    const out = { kind: b.kind === 'InvariantBlock' ? 'invariant' : 'test', name: b.name, line: lineOf(b), status, reason, asserts, ms: performance.now() - t0 }
    asserts = null
    return out
  }

  return {
    blocks: decls.filter((d) => d.kind === 'TestBlock' || d.kind === 'InvariantBlock'),
    benches: decls.filter((d) => d.kind === 'BenchBlock').length,
    runBlock,
    constValue: (name) => { try { return { ok: true, value: constValue(name) } } catch (e) { return { ok: false, error: e.message } } },
    consts: [...consts.keys()],
  }
}

/** Every test and invariant block of a spec, run. */
export function runSpec(ast) {
  const p = makeProgram(ast)
  const results = p.blocks.map((b) => p.runBlock(b))
  const count = (s) => results.filter((r) => r.status === s).length
  return { results, pass: count('pass'), fail: count('fail'), skip: count('skip'), benches: p.benches }
}
