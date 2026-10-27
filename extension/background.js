const API_URL="https://salujadivyam-spoilfree.hf.space/predict"
const max_calls=600, window_ms=600000   // all tabs together, per 10 minutes

async function allow(){
  const d=await chrome.storage.session.get({start:0,n:0})
  const now=Date.now()
  if(now-d.start>window_ms){d.start=now;d.n=0}
  if(d.n>=max_calls)return false
  await chrome.storage.session.set({start:d.start,n:d.n+1})   // session storage survives worker sleep
  return true
}

// content scripts ask here, so the page never talks to the api and the api sees one origin
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||!sender.tab)return   // our own content scripts only
  if(msg?.type!=="predict"||typeof msg.text!=="string"||msg.text.length>2000){reply(null);return}
  allow().then(ok=>{
    if(!ok){reply({status:429});return}
    const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(),8000)
    fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:msg.text}),signal:ctl.signal,credentials:"omit"})
      .then(r=>r.ok?r.json():{status:r.status})
      .then(reply)
      .catch(()=>reply(null))
      .finally(()=>clearTimeout(t))
  })
  return true
})