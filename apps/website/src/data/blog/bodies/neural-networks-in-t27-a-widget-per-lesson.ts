import type { Block } from '../types'

// Course 10, neural-networks: 27 widgets, each running the fn bodies of a gHashTag/t27 specs/ml spec
// compiled to wasm (999 scripts/t27-logic.mjs, then scripts/widget-logic.mjs). The figure was drawn
// from the compiled mlp.t27 the nn-xor widget runs: xor(e, 1) every 25 epochs and xor(2000, 2..5).

export const body: Block[] = [
  {
    "kind": "p",
    "text": "Course 10 of t27.ai is out: Neural networks in t27, from one neuron to a transformer block. The agents of this project think with neural networks, and the parts those networks are made of already live in gHashTag/t27 as specs with numeric tests: activations, layers, losses, optimizers, recurrent cells, attention, a transformer block. The course opens them one by one. It has 27 lessons in 9 modules, each lesson opens with a question a curious person would ask, and its widget answers it with numbers that are the spec's own fn bodies, compiled to WebAssembly and run in your browser."
  },
  {
    "kind": "h",
    "text": "Nine modules, twenty-seven widgets"
  },
  {
    "kind": "table",
    "head": [
      "Module",
      "Widgets",
      "Specs in specs/ml"
    ],
    "rows": [
      [
        "One neuron",
        "nn-relu, nn-sigmoid, nn-tanh",
        "relu_activation, sigmoid_activation, tanh_activation"
      ],
      [
        "New bends",
        "nn-gelu, nn-silu, nn-elu",
        "gelu_activation, silu_swish_activation, elu_activation"
      ],
      [
        "A layer",
        "nn-softmax, nn-embedding, nn-dropout",
        "softmax, embedding_layer, dropout_layer"
      ],
      [
        "Pictures",
        "nn-conv, nn-maxpool, nn-batchnorm",
        "avgpool2d_layer, maxpool2d_layer, batchnorm_layer"
      ],
      [
        "The error",
        "nn-mse, nn-bce, nn-huber",
        "mse_loss, binary_crossentropy_loss, huber_loss"
      ],
      [
        "Downhill",
        "nn-sgd, nn-rmsprop, nn-adam",
        "sgd, rmsprop, adam"
      ],
      [
        "Learning",
        "nn-backprop, nn-xor, nn-lamb",
        "dense_layer, mlp, lamb"
      ],
      [
        "Memory and attention",
        "nn-rnn, nn-lstm, nn-attention",
        "rnn_cell, lstm_single, attention_mechanism"
      ],
      [
        "The transformer and the reward",
        "nn-positions, nn-encoder, nn-ppo",
        "positional_encoding, encoder_block, ppo_clip_loss"
      ]
    ]
  },
  {
    "kind": "p",
    "text": "The pictures are what the numbers look like: activation curves you drag along with their slopes, softmax bars that sharpen as you cool the temperature, pooling windows as heat-maps, a weight walking down a bowl under SGD, RMSProp and Adam, two heads of attention as grids, and positions as the hands of four clocks."
  },
  {
    "kind": "h",
    "text": "A network that learns in your browser"
  },
  {
    "kind": "p",
    "text": "Lesson 20 trains a network. mlp.t27 holds a 2-8-1 network of ReLUs and a test that it learns XOR in 2000 epochs at lr 0.05. Compiled to wasm, the same xor(epochs, which) fn runs in the widget, from scratch for every point of its loss curve. The loss falls from 0.8896 in epoch 1 to 1.8e-13, and the four answers come out within 4e-7 of 0, 1, 1 and 0. The figure below is drawn by that compiled fn."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 720 270' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='XOR training loss falls from 0.8896 to 1.8e-13 in 2000 epochs; outputs 0, 1, 1, 0' style='width:100%;height:auto;font-family:inherit'><line x1='64' x2='530' y1='20.0' y2='20.0' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='24.0' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e0</text><line x1='64' x2='530' y1='49.4' y2='49.4' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='53.4' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-2</text><line x1='64' x2='530' y1='78.9' y2='78.9' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='82.9' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-4</text><line x1='64' x2='530' y1='108.3' y2='108.3' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='112.3' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-6</text><line x1='64' x2='530' y1='137.7' y2='137.7' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='141.7' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-8</text><line x1='64' x2='530' y1='167.1' y2='167.1' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='171.1' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-10</text><line x1='64' x2='530' y1='196.6' y2='196.6' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='200.6' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-12</text><line x1='64' x2='530' y1='226.0' y2='226.0' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='230.0' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-14</text><text x='64.0' y='242' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.7'>0</text><text x='180.5' y='242' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.7'>500</text><text x='297.0' y='242' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.7'>1000</text><text x='413.5' y='242' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.7'>1500</text><text x='530.0' y='242' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.7'>2000</text><text x='297.0' y='264' font-size='12' text-anchor='middle' fill='currentColor' fill-opacity='0.8'>epochs</text><text x='14' y='123.0' font-size='12' text-anchor='middle' fill='currentColor' fill-opacity='0.8' transform='rotate(-90 14 123.0)'>loss (log)</text><path d='M64.2,20.7L69.8,30.0L75.7,38.1L81.5,48.3L87.3,57.5L93.1,66.2L98.9,74.8L104.8,83.4L110.6,92.0L116.4,100.5L122.3,109.1L128.1,117.8L133.9,126.4L139.7,135.1L145.6,143.7L151.4,152.3L157.2,161.1L163.0,169.7L168.9,178.7L174.7,187.4L180.5,192.9L186.3,194.9L192.2,196.6L198.0,198.0L203.8,199.2L209.6,200.8L215.5,200.8L221.3,202.1L227.1,202.5L232.9,202.5L238.8,203.0L244.6,204.5L250.4,204.5L256.2,204.9L262.0,204.4L267.9,204.9L273.7,204.7L279.5,204.9L285.4,206.2L291.2,205.2L297.0,206.2L302.8,206.6L308.6,206.7L314.5,206.8L320.3,205.5L326.1,206.8L331.9,206.8L337.8,206.9L343.6,206.9L349.4,207.3L355.3,207.2L361.1,207.2L366.9,207.3L372.7,207.4L378.6,207.5L384.4,207.0L390.2,207.5L396.0,207.5L401.8,207.5L407.7,206.9L413.5,207.5L419.3,207.5L425.2,207.5L431.0,206.9L436.8,207.5L442.6,207.5L448.4,207.5L454.3,207.0L460.1,207.5L465.9,207.5L471.8,207.4L477.6,208.4L483.4,207.7L489.2,207.1L495.1,207.6L500.9,207.1L506.7,207.6L512.5,207.1L518.3,207.6L524.2,207.1L530.0,207.6' fill='none' stroke='#d4af37' stroke-width='2.5'/><circle cx='64.2' cy='20.7' r='4' fill='#d4af37'/><text x='72.2' y='24.7' font-size='11' fill='currentColor'>0.8896</text><circle cx='530.0' cy='207.6' r='4' fill='#d4af37'/><text x='524.0' y='199.6' font-size='11' text-anchor='end' fill='currentColor'>1.8e-13</text><text x='626' y='40' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.8'>after 2000 epochs</text><rect x='570' y='50' width='52' height='52' rx='6' fill='#d4af37' fill-opacity='0.08' stroke='currentColor' stroke-opacity='0.3'/><text x='596' y='74' font-size='11' text-anchor='middle' fill='currentColor'>0 0</text><text x='596' y='89' font-size='12' font-weight='700' text-anchor='middle' fill='currentColor'>0.000</text><rect x='626' y='50' width='52' height='52' rx='6' fill='#d4af37' fill-opacity='0.88' stroke='currentColor' stroke-opacity='0.3'/><text x='652' y='74' font-size='11' text-anchor='middle' fill='currentColor'>0 1</text><text x='652' y='89' font-size='12' font-weight='700' text-anchor='middle' fill='currentColor'>1.000</text><rect x='570' y='106' width='52' height='52' rx='6' fill='#d4af37' fill-opacity='0.88' stroke='currentColor' stroke-opacity='0.3'/><text x='596' y='130' font-size='11' text-anchor='middle' fill='currentColor'>1 0</text><text x='596' y='145' font-size='12' font-weight='700' text-anchor='middle' fill='currentColor'>1.000</text><rect x='626' y='106' width='52' height='52' rx='6' fill='#d4af37' fill-opacity='0.08' stroke='currentColor' stroke-opacity='0.3'/><text x='652' y='130' font-size='11' text-anchor='middle' fill='currentColor'>1 1</text><text x='652' y='145' font-size='12' font-weight='700' text-anchor='middle' fill='currentColor'>0.000</text></svg>",
    "caption": "The XOR training loss of the 2-8-1 network in mlp.t27, per epoch on a log scale, and its four outputs after 2000 epochs, computed by the compiled spec the nn-xor widget runs. The loss falls from 0.8896 to 1.8e-13 and flattens near the precision of f32 after about 600 epochs."
  },
  {
    "kind": "h",
    "text": "How the specs got into the browser"
  },
  {
    "kind": "p",
    "text": "No widget copies a formula. scripts/t27-logic.mjs of 999-multibots-telegraf runs t27c gen on a spec, builds the Zig with Zig 0.16 for wasm32 and writes a small module with one function per spec fn; scripts/widget-logic.mjs of the site puts it beside the widget with a byte-identical copy of the spec and stops the build when the two drift apart. The specs/ml fns take an index as usize, which t27-logic.mjs learned to lower in 999#4017; after that, 27 specs gave the 27 widgets their logic without a line rewritten. The site's spec reader learned to read an epsilon written as 1e-8 in the same change."
  },
  {
    "kind": "h",
    "text": "What it does not show"
  },
  {
    "kind": "ul",
    "items": [
      "Lesson 10 is average pooling over 2 x 2 windows, not a convolution: the sliding conv2d spec, t27#10612, is still open, and the lesson says so.",
      "The XOR grid shows the four inputs the spec exposes, not a decision region over the plane: the spec has no fn for a point between the corners.",
      "The fixtures are the specs' own small ones, 3 inputs, 4 tokens, 3 positions: nothing here was trained on real data."
    ]
  },
  {
    "kind": "h",
    "text": "Try it"
  },
  {
    "kind": "ul",
    "items": [
      "Course: t27.ai/learn/neural-networks/",
      "t27.ai/widgets/nn-softmax/, t27.ai/widgets/nn-xor/, t27.ai/widgets/nn-attention/, t27.ai/widgets/nn-positions/",
      "Specs: gHashTag/t27 specs/ml/"
    ]
  }
]

