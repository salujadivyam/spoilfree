const API_URL="https://salujadivyam-spoilfree.hf.space/predict"

// content scripts ask here, so the page never talks to the api and the api sees one origin
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||!sender.tab)return   // our own content scripts only
  if(msg?.type!=="predict"||typeof msg.text!=="string"||msg.text.length>2000){reply(null);return}
  const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(),8000)
  fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:msg.text}),signal:ctl.signal,credentials:"omit"})
    .then(r=>r.ok?r.json():{status:r.status})
    .then(reply)
    .catch(()=>reply(null))
    .finally(()=>clearTimeout(t))
  return true
})
