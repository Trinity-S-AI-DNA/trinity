import type { Block } from '../types'

// Every course free (gHashTag/t27 course-access.t27 VERSION 3, t27#10799), the whole course on one
// page and the course deck (trinity#1703). The figure was drawn from the compiled step_of of
// VERSION 2 (trinity 8e535bc9 courseAccess.logic.ts) and VERSION 3 (this PR's), for rungs 0 to 10.

export const body: Block[] = [
  {
    "kind": "p",
    "text": "Every course on t27.ai is free now, for every reader, however many he opens. Until today the ladder gave any three courses free and asked for the club from the fourth on. The owner, on 2026-10-19: our task is to grow the language. A course that asks for the club is a reader the language does not get."
  },
  {
    "kind": "h",
    "text": "One function, changed in the spec first"
  },
  {
    "kind": "p",
    "text": "Which course is free is not decided on the site. It is step_of in gHashTag/t27 specs/automation/course-access.t27, and since VERSION 3 (t27#10799) it returns FREE for every rung. The site vendors that spec byte for byte and runs its fn bodies compiled to WebAssembly (courseAccess.logic.ts, spec-sha256 edd87ade). The figure is drawn by those compiled bodies: step_of for the first 11 courses a reader opens, 0 for free and 2 for the club."
  },
  {
    "kind": "figure",
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 688 170\" font-family=\"JetBrains Mono, monospace\" role=\"img\"><title>step_of(0..10): v2 and v3 of course-access.t27</title><rect width=\"688\" height=\"170\" fill=\"#000\"/><text x=\"76\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">1</text><text x=\"134\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">2</text><text x=\"192\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">3</text><text x=\"250\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">4</text><text x=\"308\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">5</text><text x=\"366\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">6</text><text x=\"424\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">7</text><text x=\"482\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">8</text><text x=\"540\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">9</text><text x=\"598\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">10</text><text x=\"656\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">11</text><text x=\"0\" y=\"65\" font-size=\"16\" fill=\"#fff\">v2</text><rect x=\"50\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"76\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"108\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"134\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"166\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"192\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"224\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"250\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"282\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"308\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"340\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"366\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"398\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"424\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"456\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"482\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"514\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"540\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"572\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"598\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"630\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"656\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><text x=\"0\" y=\"137\" font-size=\"16\" fill=\"#fff\">v3</text><rect x=\"50\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"76\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"108\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"134\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"166\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"192\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"224\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"250\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"282\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"308\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"340\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"366\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"398\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"424\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"456\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"482\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"514\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"540\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"572\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"598\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"630\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"656\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text></svg>",
    "caption": "step_of from the compiled course-access.t27: VERSION 2 (top) gives 0 to the first three courses and 2 (the club) from the fourth; VERSION 3 (bottom) gives 0 to all of them."
  },
  {
    "kind": "p",
    "text": "One trap was left for the hosts, and the spec says so: a reader's browser keeps the step each course was opened on, and stays_open closes a course stored on the club rung when the club ends. So the site no longer reads the stored step. It asks step_of for the course's rung again, and a test with the opposite rule (read the stored step) fails. The lock, the gate and the rouble and TON forms are gone from the course pages."
  },
  {
    "kind": "h",
    "text": "The whole course on one page"
  },
  {
    "kind": "p",
    "text": "Each course now has a page with all 27 lessons on it: the goal, the text, the task and the lesson's own widget, under one link with its own preview card. The basics are at t27.ai/learn/all/, every other course at t27.ai/learn/<course>/all/, and the Russian ones under ru/. It is a real page, not a #/ route, so X, Telegram and LinkedIn show the course card and not the home page."
  },
  {
    "kind": "p",
    "text": "27 live widgets would sink a phone, so a widget frame mounts only when its lesson comes within 600 px of the screen, at most 3 are live at once, and a frame more than 2000 px away is taken down. Each frame's height is reserved before it loads. Scrolling the neural networks page in Chromium at 390 px, the count of live frames never went above 3, and the layout shift was 0. On a phone the contents sit under the thumb with a dot per lesson; from 1440 px they stand in a column beside the lessons."
  },
  {
    "kind": "h",
    "text": "A widget of widgets"
  },
  {
    "kind": "p",
    "text": "The same course is also one embeddable widget, the course deck at t27.ai/widgets/course-deck/: nine module tabs, three lesson cards each, every card running its lesson's widget, mounted the same lazy way. One widget serves every course with ?course=<id>; eleven copies would differ only in their data. It sits in the widget gallery before the arena."
  },
  {
    "kind": "h",
    "text": "TRI CLAW at the foot of every course page"
  },
  {
    "kind": "ul",
    "items": [
      "Free with your own key: add an API key (NVIDIA or z.ai today) and the agent runs on it; add more keys any time. The button opens the app's key screen inside Telegram.",
      "We do it for you: the club in the bot, which shows the price before you pay.",
      "On GitHub: TRI CLAW is also a GitHub App, built to check the .t27 specs a pull request changes. It is not open to other repositories yet, so the button opens the TRI CLAW post; one constant in the spec switches it to the App's page."
    ]
  },
  {
    "kind": "h",
    "text": "The layout is a spec too"
  },
  {
    "kind": "p",
    "text": "The layout numbers this change decides are in specs/view/course-view.t27 with tests: the column width, the breakpoints, the frame budget and when the pool looks again, the 44 px finger, the 2 px focus ring. Type sizes, paddings and colours stay in the stylesheets; contrast was measured on the rendered pages, at 5.92:1 or more. The column width was measured, not guessed: an average character of lesson text is 0.43 em in English and 0.53 em in Russian, so a 70 character line is 30.1 em and 37.2 em. A 68ch column would have been 95 characters wide, because a ch is a zero and Outfit's zero is 0.66 em. Text and widget stand side by side from 1150 px; below that the widget comes right after the task it answers."
  },
  {
    "kind": "h",
    "text": "What this does not do"
  },
  {
    "kind": "ul",
    "items": [
      "The key screen the free path opens is added to the app in gHashTag/999-multibots-telegraf at the same time; until it ships, the button opens the bot.",
      "The site no longer calls the render's checkout; the club is paid in the bot.",
      "A static lesson page still scrolls 25 px sideways on a 390 px phone in Chromium, as it did before this change; what widens it is not found yet."
    ]
  }
]

