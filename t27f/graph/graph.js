// /t27f/graph/: fetch the picked spec and hand its bytes to the shared glue (t27f_graph.js), which does the rest.
import { draw } from './t27f_graph.js'
const $ = (id) => document.getElementById(id), pick = $('spec')
async function go() {
  const path = pick.selectedOptions[0].dataset.path, r = draw($('graph'), path, await (await fetch(`./specs/${pick.value}`)).text())
  $('status').textContent = r.message; $('status').className = r.refused ? 'refused' : ''
}
pick.addEventListener('change', go); go()
