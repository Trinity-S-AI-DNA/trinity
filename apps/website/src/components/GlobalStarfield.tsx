import { useLocation } from 'react-router-dom'
import PhiStarfield from './PhiStarfield'
import { COURSE_ROUTES } from '../lib/courseRoutes.generated'

// Звёздное поле было только на главной, хотя оно не украшение: положения звёзд
// берутся из спирали Фогеля с углом 137.5077° = круг, делённый на φ², — то же
// самое число, которым правило полей делит разрядность формата. Одна страница
// с ним и восемнадцать без него читались как разные сайты.
//
// Исключения ниже — маршруты, у которых есть своё полноэкранное полотно
// (canvas / WebGL / wasm-сцены). Там второй фоновый canvas не виден вообще,
// зато честно тратит кадры, поэтому его туда не ставим.
const OWN_CANVAS = new Set([
  '/canvas',
  '/quantum',
  '/lab',
  '/play',
  '/chat',
  '/wasm',
  '/dashboard',
  '/tree',
])

// The course routes of specs/course/courses.t27, from the small generated list, so the starfield does not load the courses.
const COURSE_ROOTS = COURSE_ROUTES.map((r) => `/${r}`)

export default function GlobalStarfield() {
  const { pathname } = useLocation()
  if (OWN_CANVAS.has(pathname)) return null
  // The courses draw on pure black, lesson pages included (owner, 2026-10-05).
  if (COURSE_ROOTS.some((r) => pathname === r || pathname.startsWith(`${r}/`))) return null
  return <PhiStarfield />
}
