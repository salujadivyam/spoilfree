const $=id=>document.getElementById(id)
const head=$("top"), list=$("list"), count=$("count"), total=$("num")
const MAX_NAME=100

const el=(tag,cls,text)=>{
  const e=document.createElement(tag)
  if(cls)e.className=cls
  if(text!=null)e.textContent=text   // textContent only, show names are user input
  return e
}
const box=(cls,on)=>{
  const c=el("input",cls)
  c.type="checkbox"
  c.checked=!!on
  return c
}

function field(it,k){
  const i=el("input","num")
  i.type="number"; i.min=0; i.max=999
  i.value=it.progress?.[k]??0
  i.addEventListener("change",async()=>{
    const v=Math.max(0,Math.min(999,Math.floor(+i.value||0)))
    i.value=v
    it.progress={s:0,e:0,...it.progress,[k]:v}
    await WatchlistManager.setProgress(it.id,it.progress.s,it.progress.e)
  })
  return i
}

function row(it,sample){
  const li=el("li","row"+(it.done?" done":"")+(sample?" sample":""))

  const on=box("box-chk",it.active)
  on.title="Hide spoilers for this show"
  on.addEventListener("change",()=>WatchlistManager.setActive(it.id,on.checked))

  const title=el("span","title",it.title)
  title.title=it.title

  const x=el("button","x","X")
  x.type="button"; x.title="Remove"
  x.addEventListener("click",async()=>{
    await WatchlistManager.removeSeries(it.id)
    render()
  })

  const fin=box("fin",it.done)
  fin.addEventListener("change",()=>{
    li.classList.toggle("done",fin.checked)
    WatchlistManager.setDone(it.id,fin.checked)
  })
  const done=el("label")
  done.append(fin,el("span",null,"Finished"))

  const prog=el("div","prog")
  if(!it.movie)prog.append(el("span",null,"S"),field(it,"s"),el("span",null,":"),el("span",null,"E"),field(it,"e"))   // movies have no seasons
  const mv=box("fin",it.movie)   // manual fix when tvmaze guessed wrong
  mv.addEventListener("change",async()=>{ await WatchlistManager.setMovie(it.id,mv.checked); render() })
  const movie=el("label")
  movie.append(mv,el("span",null,"Movie"))
  prog.append(el("span","sp"),movie,done)

  li.append(on,title,x,prog)
  if(sample)li.querySelectorAll("input,button").forEach(e=>e.disabled=true)   // the faded example does nothing
  return li
}

function skeleton(){
  const li=el("li","row skel")
  li.append(el("div","bone sq"),el("div","bone t"),el("div","bone p"))
  return li
}

async function render(){
  const wl=await WatchlistManager.getWatchlist()
  list.replaceChildren(...wl.map(it=>row(it)))
  total.textContent=wl.length+(wl.length==1?" show":" shows")
  if(wl.length)return
  list.append(row({title:"Loki",active:true,progress:{s:2,e:1}},true))   // faded sample
  list.append(el("li","help","Add a show. Spoilers past your episode get blurred."))
}

function busy(b){
  $("name").disabled=b
  $("addbtn").disabled=b
}

$("name").addEventListener("input",e=>e.target.setCustomValidity(""))

$("add").addEventListener("submit",async e=>{
  e.preventDefault()
  const name=$("name").value.replace(/\s+/g," ").trim().slice(0,MAX_NAME)
  if(!name)return
  busy(true)
  if(!list.querySelector(".row:not(.sample)"))list.replaceChildren()
  list.append(skeleton())
  let msg=""
  try{
    const ok=await WatchlistManager.addSeries(name)   // fetches tvmaze itself, flags movies
    if(ok)$("name").value=""
    else msg="Already on your list, or the list is full (100 max)."
  }catch(err){
    console.warn("SpoilFree: add failed",err)
    msg="Could not add that show. Try again."
  }
  busy(false)   // always unlock the form, even if the fetch threw
  render()
  if(msg){ const n=$("name"); n.setCustomValidity(msg); n.reportValidity() }
})

function setState(on){
  head.classList.toggle("off",!on)
  $("state").textContent=on?"ON":"OFF"
}

$("enabled").addEventListener("change",e=>{
  chrome.storage.local.set({enabled:!!e.target.checked})
  setState(!!e.target.checked)
})
$("strict").addEventListener("change",e=>chrome.storage.local.set({strict:!!e.target.checked}))

chrome.storage.local.get({enabled:true,spoilerCount:0,strict:false},d=>{
  $("enabled").checked=!!d.enabled
  $("strict").checked=!!d.strict
  count.textContent=Number(d.spoilerCount)||0
  setState(!!d.enabled)
})
chrome.storage.onChanged.addListener((ch,area)=>{
  if(area!=="local")return
  if(ch.spoilerCount)count.textContent=Number(ch.spoilerCount.newValue)||0
})

render()
