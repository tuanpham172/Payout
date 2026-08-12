// Payout prototype v8: consolidate the current UI patches and the latest payout rules on top of v5.
// Keep the UI-SCREENS layout; only change agreed behavior.

const response = await fetch('./app-v5.js');
if (!response.ok) throw new Error(`Cannot load app-v5.js: ${response.status}`);
let src = await response.text();

function patch(from, to, label) {
  if (!src.includes(from)) throw new Error(`v8 patch target not found: ${label}`);
  src = src.replace(from, to);
}

function patchRegex(regex, to, label) {
  if (!regex.test(src)) throw new Error(`v8 patch target not found: ${label}`);
  src = src.replace(regex, to);
}

// -----------------------------------------------------------------------------
// Approval policy behavior
// -----------------------------------------------------------------------------

// Amount boundaries are inclusive.
patchRegex(
  /function conditionText\(c\)\{[^\n]+\}/,
  "function conditionText(c){if(!c||c.basis==='ALWAYS')return'Always';if(c.operator==='BETWEEN')return`${Number(c.from||0).toLocaleString('vi-VN')} ≤ File Total Amount ≤ ${Number(c.to||0).toLocaleString('vi-VN')} VND`;return`File Total Amount ≥ ${Number(c.from||0).toLocaleString('vi-VN')} VND`}",
  'conditionText'
);
patch(
  "function conditionMatches(c,a){if(!c||c.basis==='ALWAYS')return true;if(c.operator==='BETWEEN')return a>Number(c.from||0)&&a<=Number(c.to||0);return a>Number(c.from||0)}",
  "function conditionMatches(c,a){if(!c||c.basis==='ALWAYS')return true;const from=Number(c.from||0);if(c.operator==='BETWEEN')return a>=from&&a<=Number(c.to||0);return a>=from}",
  'conditionMatches'
);

// Default approval route is a permanent fallback rule. While ACTIVE it always wins,
// regardless of amount. When INACTIVE, conditional rules are evaluated by priority.
patch(
  "function resolvePolicy(policies,amount,module='PAYOUT'){const m=policies.filter(p=>p.status==='ACTIVE'&&p.module===module&&conditionMatches(p.condition,amount)).sort((a,b)=>b.priority-a.priority);if(!m.length)return{error:'NO_MATCHING_POLICY'};const top=m.filter(p=>p.priority===m[0].priority);if(top.length>1)return{error:'AMBIGUOUS_POLICY'};return{policy:top[0]}}",
  "function resolvePolicy(policies,amount,module='PAYOUT'){const def=policies.find(p=>p.id==='POL-GLOBAL-DEFAULT'&&p.status==='ACTIVE'&&p.module===module);if(def)return{policy:def};const m=policies.filter(p=>p.id!=='POL-GLOBAL-DEFAULT'&&p.status==='ACTIVE'&&p.module===module&&conditionMatches(p.condition,amount)).sort((a,b)=>Number(a.priority)-Number(b.priority)||(new Date(b.createdAt||0)-new Date(a.createdAt||0)));if(!m.length)return{error:'NO_MATCHING_POLICY'};return{policy:m[0]}}",
  'resolvePolicy default-first'
);

// Priority 0 is reserved for the default route. Conditional demo rules start at 1.
patch("name:'Low value payout',priority:100", "name:'Low value payout',priority:1", 'seed low priority');
patch("name:'Medium value payout',priority:100", "name:'Medium value payout',priority:2", 'seed medium priority');
patch("name:'High value payout',priority:100", "name:'High value payout',priority:3", 'seed high priority');
patch("name:'Default approval route',priority:10", "name:'Default approval route',priority:0", 'seed default priority');

// -----------------------------------------------------------------------------
// Current UI-SCREENS cleanup retained from v6/v7
// -----------------------------------------------------------------------------

