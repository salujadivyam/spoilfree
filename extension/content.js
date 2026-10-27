const BLUR_CLASS="spoilfree-blur"
const debug=true   // true logs every decision to the console
const max_parallel=4, max_per_window=150, window_ms=600000   // 150 api calls per 10 minutes per tab
const max_queue=200, max_cache=500, max_scan_nodes=4000
let enabled=false, strict=false, series=[], seen=new WeakMap()
let gen=0, active=0, sent=0, pending=0, scan_timer, count_timer, window_start=Date.now()
const cache=new Map(), queue=[], wired=new WeakSet()

// pages we never touch: not http(s), login / checkout style paths, or a visible password box
const SENSITIVE_PATH=/(^|\/)(log-?in|sign-?in|checkout|payments?|billing|password)(\/|$)/i
function sensitive_page() {
  if (!/^https?:$/.test(location.protocol)) return true
  if (SENSITIVE_PATH.test(location.pathname)) return true
  for (const i of document.querySelectorAll("input[type='password']")) if (i.offsetParent!==null) return true
  return false
}

// what leaves the browser: no links, emails or long digit runs (phone, card, id numbers)
function scrub(t) {
  return t.replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, " ")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, 500)
}

function budget_ok() {
  if (Date.now()-window_start>window_ms) { window_start=Date.now(); sent=0 }
  return sent<max_per_window
}

function remember(k, v) {
  if (cache.size>=max_cache) cache.delete(cache.keys().next().value)   // drop the oldest
  cache.set(k, v)
}

chrome.storage.local.get({enabled:true, strict:false}, d => {
  enabled=!!d.enabled; strict=!!d.strict
  if (enabled) start()
})

async function start() {
  gen++; queue.length=0   // drop jobs made under the old watchlist
  series=SeriesMatcher.compile(await WatchlistManager.getActiveSeries())
  seen=new WeakMap()
  scan()
}

const on_google=/(^|\.)google\./.test(location.hostname)   // ai overview has no p/li, classes change often

function candidates() {
  const skip="script, style, noscript, textarea, input, svg, form, nav, header, [role='listbox']"
  let found
  if (on_google) {
    const out=new Set()
    let visited=0
    for (const e of document.body.querySelectorAll("*")) {
      if (++visited>max_scan_nodes) break   // a huge or hostile page can't make us walk forever
      if (e.matches(skip)) continue
      const n=e.textContent.length
      if (n<40 || n>500) continue
      if ([...e.children].some(c => c.textContent.length>=40)) continue   // smallest element holding the text
      let b=e
      while (b.parentElement && getComputedStyle(b).display.startsWith("inline")) b=b.parentElement   // climb out of span, a, b
      out.add(b)
    }
    found=[...out]
  } else {
    found=[...document.querySelectorAll("p, li, h1, h2, h3, div[data-click-id='text'], div[data-testid='comment']")]
      .filter(el => !el.querySelector("p, li, h1, h2, h3"))   // leaf only
  }
  return found.filter(el => !el.closest("[contenteditable], input, textarea, [role='textbox']") && el.innerText && el.innerText.length>40 && el.innerText.length<500
    && !el.closest("nav, header, ."+BLUR_CLASS))
}

function scan() {
  if (!enabled || !series.length || !document.body || sensitive_page()) return
  const ctx=SeriesMatcher.findMentions(document.title+" "+location.pathname, series)   // show named by the page
  for (const el of candidates()) {
    if (queue.length>=max_queue) break   // a page that keeps rewriting itself can't grow the queue forever
    const text=el.innerText.trim()
    if (seen.get(el)===text) continue
    seen.set(el, text)
    if (/\bno spoilers?\b|spoiler[- ]free/i.test(text)) continue
    let shows=SeriesMatcher.findMentions(text, series), via=false
    if (!shows.length && ctx.length) { shows=ctx; via=true }
    if (shows.length) queue.push({el, text, shows, via, ctx:ctx.length>0, gen})
  }
  pump()
}