export const ruBody: Block[] = [
  {
    "kind": "p",
    "text": "Все курсы на t27.ai теперь бесплатные, для каждого читателя и сколько бы курсов он ни открыл. До сегодня лестница давала бесплатно любые три курса, а с четвёртого просила клуб. Владелец, 2026-10-19: наша задача — раскачать язык. Курс, который просит клуб, — это читатель, которого язык не получает."
  },
  {
    "kind": "h",
    "text": "Одна функция, и сначала в спеке"
  },
  {
    "kind": "p",
    "text": "Какой курс бесплатный, решает не сайт. Это step_of в gHashTag/t27 specs/automation/course-access.t27, и с VERSION 3 (t27#10799) она возвращает FREE на каждой ступени. Сайт везёт эту спеку байт в байт и исполняет её тела функций, собранные в WebAssembly (courseAccess.logic.ts, spec-sha256 edd87ade). Рисунок нарисован этими собранными телами: step_of для первых 11 курсов, которые открывает читатель, 0 — бесплатно, 2 — клуб."
  },
  {
    "kind": "figure",
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 688 170\" font-family=\"JetBrains Mono, monospace\" role=\"img\"><title>step_of(0..10): v2 and v3 of course-access.t27</title><rect width=\"688\" height=\"170\" fill=\"#000\"/><text x=\"76\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">1</text><text x=\"134\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">2</text><text x=\"192\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">3</text><text x=\"250\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">4</text><text x=\"308\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">5</text><text x=\"366\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">6</text><text x=\"424\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">7</text><text x=\"482\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">8</text><text x=\"540\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">9</text><text x=\"598\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">10</text><text x=\"656\" y=\"18\" font-size=\"13\" text-anchor=\"middle\" fill=\"#a6a6a6\">11</text><text x=\"0\" y=\"65\" font-size=\"16\" fill=\"#fff\">v2</text><rect x=\"50\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"76\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"108\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"134\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"166\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"192\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"224\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"250\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"282\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"308\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"340\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"366\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"398\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"424\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"456\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"482\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"514\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"540\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"572\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"598\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><rect x=\"630\" y=\"32\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#000\" stroke=\"#fff\"/><text x=\"656\" y=\"65\" font-size=\"16\" text-anchor=\"middle\" fill=\"#fff\">2</text><text x=\"0\" y=\"137\" font-size=\"16\" fill=\"#fff\">v3</text><rect x=\"50\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"76\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"108\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"134\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"166\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"192\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"224\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"250\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"282\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"308\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"340\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"366\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"398\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"424\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"456\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"482\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"514\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"540\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"572\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"598\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text><rect x=\"630\" y=\"104\" width=\"52\" height=\"52\" rx=\"6\" fill=\"#fff\" stroke=\"#fff\"/><text x=\"656\" y=\"137\" font-size=\"16\" text-anchor=\"middle\" fill=\"#000\">0</text></svg>",
    "caption": "step_of из собранной course-access.t27: VERSION 2 (сверху) даёт 0 первым трём курсам и 2 (клуб) с четвёртого; VERSION 3 (снизу) даёт 0 всем."
  },
  {
    "kind": "p",
    "text": "Одна ловушка осталась хостам, и спека её называет: браузер читателя хранит ступень, на которой открыт каждый курс, а stays_open закрывает курс, сохранённый на ступени клуба, когда клуб кончается. Поэтому сайт больше не читает сохранённую ступень. Он заново спрашивает step_of для ступени курса, а тест с обратным правилом (читать сохранённую ступень) падает. Замок, ворота и формы оплаты в рублях и TON убраны со страниц курсов."
  },
  {
    "kind": "h",
    "text": "Весь курс на одной странице"
  },
  {
    "kind": "p",
    "text": "У каждого курса теперь есть страница со всеми 27 уроками: цель, текст, задание и собственный виджет урока, под одной ссылкой со своей карточкой превью. Основы — на t27.ai/learn/all/, каждый другой курс — на t27.ai/learn/<курс>/all/, русские — под ru/. Это настоящая страница, а не маршрут #/, поэтому X, Telegram и LinkedIn показывают карточку курса, а не главную."
  },
  {
    "kind": "p",
    "text": "27 живых виджетов утопили бы телефон, поэтому рамка виджета загружается, только когда её урок подходит к экрану ближе чем на 600 px, живых одновременно не больше 3, а рамка дальше 2000 px снимается. Высота каждой рамки занята до загрузки. При прокрутке страницы курса о нейросетях в Chromium на 390 px живых рамок ни разу не было больше 3, а сдвиг вёрстки был 0. На телефоне содержание лежит под большим пальцем, с точкой на каждый урок; с 1440 px оно стоит колонкой рядом с уроками."
  },
  {
    "kind": "h",
    "text": "Виджет из виджетов"
  },
  {
    "kind": "p",
    "text": "Тот же курс — ещё и один встраиваемый виджет, колода курса на t27.ai/widgets/course-deck/: девять вкладок модулей, по три карточки уроков, в каждой работает виджет урока, загружаемый так же лениво. Один виджет служит каждому курсу через ?course=<id>; одиннадцать копий отличались бы только данными. Он стоит в галерее виджетов перед ареной."
  },
  {
    "kind": "h",
    "text": "TRI CLAW внизу каждой страницы курса"
  },
  {
    "kind": "ul",
    "items": [
      "Бесплатно со своим ключом: добавьте API-ключ (сегодня NVIDIA или z.ai), и агент работает на нём; ещё ключи — в любой момент. Кнопка открывает экран ключей приложения внутри Telegram.",
      "Сделаем за вас: клуб в боте, который показывает цену до оплаты.",
      "На GitHub: TRI CLAW — ещё и GitHub-приложение, созданное, чтобы проверять спеки .t27, которые меняет пулл-реквест. Для других репозиториев оно пока не открыто, поэтому кнопка открывает пост о TRI CLAW; одна константа в спеке переключит её на страницу приложения."
    ]
  },
  {
    "kind": "h",
    "text": "Вёрстка — тоже спека"
  },
  {
    "kind": "p",
    "text": "Числа вёрстки, которые решает эта правка, лежат в specs/view/course-view.t27 с тестами: ширина колонки, точки перелома, бюджет рамок и когда пул смотрит заново, палец 44 px, рамка фокуса 2 px. Размеры шрифта, отступы и цвета остаются в таблицах стилей; контраст измерен на отрисованных страницах — 5.92:1 и выше. Ширину колонки измерили, а не угадали: средний знак текста урока — 0.43 em по-английски и 0.53 em по-русски, поэтому строка в 70 знаков — это 30.1 em и 37.2 em. Колонка 68ch была бы шириной 95 знаков: ch — это ноль, а ноль у Outfit — 0.66 em. Текст и виджет стоят рядом с 1150 px; ниже виджет идёт сразу после задания, на которое отвечает."
  },
  {
    "kind": "h",
    "text": "Чего это не делает"
  },
  {
    "kind": "ul",
    "items": [
      "Экран ключей, который открывает бесплатный путь, добавляется в приложение в gHashTag/999-multibots-telegraf одновременно с этим; пока он не вышел, кнопка открывает бота.",
      "Сайт больше не зовёт оплату рендера; клуб оплачивается в боте.",
      "Статическая страница урока по-прежнему уезжает вбок на 25 px на телефоне 390 px в Chromium, как и до этой правки; что её расширяет, пока не найдено."
    ]
  }
]
