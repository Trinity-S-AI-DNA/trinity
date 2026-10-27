import type { Block } from '../types'

// Numbers here come from apps/website/scripts/widget-cards-from-spec.mjs and its test file, run on
// 2026-10-07 on one Mac (node 22): the 27 tool widgets of specs/widgets/gallery.t27, the card of
// gatle drawn twice with the same sha-256, and the two negative controls described in the post.

export const body: Block[] = [
  {
    kind: 'p',
    text: 'Every widget tool on t27.ai has a share card: the 1200 x 630 picture X and Telegram show under a link to its page. All 27 of them were drawn by hand, the last batch in a headless browser that does not exit on its own. Nothing checked that a card still said what its spec says. Now `npm run cards:widgets` draws the card from the widget spec\'s own words, in black and white, with node and nothing else, and `check:widget-cards` fails when a gallery widget has no card or a drawn card no longer matches its spec.',
  },
  { kind: 'h', text: 'What the card is made of' },
  {
    kind: 'ul',
    items: [
      'The title and the line under it are TITLE and DESCRIPTION from `specs/widgets/<id>.t27`, read through the same t27 compiler the site ships.',
      'The words around them, the brand and the category name, come from `specs/widgets/gallery.t27`. The footer names the widget\'s address and the spec file it was drawn from.',
      'The letters are the site\'s own fonts, decoded from WOFF2 in the script: Outfit at weight 700 for the title, JetBrains Mono for the rest.',
    ],
  },
  { kind: 'h', text: 'Why no browser, and no image library' },
  {
    kind: 'p',
    text: 'A check that redraws a card and compares it byte for byte needs a card that comes out the same everywhere. A browser screenshot does not promise that, and the site has no image library in its dependencies. So the script does the whole job itself: it unpacks the fonts with node\'s brotli, applies the font\'s weight variation to get bold, fills the outlines with a scanline rasterizer at four sub-rows per pixel, and writes the PNG with its own deflate. It does not use node\'s zlib to compress, because zlib\'s output may differ between builds. A card is about 45 KB and takes one to two seconds.',
  },
  {
    kind: 'p',
    text: 'A drawn card carries a text chunk naming its generator and its spec. The check redraws only those cards. A card without the mark was drawn by hand; the check holds it to being present and 1200 x 630, and `--id <id>` replaces it with a drawn one.',
  },
  { kind: 'h', text: 'The proof' },
  {
    kind: 'ol',
    items: [
      'Delete `public/widgets/gatle/card.png`: the check fails with rc 1 and names the missing card.',
      'Run `npm run cards:widgets`: it draws that one card (46,566 bytes), rewrites the widget pages whose card link carries the card\'s hash, and the check passes.',
      'Draw it again: zero cards written, and the sha-256 is the same, 3850b6cd...',
      'Change gatle\'s TITLE from "today\'s t27 module" to "today\'s t27 spec": the check fails and calls the card stale. Redraw it with `--id gatle`, and the check passes.',
      'Restore the spec, the card and the pages with git. The 27 cards on main are the hand-drawn ones; this change replaces none of them.',
    ],
  },
  { kind: 'h', text: 'What it does not do yet' },
  {
    kind: 'ul',
    items: [
      'It was run on one machine. The arithmetic is plain IEEE doubles and no zlib, so the bytes should match elsewhere. The CI run of the check is the first test of that.',
      'No kerning and no hinting; text is wrapped word by word on glyph widths.',
      'The fonts are the Latin subsets: a Russian title would come out as question marks, so the cards are English only.',
      'Only the 27 widget tools (`public/widgets/<id>/`) are covered. Lesson cards, player cards and recording cards keep their own generators.',
    ],
  },
]

export const ruBody: Block[] = [
  {
    kind: 'p',
    text: 'У каждого инструмента-виджета на t27.ai есть карточка для ссылки: картинка 1200 x 630, которую X и Telegram показывают под ссылкой на его страницу. Все 27 нарисованы вручную, последняя партия — в безголовом браузере, который сам не завершается. Совпадает ли карточка с тем, что написано в спеке, никто не проверял. Теперь `npm run cards:widgets` рисует карточку из слов самой спеки виджета, чёрным по белому, одним node, без сторонних библиотек. А `check:widget-cards` падает, если у виджета из галереи нет карточки или нарисованная карточка разошлась со спекой.',
  },
  { kind: 'h', text: 'Из чего состоит карточка' },
  {
    kind: 'ul',
    items: [
      'Заголовок и строка под ним — это TITLE и DESCRIPTION из `specs/widgets/<id>.t27`, прочитанные тем же компилятором t27, что работает на сайте.',
      'Слова вокруг них — бренд и название категории — берутся из `specs/widgets/gallery.t27`. Внизу — адрес виджета и файл спеки, из которой нарисована карточка.',
      'Буквы — собственные шрифты сайта, которые скрипт сам распаковывает из WOFF2: Outfit с насыщенностью 700 для заголовка, JetBrains Mono для остального.',
    ],
  },
  { kind: 'h', text: 'Почему без браузера и без графической библиотеки' },
  {
    kind: 'p',
    text: 'Проверка, которая перерисовывает карточку и сравнивает её побайтно, требует, чтобы карточка везде получалась одинаковой. Снимок браузера этого не обещает, а графической библиотеки среди зависимостей сайта нет. Поэтому скрипт делает всю работу сам. Он распаковывает шрифты встроенным в node brotli и применяет вариацию насыщенности шрифта, чтобы получить жирное начертание. Контуры он заливает построчно, по четыре подстроки на пиксель, и записывает PNG своим deflate. Встроенный zlib из node для сжатия не используется: его вывод может отличаться от сборки к сборке. Карточка весит около 45 КБ и рисуется за одну-две секунды.',
  },
  {
    kind: 'p',
    text: 'В нарисованной карточке есть текстовый блок с именем генератора и спеки. Перерисовывает проверка только такие карточки. Карточка без этой метки нарисована вручную: от неё проверка требует только наличия и размера 1200 x 630, а `--id <id>` заменяет её нарисованной.',
  },
  { kind: 'h', text: 'Доказательство' },
  {
    kind: 'ol',
    items: [
      'Удаляем `public/widgets/gatle/card.png` — проверка падает с кодом 1 и называет недостающую карточку.',
      'Запускаем `npm run cards:widgets` — он рисует одну эту карточку (46 566 байт), переписывает страницы виджетов, у которых в ссылке на карточку стоит её хэш, и проверка проходит.',
      'Рисуем ещё раз — записано ноль карточек, sha-256 тот же, 3850b6cd...',
      'Меняем TITLE у gatle с "today\'s t27 module" на "today\'s t27 spec" — проверка падает и называет карточку устаревшей. Перерисовываем с `--id gatle` — проверка проходит.',
      'Возвращаем спеку, карточку и страницы через git. В main остаются 27 карточек, нарисованных вручную; это изменение ни одну из них не заменяет.',
    ],
  },
  { kind: 'h', text: 'Чего пока нет' },
  {
    kind: 'ul',
    items: [
      'Запуск был на одной машине. Вся арифметика — обычные числа IEEE двойной точности, и zlib не используется, так что на других машинах байты должны совпасть. Первой проверкой этого станет запуск в CI.',
      'Нет кернинга и хинтинга; текст переносится по словам, по ширине глифов.',
      'Шрифты — латинские подмножества: русский заголовок вышел бы вопросительными знаками, поэтому карточки только английские.',
      'Покрыты только 27 инструментов-виджетов (`public/widgets/<id>/`). У карточек уроков, плееров и записей остаются свои генераторы.',
    ],
  },
]
