const API_URL="https://salujadivyam-spoilfree.hf.space/predict"
const BLUR_CLASS="spoilfree-blur"
const max_parallel=4, max_per_page=150
let enabled=false, strict=false, series=[], seen=new WeakMap()
let gen=0, active=0, sent=0, pending=0, scan_timer, count_timer
const cache=new Map(), queue=[], wired=new WeakSet()

chrome.storage.local.get({enabled:true, strict:false}, d => {
  enabled=d.enabled; strict=d.strict
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
    for (const e of document.body.querySelectorAll("*")) {
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
  return found.filter(el => el.innerText && el.innerText.length>40 && el.innerText.length<500
    && !el.closest("nav, header, ."+BLUR_CLASS))
}

function scan() {
  if (!enabled || !series.length) return
  const ctx=SeriesMatcher.findMentions(document.title+" "+location.pathname, series)   // show named by the page
  for (const el of candidates()) {
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
  while (active<max_parallel && queue.length && sent<max_per_page) {
    active++
    classify(queue.shift()).finally(() => { active--; pump() })
  }
}

async function predict(text) {
  if (cache.has(text)) return cache.get(text)
  sent++
  const ctl=new AbortController(), t=setTimeout(() => ctl.abort(), 8000)
  try {
    const r=await fetch(API_URL, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({text}), signal:ctl.signal})
    const d=r.ok ? await r.json() : null
    if (d) cache.set(text, d)
    return d
  } catch { return null }
  finally { clearTimeout(t) }
}

async function classify(job) {
  if (job.gen!==gen) return
  const r=await predict(job.text)
  if (job.gen!==gen) return   // watchlist changed while waiting
  const name=shouldBlur(r, job)
  if (name && enabled && job.el.isConnected) blur(job.el, name)
}

function shouldBlur(r, job) {
  if (!r) return null
  const ref=EpisodeParser.parse(job.text) || (job.ctx ? EpisodeParser.parse(document.title) : null)
  for (const sh of job.shows) {
    let need
    if (sh.movie) need=0.7   // movies have no episodes
    else {
      const st=EpisodeParser.status(ref, sh.progress || {s:0, e:0})
      if (st==="seen") continue
      need=st==="beyond" ? 0.6 : (strict ? (job.via ? 0.93 : 0.9) : 2)   // not strict: no episode named, no blur
    }
    if (r.confidence>=need) return sh.title
  }
  return null
}

function blur(el, name) {
  el.classList.add(BLUR_CLASS)
  el.title="Spoiler for "+name+". Click to show or hide."
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
    chrome.storage.local.get({spoilerCount:0}, d => chrome.storage.local.set({spoilerCount:d.spoilerCount+n}))
  }, 500)
}

function unblurAll() {
  gen++; queue.length=0
  document.querySelectorAll("[data-sf]").forEach(e => { e.classList.remove(BLUR_CLASS); delete e.dataset.sf })
}

chrome.storage.onChanged.addListener(ch => {
  if (ch.enabled) {
    enabled=ch.enabled.newValue
    if (enabled) start(); else unblurAll()
  }
  if (ch.strict) strict=ch.strict.newValue
  if ((ch.strict || ch[WatchlistManager.STORAGE_KEY]) && enabled) { unblurAll(); start() }   // new rules, rescan
})

new MutationObserver(() => {
  clearTimeout(scan_timer)
  scan_timer=setTimeout(scan, 500)
}).observe(document.body, {childList:true, subtree:true})
