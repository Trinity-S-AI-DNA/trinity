import type { Block } from '../types'

export const body: Block[] = [
  { "kind": "h", "text": "What changed" },
  { "kind": "p", "text": "The recipe for a t27 course used to live in one agent's private skill folder, where the Queen and her bees could not read it. It now lives in the repository as two t27 modules: specs/course_recipe/course-27.t27 (the steps, rules, gates and cast commands, with tests that hold their order) and specs/course_recipe/roadmap.t27 (the planned courses). AGENTS.md gains a short section that points at them, so any agent asked to open a topic knows the shape: 9 modules of 3 lessons, one topic per course, courses chained." },
  { "kind": "h", "text": "What is checked" },
  { "kind": "p", "text": "Both modules compile clean in the site's own wasm compiler: course-27.t27 has 7 tests with 26 asserts, roadmap.t27 has 4 tests with 30 asserts. Nothing yet runs them in CI; that is the next gap." },
  { "kind": "h", "text": "Limits" },
  { "kind": "p", "text": "A recipe is not a course. No new lessons ship with this PR, and the casts of the existing courses are still pending where the post of each course says so." }
]

export const ruBody: Block[] = [
  { "kind": "h", "text": "Что изменилось" },
  { "kind": "p", "text": "Рецепт курса t27 жил в личной папке навыков одного агента, куда Королева и её пчёлы не могли заглянуть. Теперь он лежит в репозитории двумя модулями t27: specs/course_recipe/course-27.t27 (шаги, правила, шлюзы и команды записи, а тесты держат их порядок) и specs/course_recipe/roadmap.t27 (план курсов). В AGENTS.md появился короткий раздел со ссылкой на них, так что любой агент, которому поручили раскрыть тему, знает форму: 9 модулей по 3 урока, одна тема — один курс, курсы идут цепочкой." },
  { "kind": "h", "text": "Что проверено" },
  { "kind": "p", "text": "Оба модуля чисто собираются компилятором сайта на wasm: в course-27.t27 7 тестов и 26 проверок, в roadmap.t27 4 теста и 30 проверок. В CI их пока ничто не запускает — это следующая дыра." },
  { "kind": "h", "text": "Ограничения" },
  { "kind": "p", "text": "Рецепт — ещё не курс. Новых уроков в этом PR нет, а записи существующих курсов по-прежнему ждут там, где об этом сказано в посте каждого курса." }
]