export const ruBody: Block[] = [
  {
    "kind": "p",
    "text": "На t27.ai вышел курс 10: Нейросети на t27, от одного нейрона до блока трансформера. Агенты этого проекта думают нейросетями, а части, из которых эти сети собраны, уже лежат в gHashTag/t27 спеками с числовыми тестами: функции активации, слои, функции потерь, оптимизаторы, рекуррентные ячейки, внимание, блок трансформера. Курс открывает их по одной. В нём 27 уроков в 9 модулях, каждый урок начинается с вопроса, который задал бы любопытный человек, и виджет отвечает на него числами, которые вычисляют тела fn самой спеки, скомпилированные в WebAssembly и запущенные в вашем браузере."
  },
  {
    "kind": "h",
    "text": "Девять модулей, двадцать семь виджетов"
  },
  {
    "kind": "table",
    "head": [
      "Модуль",
      "Виджеты",
      "Спеки в specs/ml"
    ],
    "rows": [
      [
        "Один нейрон",
        "nn-relu, nn-sigmoid, nn-tanh",
        "relu_activation, sigmoid_activation, tanh_activation"
      ],
      [
        "Новые изгибы",
        "nn-gelu, nn-silu, nn-elu",
        "gelu_activation, silu_swish_activation, elu_activation"
      ],
      [
        "Слой",
        "nn-softmax, nn-embedding, nn-dropout",
        "softmax, embedding_layer, dropout_layer"
      ],
      [
        "Картинки",
        "nn-conv, nn-maxpool, nn-batchnorm",
        "avgpool2d_layer, maxpool2d_layer, batchnorm_layer"
      ],
      [
        "Ошибка",
        "nn-mse, nn-bce, nn-huber",
        "mse_loss, binary_crossentropy_loss, huber_loss"
      ],
      [
        "Под гору",
        "nn-sgd, nn-rmsprop, nn-adam",
        "sgd, rmsprop, adam"
      ],
      [
        "Обучение",
        "nn-backprop, nn-xor, nn-lamb",
        "dense_layer, mlp, lamb"
      ],
      [
        "Память и внимание",
        "nn-rnn, nn-lstm, nn-attention",
        "rnn_cell, lstm_single, attention_mechanism"
      ],
      [
        "Трансформер и награда",
        "nn-positions, nn-encoder, nn-ppo",
        "positional_encoding, encoder_block, ppo_clip_loss"
      ]
    ]
  },
  {
    "kind": "p",
    "text": "Картинки показывают, как выглядят числа: кривые активации, по которым можно вести курсор, вместе с наклоном, столбики softmax, которые заостряются, когда охлаждаешь температуру, окна пулинга как тепловые карты, вес, спускающийся в чашу под SGD, RMSProp и Adam, две головы внимания как сетки и позиции как стрелки четырёх часов."
  },
  {
    "kind": "h",
    "text": "Сеть, которая учится в браузере"
  },
  {
    "kind": "p",
    "text": "Урок 20 обучает сеть. mlp.t27 хранит сеть 2-8-1 из ReLU и тест, что она выучивает XOR за 2000 эпох при lr 0.05. Собранная в wasm, та же fn xor(epochs, which) работает в виджете, заново для каждой точки кривой потерь. Потеря падает с 0.8896 в эпохе 1 до 1.8e-13, а четыре ответа выходят в пределах 4e-7 от 0, 1, 1 и 0. Рисунок ниже нарисован этой собранной fn."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 720 270' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='Потеря обучения XOR падает с 0.8896 до 1.8e-13 за 2000 эпох; выходы 0, 1, 1, 0' style='width:100%;height:auto;font-family:inherit'><line x1='64' x2='530' y1='20.0' y2='20.0' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='24.0' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e0</text><line x1='64' x2='530' y1='49.4' y2='49.4' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='53.4' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-2</text><line x1='64' x2='530' y1='78.9' y2='78.9' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='82.9' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-4</text><line x1='64' x2='530' y1='108.3' y2='108.3' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='112.3' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-6</text><line x1='64' x2='530' y1='137.7' y2='137.7' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='141.7' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-8</text><line x1='64' x2='530' y1='167.1' y2='167.1' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='171.1' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-10</text><line x1='64' x2='530' y1='196.6' y2='196.6' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='200.6' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-12</text><line x1='64' x2='530' y1='226.0' y2='226.0' stroke='currentColor' stroke-opacity='0.12'/><text x='58' y='230.0' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>1e-14</text><text x='64.0' y='242' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.7'>0</text><text x='180.5' y='242' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.7'>500</text><text x='297.0' y='242' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.7'>1000</text><text x='413.5' y='242' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.7'>1500</text><text x='530.0' y='242' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.7'>2000</text><text x='297.0' y='264' font-size='12' text-anchor='middle' fill='currentColor' fill-opacity='0.8'>эпохи</text><text x='14' y='123.0' font-size='12' text-anchor='middle' fill='currentColor' fill-opacity='0.8' transform='rotate(-90 14 123.0)'>потеря (log)</text><path d='M64.2,20.7L69.8,30.0L75.7,38.1L81.5,48.3L87.3,57.5L93.1,66.2L98.9,74.8L104.8,83.4L110.6,92.0L116.4,100.5L122.3,109.1L128.1,117.8L133.9,126.4L139.7,135.1L145.6,143.7L151.4,152.3L157.2,161.1L163.0,169.7L168.9,178.7L174.7,187.4L180.5,192.9L186.3,194.9L192.2,196.6L198.0,198.0L203.8,199.2L209.6,200.8L215.5,200.8L221.3,202.1L227.1,202.5L232.9,202.5L238.8,203.0L244.6,204.5L250.4,204.5L256.2,204.9L262.0,204.4L267.9,204.9L273.7,204.7L279.5,204.9L285.4,206.2L291.2,205.2L297.0,206.2L302.8,206.6L308.6,206.7L314.5,206.8L320.3,205.5L326.1,206.8L331.9,206.8L337.8,206.9L343.6,206.9L349.4,207.3L355.3,207.2L361.1,207.2L366.9,207.3L372.7,207.4L378.6,207.5L384.4,207.0L390.2,207.5L396.0,207.5L401.8,207.5L407.7,206.9L413.5,207.5L419.3,207.5L425.2,207.5L431.0,206.9L436.8,207.5L442.6,207.5L448.4,207.5L454.3,207.0L460.1,207.5L465.9,207.5L471.8,207.4L477.6,208.4L483.4,207.7L489.2,207.1L495.1,207.6L500.9,207.1L506.7,207.6L512.5,207.1L518.3,207.6L524.2,207.1L530.0,207.6' fill='none' stroke='#d4af37' stroke-width='2.5'/><circle cx='64.2' cy='20.7' r='4' fill='#d4af37'/><text x='72.2' y='24.7' font-size='11' fill='currentColor'>0.8896</text><circle cx='530.0' cy='207.6' r='4' fill='#d4af37'/><text x='524.0' y='199.6' font-size='11' text-anchor='end' fill='currentColor'>1.8e-13</text><text x='626' y='40' font-size='11' text-anchor='middle' fill='currentColor' fill-opacity='0.8'>после 2000 эпох</text><rect x='570' y='50' width='52' height='52' rx='6' fill='#d4af37' fill-opacity='0.08' stroke='currentColor' stroke-opacity='0.3'/><text x='596' y='74' font-size='11' text-anchor='middle' fill='currentColor'>0 0</text><text x='596' y='89' font-size='12' font-weight='700' text-anchor='middle' fill='currentColor'>0.000</text><rect x='626' y='50' width='52' height='52' rx='6' fill='#d4af37' fill-opacity='0.88' stroke='currentColor' stroke-opacity='0.3'/><text x='652' y='74' font-size='11' text-anchor='middle' fill='currentColor'>0 1</text><text x='652' y='89' font-size='12' font-weight='700' text-anchor='middle' fill='currentColor'>1.000</text><rect x='570' y='106' width='52' height='52' rx='6' fill='#d4af37' fill-opacity='0.88' stroke='currentColor' stroke-opacity='0.3'/><text x='596' y='130' font-size='11' text-anchor='middle' fill='currentColor'>1 0</text><text x='596' y='145' font-size='12' font-weight='700' text-anchor='middle' fill='currentColor'>1.000</text><rect x='626' y='106' width='52' height='52' rx='6' fill='#d4af37' fill-opacity='0.08' stroke='currentColor' stroke-opacity='0.3'/><text x='652' y='130' font-size='11' text-anchor='middle' fill='currentColor'>1 1</text><text x='652' y='145' font-size='12' font-weight='700' text-anchor='middle' fill='currentColor'>0.000</text></svg>",
    "caption": "Потеря обучения XOR сети 2-8-1 из mlp.t27 по эпохам в логарифмической шкале и четыре её выхода после 2000 эпох, посчитанные собранной спекой, которую исполняет виджет nn-xor. Потеря падает с 0.8896 до 1.8e-13 и выполаживается около точности f32 примерно после 600 эпох."
  },
  {
    "kind": "h",
    "text": "Как спеки попали в браузер"
  },
  {
    "kind": "p",
    "text": "Ни один виджет не копирует формулу. scripts/t27-logic.mjs из 999-multibots-telegraf запускает t27c gen на спеке, собирает Zig через Zig 0.16 под wasm32 и пишет небольшой модуль с одной функцией на каждую fn спеки; scripts/widget-logic.mjs сайта кладёт его рядом с виджетом вместе с побайтной копией спеки и останавливает сборку, если они разошлись. Функции specs/ml принимают индекс как usize, и t27-logic.mjs научился его понижать в 999#4017; после этого 27 спек дали 27 виджетам их логику без единой переписанной строки. Читатель спек на сайте в том же изменении научился читать эпсилон, записанный как 1e-8."
  },
  {
    "kind": "h",
    "text": "Чего это не показывает"
  },
  {
    "kind": "ul",
    "items": [
      "Урок 10 это усредняющий пулинг по окнам 2 x 2, а не свёртка: спека скользящей conv2d, t27#10612, ещё открыта, и урок говорит об этом.",
      "Сетка XOR показывает четыре входа, которые открывает спека, а не область решения на плоскости: у спеки нет fn для точки между углами.",
      "Фикстуры это маленькие фикстуры самих спек, 3 входа, 4 токена, 3 позиции: ничто здесь не обучалось на настоящих данных."
    ]
  },
  {
    "kind": "h",
    "text": "Попробовать"
  },
  {
    "kind": "ul",
    "items": [
      "Курс: t27.ai/learn/neural-networks/",
      "t27.ai/widgets/nn-softmax/, t27.ai/widgets/nn-xor/, t27.ai/widgets/nn-attention/, t27.ai/widgets/nn-positions/",
      "Спеки: gHashTag/t27 specs/ml/"
    ]
  }
]
