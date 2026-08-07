function text(el){return (el?.textContent||'').trim()}
function hide(el){if(el) el.style.display='none'}
function applyApprovalConfigOverrides(){
  // Move Approval Configuration out of the Payout submenu and make it a standalone module.
  const sidebar=document.querySelector('.sidebar')
  const configBtn=[...document.querySelectorAll('[data-nav="config"]')][0]
  if(sidebar&&configBtn&&!configBtn.closest('.approval-config-standalone')){
    const payoutGroup=configBtn.closest('.group,.nav-group')
    const wrap=document.createElement('div')
    wrap.className='group approval-config-standalone'
    const title=document.createElement('div')
    title.className='group-title nav-parent'
    title.textContent='⚙ Approval Configuration'
    configBtn.textContent='Approval Rules'
    configBtn.classList.add('approval-config-nav')
    wrap.appendChild(title)
    wrap.appendChild(configBtn)
    payoutGroup?.after(wrap)
  }

  // Approval Configuration is global: keep campaign input technically present for old handler compatibility,
  // but remove it from the demo UI. Policy resolution no longer uses campaign scope.
  if(document.querySelector('[data-nav="config"].active,.approval-config-nav.active')){
    document.querySelectorAll('.filters select').forEach(sel=>{
      if([...sel.options].some(o=>text(o)==='Campaign')) hide(sel)
    })
    document.querySelectorAll('.filters input').forEach(input=>{
      if((input.placeholder||'').toLowerCase().includes('campaign')) hide(input)
    })

    // Old table columns: Rule | Scope | Condition | Route | Priority | Version | Effective | Status | Action.
    document.querySelectorAll('table tr').forEach(row=>{
      const cells=[...row.children]
      if(cells.length>=9){ hide(cells[1]); hide(cells[6]) }
    })
  }

  // Keep hidden select in DOM so existing save handlers stay compatible, but user no longer configures Campaign.
  document.querySelectorAll('.modal label').forEach(label=>{
    if(/^Campaign/i.test(text(label))) hide(label)
    if(/^Effective/i.test(text(label))) hide(label)
  })
}

let queued=false
const schedule=()=>{
  if(queued)return
  queued=true
  requestAnimationFrame(()=>{queued=false;applyApprovalConfigOverrides()})
}
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true})
window.addEventListener('DOMContentLoaded',schedule)
schedule()
