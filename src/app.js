import { currentUser, users, roles, campaigns, initialPolicies, initialRequests } from './data.js'
import { resolveApprovalPolicy, snapshotPolicy, describeCondition, money, dateTime } from './approval.js'
import { parseCsv, validateRecords, selectWithinLimits, demoRecords } from './file.js'

const clone = (v) => JSON.parse(JSON.stringify(v))
const state = { page:'requests', requests:clone(initialRequests), policies:clone(initialPolicies), selectedId:null, tab:'overview', modal:null, upload:null, policy:null }
const root = document.querySelector('#app')
const e = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const now = () => new Date().toISOString()
const req = () => state.requests.find(x => x.id === state.selectedId)
const campaign = id => campaigns.find(x => x.id === id)
const status = v => `<span class="pill ${String(v).toLowerCase().replaceAll('_','-')}">${e(String(v).replaceAll('_',' '))}</span>`

function sidebar(){
  return `<aside class="sidebar"><div class="brand"><b>C</b><div><strong>Cake Portal</strong><small>prototype-mvp</small></div></div><div class="section">◆ Marketing & Campaigns</div>${['Trigger Campaign','Affiliate Campaign','Audience','Push','Voucher'].map(x=>`<div class="muted-nav">${x}</div>`).join('')}<div class="group"><div class="group-title">$ Payout</div><button data-nav="requests" class="nav ${['requests','detail'].includes(state.page)?'active':''}">Payout Requests</button><button data-nav="config" class="nav ${state.page==='config'?'active':''}">Approval Configuration</button></div><div class="muted-nav">▱ Offering</div></aside>`
}
function shell(body){ root.innerHTML = `<div class="shell">${sidebar()}<main><div class="top"></div><div class="wrap">${body}</div></main>${modal()}</div>`; bind() }

function requests(){
  return `<div class="stack"><section class="filters"><input placeholder="Campaign ID / Name"><select><option>Approval Status</option><option>PENDING L1</option><option>PENDING L2</option><option>APPROVED</option><option>REJECTED</option></select><input placeholder="Filename"><input placeholder="Maker"><button class="primary">⌕ Search</button></section><section class="card"><div class="toolbar"><div><h2>Payout Requests</h2><p>Upload, validate, approve and execute payout files.</p></div><button data-action="upload" class="primary">⇧ Upload payout file</button></div><div class="table"><table><thead><tr><th>ID</th><th>Filename</th><th>Campaign</th><th>Records</th><th>Total Amount</th><th>Approval</th><th>Current Approver</th><th>Maker</th><th>Uploaded</th><th>Processing</th></tr></thead><tbody>${state.requests.map(r=>{const cur=r.approvalSnapshot?.steps?.find(s=>s.status==='PENDING');return `<tr><td>${r.id}</td><td><button class="link" data-open="${r.id}">${e(r.filename)}</button></td><td><b>${e(r.campaignName)}</b><small>${r.campaignId}</small></td><td>${r.selectedRecords}</td><td>${money(r.approvalTotalAmount)}</td><td>${status(r.approvalStatus)}</td><td>${e(cur?.label||'—')}</td><td>${e(r.maker)}</td><td>${dateTime(r.uploadedAt)}</td><td>${status(r.processingStatus)}</td></tr>`}).join('')}</tbody></table></div></section></div>`
}