function pump() {
  while (active<max_parallel && queue.length && budget_ok()) {
    active++
    classify(queue.shift()).finally(() => { active--; pump() })
  }
}

const ask=text => new Promise(res => {
  try {
    if (!chrome.runtime?.id) return res(null)   // extension was reloaded or updated, this script is orphaned
    chrome.runtime.sendMessage({type:"predict", text}, r => { void chrome.runtime.lastError; res(r) })
  } catch { res(null) }
})

async function predict(text) {
  const clean=scrub(text)
  if (clean.length<20) return null   // nothing meaningful left to classify
  if (cache.has(clean)) return cache.get(clean)
  if (!budget_ok()) return null
  sent++
  const d=await ask(clean)
  if (d && typeof d.confidence==="number" && d.confidence>=0 && d.confidence<=1) {   // trust nothing the api sends back
    const r={confidence:d.confidence}   // keep only the one field we use
    remember(clean, r)
    return r
  }
  if (debug && d) console.log("[spoilfree] api status", d.status)   // 429 = rate limit
  return null
}

async function classify(job) {
  if (job.gen!==gen) return
  const r=await predict(job.text)
  if (job.gen!==gen) return   // watchlist changed while waiting
  const name=shouldBlur(r, job)
  if (name && enabled && job.el.isConnected) blur(job.el)
}

function shouldBlur(r, job) {
  if (!r) return null
  const ref=EpisodeParser.parse(job.text) || (job.ctx ? EpisodeParser.parse(document.title) : null)
  for (const sh of job.shows) {
    let need
    if (sh.movie) need=0.6   // movies have no episodes
    else {
      const st=EpisodeParser.status(ref, sh.progress || {s:0, e:0})
      if (st==="seen") continue
      need=st==="beyond" ? 0.6 : (strict ? (job.via ? 0.93 : 0.9) : 2)   // not strict: no episode named, no blur
    }
    if (debug) console.log("[spoilfree]", sh.title, "conf", r.confidence, "need", need, job.via ? "(page)" : "", job.text.slice(0,40))
    if (r.confidence>=need) return sh.title
  }
  return null
}

function blur(el) {
  el.classList.add(BLUR_CLASS)
  el.title="Possible spoiler. Click to show or hide."   // never put the show name here, any script on the page can read attributes
  if (!wired.has(el)) { wired.add(el); el.addEventListener("click", e => {
    if (!el.dataset.sf) return   // no longer ours
    if (!el.classList.contains(BLUR_CLASS) && e.target.closest("a")) return   // revealed text keeps working links
    e.preventDefault(); e.stopPropagation()
    el.classList.toggle(BLUR_CLASS)
  }, {capture:true}) }   // wire once, flag decides if it acts
  el.dataset.sf="1"
  pending++
  clearTimeout(count_timer)
  count_timer=setTimeout(() => {
    const n=pending; pending=0
    if (!chrome.runtime?.id) return
    chrome.storage.local.get({spoilerCount:0}, d => chrome.storage.local.set({spoilerCount:(Number(d.spoilerCount)||0)+n}))
  }, 500)
}

function unblurAll() {
  gen++; queue.length=0
  document.querySelectorAll("[data-sf]").forEach(e => { e.classList.remove(BLUR_CLASS); delete e.dataset.sf })
}

chrome.storage.onChanged.addListener((ch, area) => {
  if (area!=="local") return
  if (ch.enabled) {
    enabled=!!ch.enabled.newValue
    if (enabled) start(); else unblurAll()
  }
  if (ch.strict) strict=!!ch.strict.newValue
  if ((ch.strict || ch[WatchlistManager.STORAGE_KEY]) && enabled) { unblurAll(); start() }   // new rules, rescan
})

if (document.body) new MutationObserver(() => {
  clearTimeout(scan_timer)
  scan_timer=setTimeout(scan, 500)
}).observe(document.body, {childList:true, subtree:true})