// Listing: remove Accepted / Imported.
patch('<th>Accepted / Imported</th>', '', 'listing header accepted/imported');
patch('<td>${r.acceptedRows} / ${r.importedRows}</td>', '', 'listing cell accepted/imported');

// Detail: Imported Rows means successfully imported/accepted payout records.
patch(
  '<div><span>Imported Rows</span><strong>${r.importedRows}</strong></div><div><span>Accepted for Payout</span><strong>${r.acceptedRows}</strong></div>',
  '<div><span>Imported Rows</span><strong>${r.acceptedRows}</strong></div>',
  'detail summary imported rows'
);
patch(
  "[['Imported rows',r.importedRows],['Accepted for payout',r.acceptedRows],",
  "[['Imported rows',r.acceptedRows],",
  'overview metrics imported rows'
);
patch(
  '<dt>Imported</dt><dd>${r.importedRows}</dd><dt>Accepted</dt><dd>${r.acceptedRows}</dd>',
  '<dt>Imported</dt><dd>${r.acceptedRows}</dd>',
  'overview payout source imported rows'
);

// English user-facing status wording and simplified overview.
patch("['Chưa xử lý',st.unprocessed]", "['Pending',st.unprocessed]", 'overview pending metric');
patch("['Payout success',st.success]", "['Success',st.success]", 'overview success metric');
patch(
  '<div class="v2-panel"><h3>Approval snapshot</h3><dl><dt>Module</dt><dd>${esc(r.approvalSnapshot?.module||\'PAYOUT\')}</dd><dt>Policy</dt><dd>${esc(r.approvalSnapshot?.policyName||\'—\')}</dd><dt>Condition</dt><dd>${esc(r.approvalSnapshot?.matchedCondition||\'—\')}</dd><dt>Current approver</dt><dd>${esc(cur(r)?.label||\'—\')}</dd></dl></div>',
  '',
  'remove approval snapshot'
);
patch(
  '<div class="v2-info-strip"><strong>Record lifecycle</strong><span>Accepted records nằm ở tab Chưa xử lý cho đến khi LIAB trả final result. Sau đó record chuyển sang Thành công hoặc Thất bại / Exception.</span></div>',
  '',
  'remove record lifecycle'
);

// Upload review: policy resolution remains in logic but is not displayed.
patch(
  '<div class="v2-panel"><p><b>Resolved policy:</b> ${a.resolution.policy?esc(a.resolution.policy.name):esc(a.resolution.error)}</p></div>',
  '',
  'remove resolved policy display'
);

// Demo validation checks amount validity only; Payout does not recalculate entitlement/reward.
patch(
  "rows[64].expectedAmount=120000;rows[64].validationStatus='INVALID';rows[64].errors=['Amount mismatch: configured reward is 100,000 VND'];",
  "rows[64].expectedAmount=0;rows[64].validationStatus='INVALID';rows[64].errors=['expected_amount must be greater than 0'];",
  'demo invalid amount'
);

// Records wording.
patch(
  '<p>Accepted records được hiển thị ngay sau submit; final result từ LIAB sẽ phân loại sang Success hoặc Failed.</p>',
  '<p>Imported records are available immediately after submit; LIAB final results are grouped by current payout status.</p>',
  'records description english'
);
patch('>Chưa xử lý <span>${unprocessed.length}</span>', '>Pending <span>${unprocessed.length}</span>', 'records pending tab');
patch('>Thành công <span>${success.length}</span>', '>Success <span>${success.length}</span>', 'records success tab');
patch('>Thất bại / Exception <span>${failed.length}</span>', '>Failed / Exception <span>${failed.length}</span>', 'records failed tab');
patch('Không có record trong nhóm này.', 'No records in this group.', 'records empty state english');

