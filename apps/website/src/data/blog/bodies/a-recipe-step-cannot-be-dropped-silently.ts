import type { Block } from '../types'

export const body: Block[] = [
  { "kind": "h", "text": "What changed" },
  { "kind": "p", "text": "The course recipe in specs/course_recipe had tests, but nothing ran them, so a step could be deleted and nobody would notice. The Course job of the website checks now runs npm run check:course-recipe, which compiles every .t27 file in that directory with the site's own wasm compiler and runs its test blocks." },
  { "kind": "h", "text": "What makes it fail" },
  { "kind": "p", "text": "A compile error, a failing assert, a file with zero tests, or an empty directory. To prove it, a mutant changed an asserted constant in roadmap.t27: the check went red with exit code 1, and after the file was restored it went green again." },
  { "kind": "h", "text": "Limits" },
  { "kind": "p", "text": "The check runs the tests the modules already have. It does not judge whether those tests cover every step of the recipe." }
]

export const ruBody: Block[] = [
  { "kind": "h", "text": "Что изменилось" },
  { "kind": "p", "text": "У рецепта курса в specs/course_recipe были тесты, но их никто не запускал, так что шаг можно было удалить незаметно. Теперь задание Course в проверках сайта запускает npm run check:course-recipe: он собирает каждый файл .t27 в этой папке wasm-компилятором самого сайта и прогоняет его тесты." },
  { "kind": "h", "text": "Когда проверка падает" },
  { "kind": "p", "text": "Ошибка сборки, проваленный assert, файл без тестов или пустая папка. Для доказательства мутант поменял проверяемую константу в roadmap.t27: проверка покраснела с кодом 1, а после восстановления файла снова позеленела." },
  { "kind": "h", "text": "Ограничения" },
  { "kind": "p", "text": "Проверка гоняет те тесты, что уже есть в модулях. Покрывают ли они каждый шаг рецепта, она не судит." }
]