function detail(){
  const r=req(); if(!r){state.page='requests';return requests()}
  return `<div class="stack"><section class="card detail-head"><button data-nav="requests" class="back">← Back to Payout Requests</button><div class="title-row"><div><small>PAYOUT REQUEST</small><h1>${r.id}</h1><p>${e(r.filename)} · ${e(r.campaignName)}</p></div><div>${status(r.approvalStatus)} ${status(r.processingStatus)}</div></div><div class="summary"><div><span>Approval Total</span><b>${money(r.approvalTotalAmount)}</b></div><div><span>Selected Records</span><b>${r.selectedRecords}</b></div><div><span>Maker</span><b>${e(r.maker)}</b></div><div><span>Uploaded At</span><b>${dateTime(r.uploadedAt)}</b></div></div></section><section class="card"><div class="tabs">${['overview','records','approval','activity'].map(t=>`<button data-tab="${t}" class="${state.tab===t?'active':''}">${t==='activity'?'Activity Log':t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>${state.tab==='overview'?overview(r):state.tab==='records'?records(r):state.tab==='approval'?approval(r):activity(r)}</section></div>`
}
function overview(r){
  const counts = Object.fromEntries(['SUCCESS','FAILED','UNKNOWN','READY'].map(s=>[s,r.records.filter(x=>x.payoutStatus===s).length]))
  return `<div class="section-body"><div class="metrics"><div><span>Total records</span><b>${r.totalRecords}</b></div><div><span>Valid</span><b>${r.validRecords}</b></div><div><span>Duplicate</span><b>${r.duplicateRecords}</b></div><div><span>Invalid</span><b>${r.invalidRecords}</b></div><div><span>Success</span><b>${counts.SUCCESS}</b></div><div><span>Failed</span><b>${counts.FAILED}</b></div><div><span>Unknown</span><b>${counts.UNKNOWN}</b></div><div><span>Ready</span><b>${counts.READY}</b></div></div><div class="grid2"><div class="panel"><h3>File information</h3><p><b>Description:</b> ${e(r.description)}</p><p><b>Checksum:</b> ${e(r.checksum)}</p><p><b>Submitted:</b> ${dateTime(r.submittedAt)}</p></div><div class="panel"><h3>Approval snapshot</h3><p><b>Policy:</b> ${e(r.approvalSnapshot?.policyName||'—')}</p><p><b>Version:</b> v${r.approvalSnapshot?.policyVersion||'—'}</p><p><b>Condition:</b> ${e(r.approvalSnapshot?.matchedCondition||'—')}</p></div></div></div>`
}
function records(r){
  return `<div class="section-body"><div class="toolbar"><div><h3>Payout records</h3><p>Result is tracked per source record.</p></div><button data-action="export" class="secondary">⇩ Export result</button></div><div class="table"><table><thead><tr><th>Source Record ID</th><th>Customer</th><th>Expected</th><th>Actual</th><th>Status</th><th>LIAB Txn</th><th>Error</th><th></th></tr></thead><tbody>${r.records.map(x=>`<tr><td>${e(x.sourceRecordId)}</td><td>${e(x.customerId)}</td><td>${money(x.expectedAmount)}</td><td>${x.actualAmount==null?'—':money(x.actualAmount)}</td><td>${status(x.payoutStatus)}</td><td>${e(x.liabTransactionId||'—')}</td><td>${e(x.errorCode||'—')}</td><td>${x.payoutStatus==='FAILED'?`<button class="link" data-retry="${x.id}">↺ Retry</button>`:x.payoutStatus==='UNKNOWN'?`<button class="link" data-reconcile="${x.id}">↻ Reconcile</button>`:''}</td></tr>`).join('')}</tbody></table></div></div>`
}
function approval(r){
  const steps=r.approvalSnapshot?.steps||[]; const cur=steps.find(s=>s.status==='PENDING')
  return `<div class="section-body grid2"><div><h3>Approval route</h3><p>Policy/version is snapshotted when the request is submitted.</p><div class="timeline">${steps.map(s=>`<div class="step ${s.status.toLowerCase()}"><div class="dot">${s.status==='APPROVED'?'✓':s.order}</div><div><b>${s.level} · ${e(s.label)}</b><p>${status(s.status)} ${s.actedBy?`by ${e(s.actedBy)} · ${dateTime(s.actedAt)}`:''}</p></div></div>`).join('')}</div></div><div class="panel"><h3>Policy</h3><p><b>${e(r.approvalSnapshot?.policyName||'—')}</b> · v${r.approvalSnapshot?.policyVersion||'—'}</p><p>${e(r.approvalSnapshot?.matchedCondition||'—')}</p><p><b>Approval total:</b> ${money(r.approvalTotalAmount)}</p>${cur?`<hr><h3>Current step</h3><p>${cur.level} · ${e(cur.label)}</p><div class="actions"><button data-action="approve" class="primary">✓ Approve</button><button data-action="reject" class="danger">× Reject</button></div>`:`<p class="ok">No pending approval step.</p>`}</div></div>`
}
function activity(r){ return `<div class="section-body"><h3>Activity Log</h3><div class="activity">${(r.activity||[]).slice().reverse().map(a=>`<div><time>${dateTime(a.at)}</time><b>${e(a.action)}</b><span>${e(a.actor)}</span><p>${e(a.detail)}</p></div>`).join('')}</div></div>` }

function config(){
  return `<div class="stack"><section class="filters"><input placeholder="Rule name"><select><option>Campaign</option>${campaigns.map(c=>`<option>${e(c.name)}</option>`).join('')}</select><select><option>Status</option><option>ACTIVE</option><option>DRAFT</option><option>INACTIVE</option></select><button class="primary">⌕ Search</button></section><section class="card"><div class="toolbar"><div><h2>Approval Configuration</h2><p>Policy → Conditions → ordered Approval Steps. Approvers support USER and ROLE.</p></div><button data-action="new-policy" class="primary">+ Create approval rule</button></div><div class="table"><table><thead><tr><th>Rule</th><th>Scope</th><th>Condition</th><th>Approval Route</th><th>Priority</th><th>Version</th><th>Effective</th><th>Status</th><th></th></tr></thead><tbody>${state.policies.map(p=>`<tr><td><b>${e(p.name)}</b><small>${p.id}</small></td><td>${p.scopeType==='GLOBAL'?'Global':e(campaign(p.scopeId)?.name||p.scopeId)}</td><td>${e(describeCondition(p.condition))}</td><td>${p.steps.map(s=>`${s.level}: ${e(s.label)}`).join(' → ')}</td><td>${p.priority}</td><td>v${p.version}</td><td>${p.effectiveFrom}${p.effectiveTo?` → ${p.effectiveTo}`:' → ∞'}</td><td>${status(p.status)}</td><td><button class="link" data-edit-policy="${p.id}">Edit</button></td></tr>`).join('')}</tbody></table></div></section></div>`
}

function modal(){
  if(!state.modal)return ''
  if(state.modal==='upload'){
    const u=state.upload; const a=u.analysis
    return `<div class="overlay"><div class="modal wide"><div class="modal-head"><h2>Upload payout file</h2><button data-action="close">×</button></div><div class="form"><label>Campaign<select id="upload-campaign">${campaigns.map(c=>`<option value="${c.id}" ${u.campaignId===c.id?'selected':''}>${e(c.name)}</option>`).join('')}</select></label><label>Description<input id="upload-description" value="${e(u.description)}"></label><label>Source file<input id="upload-file" type="file" accept=".csv,.xlsx,.xls"></label><button data-action="demo" class="secondary">Use demo file</button></div>${a?uploadAnalysis(a):''}<div class="modal-actions"><button data-action="close" class="secondary">Cancel</button><button data-action="submit-upload" class="primary" ${!a||a.resolution.error?'disabled':''}>Submit for approval</button></div></div></div>`
  }
  if(state.modal==='reject') return `<div class="overlay"><div class="modal"><div class="modal-head"><h2>Reject payout request</h2><button data-action="close">×</button></div><label>Remark<textarea id="reject-remark" placeholder="Required"></textarea></label><div class="modal-actions"><button data-action="close" class="secondary">Cancel</button><button data-action="confirm-reject" class="danger">Reject</button></div></div></div>`
  if(state.modal==='policy') return policyModal()
  return ''
}
function uploadAnalysis(a){
  return `<div class="analysis"><div class="metrics"><div><span>Valid</span><b>${a.validCount}</b></div><div><span>Duplicate</span><b>${a.duplicateCount}</b></div><div><span>Invalid</span><b>${a.invalidCount}</b></div><div><span>Selected</span><b>${a.selectedRecords.length}</b></div></div><div class="panel"><p><b>Approval total:</b> ${money(a.approvalTotalAmount)}</p>${a.resolution.policy?`<p><b>Resolved policy:</b> ${e(a.resolution.policy.name)} · v${a.resolution.policy.version}</p><p><b>Route:</b> ${a.resolution.policy.steps.map(s=>`${s.level} ${e(s.label)}`).join(' → ')}</p>`:`<p class="error">Cannot submit: ${e(a.resolution.error)}</p>`}</div></div>`
}
function policyModal(){
  const p=state.policy
  return `<div class="overlay"><div class="modal wide"><div class="modal-head"><h2>${p.id?'Edit':'Create'} approval rule</h2><button data-action="close">×</button></div><div class="form grid2"><label>Rule name<input id="policy-name" value="${e(p.name)}"></label><label>Campaign<select id="policy-scope">${campaigns.map(c=>`<option value="${c.id}" ${p.scopeId===c.id?'selected':''}>${e(c.name)}</option>`).join('')}</select></label><label>Approval basis<select id="policy-basis"><option value="FILE_TOTAL_AMOUNT" ${p.condition.basis==='FILE_TOTAL_AMOUNT'?'selected':''}>File Total Amount</option><option value="ALWAYS" ${p.condition.basis==='ALWAYS'?'selected':''}>Always</option></select></label><label>Priority<input id="policy-priority" type="number" value="${p.priority}"></label>${p.condition.basis==='FILE_TOTAL_AMOUNT'?`<label>From amount<input id="policy-from" type="number" value="${p.condition.from||0}"></label><label>To amount<input id="policy-to" type="number" value="${p.condition.to||''}" placeholder="Leave empty = greater than From"></label>`:''}</div><h3>Approval Steps</h3><div class="step-editor">${p.steps.map((s,i)=>`<div class="edit-step"><b>${s.level}</b><select data-step-type="${i}"><option value="ROLE" ${s.approverType==='ROLE'?'selected':''}>ROLE</option><option value="USER" ${s.approverType==='USER'?'selected':''}>USER</option></select>${s.approverType==='ROLE'?`<select data-step-ref="${i}">${roles.map(x=>`<option ${s.approverRef===x?'selected':''}>${e(x)}</option>`).join('')}</select>`:`<select data-step-ref="${i}">${users.map(x=>`<option value="${x.id}" ${s.approverRef===x.id?'selected':''}>${e(x.name)} · ${e(x.email)}</option>`).join('')}</select>`}<button data-remove-step="${i}" class="danger-lite">Remove</button></div>`).join('')}</div><button data-action="add-step" class="secondary">+ Add approval level</button><div class="modal-actions"><button data-action="close" class="secondary">Cancel</button><button data-action="save-draft" class="secondary">Save Draft</button><button data-action="activate-policy" class="primary">Save & Activate</button></div></div></div>`
}

function render(){ shell(state.page==='requests'?requests():state.page==='detail'?detail():config()) }
function bind(){
  document.querySelectorAll('[data-nav]').forEach(x=>x.onclick=()=>{state.page=x.dataset.nav;state.selectedId=null;state.modal=null;render()})
  document.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>{state.selectedId=x.dataset.open;state.page='detail';state.tab='overview';render()})
  document.querySelectorAll('[data-tab]').forEach(x=>x.onclick=()=>{state.tab=x.dataset.tab;render()})
  document.querySelectorAll('[data-action]').forEach(x=>x.onclick=()=>action(x.dataset.action))
  document.querySelectorAll('[data-retry]').forEach(x=>x.onclick=()=>retry(x.dataset.retry))
  document.querySelectorAll('[data-reconcile]').forEach(x=>x.onclick=()=>reconcile(x.dataset.reconcile))
  document.querySelectorAll('[data-edit-policy]').forEach(x=>x.onclick=()=>{state.policy=clone(state.policies.find(p=>p.id===x.dataset.editPolicy));state.modal='policy';render()})
  document.querySelectorAll('[data-remove-step]').forEach(x=>x.onclick=()=>{state.policy.steps.splice(Number(x.dataset.removeStep),1);state.policy.steps.forEach((s,i)=>{s.order=i+1;s.level=`L${i+1}`});render()})
  const uc=document.querySelector('#upload-campaign'); if(uc) uc.onchange=()=>{state.upload.campaignId=uc.value; analyze(); render()}
  const ud=document.querySelector('#upload-description'); if(ud) ud.oninput=()=>state.upload.description=ud.value
  const uf=document.querySelector('#upload-file'); if(uf) uf.onchange=async()=>{const f=uf.files[0];if(!f)return;state.upload.fileName=f.name;state.upload.rawRecords=f.name.endsWith('.csv')?parseCsv(await f.text()):demoRecords(820,campaign(state.upload.campaignId).fixedAmount||100000);analyze();render()}
  const pb=document.querySelector('#policy-basis'); if(pb) pb.onchange=()=>{state.policy.condition={basis:pb.value,operator:pb.value==='ALWAYS'?'ALWAYS':'BETWEEN',from:0,to:50_000_000};render()}
  document.querySelectorAll('[data-step-type]').forEach(x=>x.onchange=()=>{const s=state.policy.steps[Number(x.dataset.stepType)];s.approverType=x.value;if(x.value==='ROLE'){s.approverRef=roles[0];s.label=roles[0]}else{s.approverRef=users[0].id;s.label=`${users[0].name} · ${users[0].email}`};render()})
  document.querySelectorAll('[data-step-ref]').forEach(x=>x.onchange=()=>{const s=state.policy.steps[Number(x.dataset.stepRef)];s.approverRef=x.value;s.label=s.approverType==='ROLE'?x.value:(()=>{const u=users.find(u=>u.id===x.value);return `${u.name} · ${u.email}`})()})
}
function action(a){
  if(a==='upload'){state.upload={campaignId:campaigns[0].id,description:'TD Referral daily payout',fileName:'',rawRecords:[],analysis:null};state.modal='upload';render()}
  if(a==='close'){state.modal=null;render()}
  if(a==='demo'){const c=campaign(state.upload.campaignId);state.upload.fileName='td_referral_demo_20260807.xlsx';state.upload.rawRecords=demoRecords(820,c.fixedAmount||100000);analyze();render()}
  if(a==='submit-upload') submitUpload()
  if(a==='approve') approve()
  if(a==='reject'){state.modal='reject';render()}
  if(a==='confirm-reject') reject()
  if(a==='export') exportCsv()
  if(a==='new-policy'){state.policy={id:null,name:'New approval rule',scopeType:'CAMPAIGN',scopeId:campaigns[0].id,priority:100,status:'DRAFT',version:1,effectiveFrom:new Date().toISOString().slice(0,10),effectiveTo:'',condition:{basis:'FILE_TOTAL_AMOUNT',operator:'BETWEEN',from:0,to:50_000_000},steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head'}]};state.modal='policy';render()}
  if(a==='add-step'){const i=state.policy.steps.length;state.policy.steps.push({order:i+1,level:`L${i+1}`,approverType:'ROLE',approverRef:'Finance Approver',label:'Finance Approver'});render()}
  if(a==='save-draft') savePolicy('DRAFT')
  if(a==='activate-policy') savePolicy('ACTIVE')
}
function analyze(){
  if(!state.upload.rawRecords.length)return
  const c=campaign(state.upload.campaignId); const checked=validateRecords(state.upload.rawRecords,c,new Set(state.requests.flatMap(r=>r.records.map(x=>x.sourceRecordId)))); const limited=selectWithinLimits(checked.records,c); const selected=limited.filter(x=>x.selected); const approvalTotalAmount=selected.reduce((s,x)=>s+x.expectedAmount,0); const resolution=resolveApprovalPolicy(state.policies,{campaignId:c.id,approvalTotalAmount}); state.upload.analysis={...checked,records:limited,selectedRecords:selected,approvalTotalAmount,resolution}
}
function submitUpload(){
  const u=state.upload,a=u.analysis;if(!a||a.resolution.error)return
  const c=campaign(u.campaignId),p=a.resolution.policy,ts=now(),r={id:`PAY-${ts.slice(0,10).replaceAll('-','')}-${String(state.requests.length+1).padStart(3,'0')}`,filename:u.fileName||'payout.xlsx',description:u.description,campaignId:c.id,campaignName:c.name,maker:currentUser.email,uploadedAt:ts,submittedAt:ts,checksum:`demo-${Math.random().toString(16).slice(2,10)}`,totalRecords:a.records.length,validRecords:a.validCount,duplicateRecords:a.duplicateCount,invalidRecords:a.invalidCount,selectedRecords:a.selectedRecords.length,approvalTotalAmount:a.approvalTotalAmount,approvalStatus:'PENDING_L1',processingStatus:'UPLOADED',currentApprovalStep:1,approvalSnapshot:snapshotPolicy(p,{campaignId:c.id,approvalTotalAmount:a.approvalTotalAmount}),records:a.selectedRecords.map((x,i)=>({...x,id:`REC-${Date.now()}-${i}`,payoutStatus:'READY'})),activity:[{at:ts,actor:currentUser.email,action:'UPLOAD_FILE',detail:`Uploaded ${u.fileName}`},{at:ts,actor:'SYSTEM',action:'VALIDATION_COMPLETED',detail:`${a.validCount} valid · ${a.duplicateCount} duplicate · ${a.invalidCount} invalid`},{at:ts,actor:currentUser.email,action:'SUBMIT_APPROVAL',detail:`Resolved ${p.id} v${p.version}`}]} ;state.requests.unshift(r);state.selectedId=r.id;state.page='detail';state.tab='approval';state.modal=null;render()
}
function approve(){
  const r=req(),steps=r.approvalSnapshot.steps,i=steps.findIndex(s=>s.status==='PENDING');if(i<0)return
  Object.assign(steps[i],{status:'APPROVED',actedBy:`demo.${steps[i].level.toLowerCase()}@cake.vn`,actedAt:now()});if(steps[i+1]){steps[i+1].status='PENDING';r.approvalStatus=`PENDING_${steps[i+1].level}`;r.currentApprovalStep=steps[i+1].order}else{r.approvalStatus='APPROVED';r.currentApprovalStep=null;r.activity.push({at:now(),actor:'SYSTEM',action:'AUTO_TRIGGER_LIAB',detail:'Final approval completed. Budget/cap revalidation passed.'});execute(r)}render()
}
function execute(r){r.records=r.records.map((x,i)=>(i+1)%17===0?{...x,payoutStatus:'UNKNOWN',errorCode:'TIMEOUT'}:(i+1)%13===0?{...x,payoutStatus:'FAILED',actualAmount:0,errorCode:'LIAB_TEMPORARY_ERROR'}:{...x,payoutStatus:'SUCCESS',actualAmount:x.expectedAmount,errorCode:'',liabTransactionId:`LIAB-${Date.now()}-${i+1}`});const u=r.records.some(x=>x.payoutStatus==='UNKNOWN'),f=r.records.some(x=>x.payoutStatus==='FAILED');r.processingStatus=u?'RECONCILIATION_REQUIRED':f?'PARTIALLY_FAILED':'COMPLETED'}
function reject(){const remark=document.querySelector('#reject-remark')?.value.trim();if(!remark)return alert('Reject remark is required');const r=req(),s=r.approvalSnapshot.steps.find(x=>x.status==='PENDING');Object.assign(s,{status:'REJECTED',actedBy:'demo.approver@cake.vn',actedAt:now(),remark});r.approvalStatus='REJECTED';r.currentApprovalStep=null;state.modal=null;render()}
function retry(id){const r=req(),x=r.records.find(y=>y.id===id);Object.assign(x,{payoutStatus:'SUCCESS',actualAmount:x.expectedAmount,errorCode:'',liabTransactionId:`LIAB-RETRY-${Date.now()}`,retryCount:(x.retryCount||0)+1});render()}
function reconcile(id){const r=req(),x=r.records.find(y=>y.id===id);Object.assign(x,{payoutStatus:'SUCCESS',actualAmount:x.expectedAmount,errorCode:'',liabTransactionId:`LIAB-RECON-${Date.now()}`});render()}
function exportCsv(){const r=req(),rows=[['source_record_id','customer_id','expected_amount','actual_amount','payout_status','liab_transaction_id','error_code'],...r.records.map(x=>[x.sourceRecordId,x.customerId,x.expectedAmount,x.actualAmount??'',x.payoutStatus,x.liabTransactionId||'',x.errorCode||''])];const url=URL.createObjectURL(new Blob([rows.map(x=>x.join(',')).join('\n')],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`${r.id}-result.csv`;a.click();URL.revokeObjectURL(url)}
function savePolicy(statusValue){
  const p=state.policy;p.name=document.querySelector('#policy-name')?.value||p.name;p.scopeId=document.querySelector('#policy-scope')?.value||p.scopeId;p.priority=Number(document.querySelector('#policy-priority')?.value||100);p.status=statusValue;if(p.condition.basis==='FILE_TOTAL_AMOUNT'){p.condition.from=Number(document.querySelector('#policy-from')?.value||0);const to=document.querySelector('#policy-to')?.value;p.condition.to=to?Number(to):null;p.condition.operator=to?'BETWEEN':'GREATER_THAN'}
  if(!p.steps.length)return alert('At least one approval step is required')
  if(statusValue==='ACTIVE'&&p.condition.basis==='FILE_TOTAL_AMOUNT'&&p.condition.operator==='BETWEEN'&&p.condition.to<=p.condition.from)return alert('To amount must be greater than From amount')
  const idx=state.policies.findIndex(x=>x.id===p.id);if(idx>=0)state.policies[idx]=clone(p);else{p.id=`POL-${Date.now()}`;state.policies.unshift(clone(p))}state.modal=null;render()
}
render()