// Split Failed and Exception while preserving the current Records layout.
patch(
  "failed=r.records.filter(x=>['FAILED','UNKNOWN'].includes(x.payoutStatus));const rows=S.recordTab==='unprocessed'?unprocessed:S.recordTab==='success'?success:failed;",
  "failed=r.records.filter(x=>x.payoutStatus==='FAILED'),exception=r.records.filter(x=>x.payoutStatus==='UNKNOWN');const active=S.recordTab==='unprocessed'?'pending':S.recordTab;const rows=active==='pending'?unprocessed:active==='success'?success:active==='failed'?failed:exception;",
  'records four groups data'
);
patch(
  '<button data-record-tab="unprocessed" class="${S.recordTab===\'unprocessed\'?\'active\':\'\'}">Pending <span>${unprocessed.length}</span></button>',
  '<button data-record-tab="pending" class="${active===\'pending\'?\'active\':\'\'}">Pending <span>${unprocessed.length}</span></button>',
  'pending record tab'
);
patch(
  '<button data-record-tab="success" class="${S.recordTab===\'success\'?\'active\':\'\'}">Success <span>${success.length}</span></button>',
  '<button data-record-tab="success" class="${active===\'success\'?\'active\':\'\'}">Success <span>${success.length}</span></button>',
  'success record tab'
);
patch(
  '<button data-record-tab="failed" class="${S.recordTab===\'failed\'?\'active\':\'\'}">Failed / Exception <span>${failed.length}</span></button>',
  '<button data-record-tab="failed" class="${active===\'failed\'?\'active\':\'\'}">Failed <span>${failed.length}</span></button><button data-record-tab="exception" class="${active===\'exception\'?\'active\':\'\'}">Exception <span>${exception.length}</span></button>',
  'failed and exception tabs'
);

// Approval tab: keep route only, plus compact Approve / Reject actions under the route.
patch(
  '<p>Mỗi step có thể đồng thời cấu hình nhiều ROLE và nhiều USER. User được approve nếu match ít nhất một ROLE hoặc nằm trong danh sách USER.</p>',
  '',
  'remove approval explanation'
);
patch(
  '<aside class="v2-panel"><h3>${esc(r.approvalSnapshot?.policyName||\'Approval policy\')}</h3><p><b>Module:</b> ${esc(r.approvalSnapshot?.module||\'PAYOUT\')}</p><p><b>Approval total:</b> ${money(r.approvalTotalAmount)}</p>${s?`<hr><span>Current step</span><h3>${s.level} · ${esc(s.label)}</h3><div class="v2-actions"><button data-action="approve" class="v2-btn v2-success">${icon(\'check\')} Approve</button><button data-action="reject" class="v2-btn v2-danger-outline">${icon(\'x\')} Reject</button></div>`:\'\'}</aside>',
  '',
  'remove approval policy side panel'
);

// Processing confirmation copy.
patch(
  '<p>Records vẫn nằm ở tab Chưa xử lý trong khi LIAB đang processing.</p>',
  '<p>Records remain in the Pending tab while LIAB is processing.</p>',
  'processing confirm english'
);
patch(
  '<p>Final result sẽ chuyển records sang Thành công hoặc Thất bại / Exception.</p>',
  '<p>Final results move records to Success, Failed or Exception.</p>',
  'final result confirm english'
);

// -----------------------------------------------------------------------------
// Request closure / Retry / Reconciliation behavior retained from v7
// -----------------------------------------------------------------------------

patch(
  "REJECTED:'red',INACTIVE:'gray'}[v]||'gray'",
  "REJECTED:'red',INACTIVE:'gray',OPEN:'gray',CLOSED:'navy'}[v]||'gray'",
  'closure status classes'
);

patchRegex(
  /const S=\{[^\n]+\};/,
  m => `${m}
const AUTO_CLOSE_POLICY={enabled:false,days:null,closeCompletedImmediately:false};
function isDefaultPolicy(p){return!!p&&p.id==='POL-GLOBAL-DEFAULT'}
function closure(r){return r?.closureStatus||'OPEN'}
function terminalProcessing(r){return ['COMPLETED','PARTIALLY_FAILED','FAILED'].includes(r?.processingStatus)}
function canClose(r){return!!r&&closure(r)==='OPEN'&&terminalProcessing(r)&&!r.records.some(x=>['SUBMITTED','PROCESSING','RETRYING','UNKNOWN'].includes(x.payoutStatus))}
function requestOpenForRecord(x){const r=S.requests.find(q=>(q.records||[]).some(v=>v.id===x.id));return!!r&&closure(r)==='OPEN'}
function closeRequest(r,mode='MANUAL_CLOSE',actor){if(!canClose(r))return false;r.closureStatus='CLOSED';r.closedAt=now();r.closedBy=actor||'SYSTEM';r.closeMode=mode;const success=r.records.filter(x=>x.payoutStatus==='SUCCESS').length,failed=r.records.filter(x=>x.payoutStatus==='FAILED').length;log(r,mode,'Request closed · SUCCESS '+success+' · FAILED '+failed,r.closedBy);return true}
function latestActivityAt(r){const xs=(r.activity||[]).map(a=>new Date(a.at).getTime()).filter(Number.isFinite);return xs.length?Math.max(...xs):new Date(r.submittedAt||r.uploadedAt||0).getTime()}
function maybeAutoClose(r){if(!AUTO_CLOSE_POLICY.enabled||closure(r)!=='OPEN'||!canClose(r))return;if(AUTO_CLOSE_POLICY.closeCompletedImmediately&&r.processingStatus==='COMPLETED'){closeRequest(r,'AUTO_CLOSE','SYSTEM');return}const t=latestActivityAt(r);if(t&&AUTO_CLOSE_POLICY.days!=null&&Date.now()-t>=AUTO_CLOSE_POLICY.days*86400000)closeRequest(r,'AUTO_CLOSE','SYSTEM')}
function closeButton(r){return canClose(r)?'<button data-action="close-request" class="v2-btn v2-danger-outline">Close Request</button>':''}
function approvalActionBar(s){return s?'<div class="v2-actions v7-approval-actions"><button data-action="approve" class="v2-btn v2-success">✓ Approve</button><button data-action="reject" class="v2-btn v2-danger-outline">× Reject</button></div>':''}
function closeConfirm(r){const success=r.records.filter(x=>x.payoutStatus==='SUCCESS').length,failed=r.records.filter(x=>x.payoutStatus==='FAILED').length;return confirmModal('Close Payout Request','<div class="v2-warning-box">'+icon('warning')+'<div><strong>Chốt kết quả payout</strong><p>Sau khi Close, request không thể Retry, Reconcile hoặc gửi lại record cũ sang LIAB.</p></div></div><div class="v2-panel"><p><b>Processing:</b> '+esc(r.processingStatus)+'</p><p><b>Success:</b> '+success+'</p><p><b>Failed:</b> '+failed+'</p><p><b>Auto Close policy:</b> '+(AUTO_CLOSE_POLICY.enabled&&AUTO_CLOSE_POLICY.days!=null?AUTO_CLOSE_POLICY.days+' days':'Not configured (TBD)')+'</p></div>','confirm-close-request','Close Request',true)}
function manualClose(){const r=S.requests.find(x=>x.id===S.id),actor=USERS.find(u=>u.id===S.actorId)?.email||'OPS';if(closeRequest(r,'MANUAL_CLOSE',actor)){S.modal=null;S.payload=null}}`,
  'request closure helpers'
);

patchRegex(
  /function retryable\(x\)\{[^\n]+\}/,
  "function retryable(x){return requestOpenForRecord(x)&&x.payoutStatus==='FAILED'&&RETRY_POLICY.retryableCodes.includes(x.errorCode)&&(x.retryCount||0)<RETRY_POLICY.maxAttempts}",
  'retry blocked after close'
);

patch(
  'function render(){root.innerHTML=',
  'function render(){S.requests.forEach(maybeAutoClose);root.innerHTML=',
  'auto close on render'
);

patch(
  '<div>${pill(r.approvalStatus)} ${pill(r.processingStatus)}</div>${processingButton(r)}',
  '<div>${pill(r.approvalStatus)} ${pill(r.processingStatus)} ${pill(closure(r))}</div>${processingButton(r)}${closeButton(r)}',
  'detail closure status and close action'
);

patch(
  "x.payoutStatus==='UNKNOWN'?`<button data-reconcile=\"${x.id}\" class=\"v2-link\">${icon('refresh')} Reconcile</button>`:'—'",
  "requestOpenForRecord(x)&&x.payoutStatus==='UNKNOWN'?`<button data-reconcile=\"${x.id}\" class=\"v2-link\">${icon('refresh')} Reconcile</button>`:'—'",
  'reconcile blocked after close'
);
patch(
  "if(!x||x.payoutStatus!=='UNKNOWN')return;",
  "if(!x||closure(r)!=='OPEN'||x.payoutStatus!=='UNKNOWN')return;",
  'reconcile guard after close'
);

patchRegex(
  /function approvalTab\(r\)\{[^\n]+\}/,
  m => {
    const tail='</div></div>`}';
    if(!m.endsWith(tail))throw new Error('v8 approvalTab tail not found');
    return m.slice(0,-tail.length)+'${approvalActionBar(s)}</div></div>`}';
  },
  'approval actions under route'
);

patch(
  "if(S.modal==='policy')return policyModal();",
  "if(S.modal==='close-request')return closeConfirm(r);if(S.modal==='policy')return policyModal();",
  'close request modal'
);

patch(
  "document.querySelector('[data-action=\"new-policy\"]')?.addEventListener",
  "document.querySelector('[data-action=\"close-request\"]')?.addEventListener('click',()=>{const r=S.requests.find(x=>x.id===S.id);if(canClose(r)){S.modal='close-request';render()}});document.querySelector('[data-action=\"confirm-close-request\"]')?.addEventListener('click',()=>{manualClose();render()});document.querySelector('[data-action=\"new-policy\"]')?.addEventListener",
  'close request bindings'
);

// -----------------------------------------------------------------------------
// Latest change 1: Final approval auto-calls LIAB processing (no extra manual click)
// -----------------------------------------------------------------------------

patch(
  "else{r.approvalStatus='APPROVED';r.processingStatus='SUBMITTED';r.sentToLiabCount=r.records.length;r.records.forEach(x=>x.payoutStatus='SUBMITTED');log(r,`APPROVE_${s.level}`,`Final approval; auto-call LIAB for ${r.records.length} records.`,actor.email)}",
  "else{r.approvalStatus='APPROVED';r.processingStatus='SUBMITTED';r.sentToLiabCount=r.records.length;r.records.forEach(x=>x.payoutStatus='SUBMITTED');log(r,`APPROVE_${s.level}`,`Final approval; auto-call LIAB for ${r.records.length} records.`,actor.email);liabProcessing()}",
  'final approval auto LIAB processing'
);

// -----------------------------------------------------------------------------
// Latest change 2: Default approval route is permanent, unconditional and priority 0
// -----------------------------------------------------------------------------

// Policy form: Default route cannot change condition/priority; conditional rules start at 1.
patch(
  '<label>Approval basis<select id="pol-basis">',
  '<label>Approval basis<select id="pol-basis" ${isDefaultPolicy(p)?\'disabled\':\'\'}>',
  'default basis locked'
);
patch(
  '<label>From amount<input',
  '<label>From amount (>=)<input',
  'from amount label'
);
patch(
  '<label>To amount<input',
  '<label>To amount (<=)<input',
  'to amount label'
);
patch(
  '<label>Priority<input id="pol-priority" type="number" min="0" value="${p.priority}"></label>',
  '<label>Priority<input id="pol-priority" type="number" min="${isDefaultPolicy(p)?0:1}" value="${p.priority}" ${isDefaultPolicy(p)?\'disabled\':\'\'}><small>${isDefaultPolicy(p)?\'Default route luôn dùng ALWAYS và Priority 0. Inactive rule này để áp dụng các rule có điều kiện.\':\'Rule có điều kiện dùng Priority từ 1 trở lên; số nhỏ hơn ưu tiên cao hơn.\'}</small></label>',
  'priority helper and default lock'
);

// New conditional policy starts at priority 1 (priority 0 is reserved for Default).
patch("name:'',priority:100,status:'DRAFT'", "name:'',priority:1,status:'DRAFT'", 'new policy default priority');

// Validate latest approval policy rules; no overlap blocking.
patchRegex(
  /function validatePolicy\(p,activate\)\{[^\n]+\}/,
  "function validatePolicy(p,activate){if(!p.name.trim())return'Rule name is required.';if(p.module!=='PAYOUT')return'Module must be PAYOUT in MVP.';const isDefault=isDefaultPolicy(p);if(isDefault){if(p.condition.basis!=='ALWAYS')return'Default approval route must use ALWAYS.';if(Number(p.priority)!==0)return'Default approval route must use Priority 0.'}else if(!Number.isFinite(Number(p.priority))||Number(p.priority)<1)return'Conditional policy priority must be 1 or greater.';if(!p.steps.length)return'At least one approval step is required.';if(p.steps.some(s=>!(s.roleRefs||[]).length&&!(s.userRefs||[]).length))return'Every approval step must have at least one ROLE or USER.';if(p.condition.basis==='FILE_TOTAL_AMOUNT'){const from=Number(p.condition.from||0);if(from<0)return'From amount cannot be negative.';if(p.condition.operator==='BETWEEN'&&!(Number(p.condition.to)>=from))return'To amount must be greater than or equal to From amount.'}return''}",
  'validate policy latest'
);

// Persist createdAt for same-priority conditional resolution, and enforce Default semantics on save.
patch(
  "function savePolicy(active){const p=S.policy;p.module='PAYOUT';p.name=document.querySelector('#pol-name')?.value.trim()||'';p.priority=Number(document.querySelector('#pol-priority')?.value||0);const basis=document.querySelector('#pol-basis')?.value;",
  "function savePolicy(active){const p=S.policy,isDefault=isDefaultPolicy(p);p.module='PAYOUT';p.name=document.querySelector('#pol-name')?.value.trim()||'';p.priority=isDefault?0:Number(document.querySelector('#pol-priority')?.value||1);const basis=isDefault?'ALWAYS':document.querySelector('#pol-basis')?.value;",
  'save default semantics'
);
patch(
  "else{p.id=uid('POL-GLOBAL');p.version=1;S.policies.unshift(C(p))}",
  "else{p.id=uid('POL-GLOBAL');p.version=1;p.createdAt=now();S.policies.unshift(C(p))}",
  'policy createdAt'
);

// Default rule is permanent: it may be INACTIVE but cannot be deleted.
patch(
  '<button data-delete-policy="${p.id}" class="v2-icon-btn v5-danger-icon" title="Delete">',
  '<button data-delete-policy="${p.id}" class="v2-icon-btn v5-danger-icon" title="${isDefaultPolicy(p)?\'Default route cannot be deleted; use Inactive\':\'Delete\'}" ${isDefaultPolicy(p)?\'disabled\':\'\'}>',
  'disable delete default rule'
);
patch(
  "function deletePolicy(){S.policies=S.policies.filter(x=>x.id!==S.payload?.policyId);S.modal=null;S.payload=null}",
  "function deletePolicy(){if(S.payload?.policyId==='POL-GLOBAL-DEFAULT'){alert('Default approval route cannot be deleted. Use Inactive instead.');S.modal=null;S.payload=null;return}S.policies=S.policies.filter(x=>x.id!==S.payload?.policyId);S.modal=null;S.payload=null}",
  'guard delete default rule'
);

const blobUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
try {
  await import(blobUrl);
} finally {
  URL.revokeObjectURL(blobUrl);
}
