// Payout prototype v6: UI/approval-rule refinements layered on top of v5.
// The prototype keeps v5 as the baseline and applies a small, explicit source patch at load time.

const response = await fetch('./app-v5.js');
if (!response.ok) throw new Error(`Cannot load app-v5.js: ${response.status}`);
let src = await response.text();

function patch(from, to, label) {
  if (!src.includes(from)) throw new Error(`v6 patch target not found: ${label}`);
  src = src.replace(from, to);
}

function patchRegex(regex, to, label) {
  if (!regex.test(src)) throw new Error(`v6 patch target not found: ${label}`);
  src = src.replace(regex, to);
}

// Approval amount boundaries are inclusive: From >= and To <=.
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

// Priority: smaller number is higher priority. If several rules match, take the first after ascending sort.
patch(
  "function resolvePolicy(policies,amount,module='PAYOUT'){const m=policies.filter(p=>p.status==='ACTIVE'&&p.module===module&&conditionMatches(p.condition,amount)).sort((a,b)=>b.priority-a.priority);if(!m.length)return{error:'NO_MATCHING_POLICY'};const top=m.filter(p=>p.priority===m[0].priority);if(top.length>1)return{error:'AMBIGUOUS_POLICY'};return{policy:top[0]}}",
  "function resolvePolicy(policies,amount,module='PAYOUT'){const m=policies.filter(p=>p.status==='ACTIVE'&&p.module===module&&conditionMatches(p.condition,amount)).sort((a,b)=>Number(a.priority)-Number(b.priority));if(!m.length)return{error:'NO_MATCHING_POLICY'};return{policy:m[0]}}",
  'resolvePolicy'
);

// Rebalance demo policies so the sample data follows the new priority convention.
patch("name:'Low value payout',priority:100", "name:'Low value payout',priority:0", 'seed low priority');
patch("name:'Medium value payout',priority:100", "name:'Medium value payout',priority:1", 'seed medium priority');
patch("name:'High value payout',priority:100", "name:'High value payout',priority:2", 'seed high priority');
patch("name:'Default approval route',priority:10", "name:'Default approval route',priority:999", 'seed default priority');

// Listing: remove Accepted / Imported column entirely.
patch('<th>Accepted / Imported</th>', '', 'listing header accepted/imported');
patch('<td>${r.acceptedRows} / ${r.importedRows}</td>', '', 'listing cell accepted/imported');

// Detail: show only Imported Rows, where Imported Rows means successfully imported/accepted payout records.
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

// Detail overview cleanup: English status wording and remove approval snapshot / lifecycle sections.
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

// Upload review: remove resolved policy presentation. Resolution still happens in business logic before submit.
patch(
  '<div class="v2-panel"><p><b>Resolved policy:</b> ${a.resolution.policy?esc(a.resolution.policy.name):esc(a.resolution.error)}</p></div>',
  '',
  'remove resolved policy display'
);

// Records: use English wording for user-facing groups and descriptions.
patch(
  '<p>Accepted records được hiển thị ngay sau submit; final result từ LIAB sẽ phân loại sang Success hoặc Failed.</p>',
  '<p>Imported records are available immediately after submit; LIAB final results are grouped into Success or Failed / Exception.</p>',
  'records description english'
);
patch('>Chưa xử lý <span>${unprocessed.length}</span>', '>Pending <span>${unprocessed.length}</span>', 'records pending tab');
patch('>Thành công <span>${success.length}</span>', '>Success <span>${success.length}</span>', 'records success tab');
patch('>Thất bại / Exception <span>${failed.length}</span>', '>Failed / Exception <span>${failed.length}</span>', 'records failed tab');
patch('Không có record trong nhóm này.', 'No records in this group.', 'records empty state english');

// Approval tab: remove explanatory sentence and the policy/current-step side panel.
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

// English confirmation copy for record processing states.
patch(
  '<p>Records vẫn nằm ở tab Chưa xử lý trong khi LIAB đang processing.</p>',
  '<p>Records remain in the Pending tab while LIAB is processing.</p>',
  'processing confirm english'
);
patch(
  '<p>Final result sẽ chuyển records sang Thành công hoặc Thất bại / Exception.</p>',
  '<p>Final results move records to Success or Failed / Exception.</p>',
  'final result confirm english'
);

// Approval rule form labels and priority behavior.
patch('<label>From amount<input', '<label>From amount (>=)<input', 'from amount label');
patch('<label>To amount<input', '<label>To amount (<=)<input', 'to amount label');
patch(
  '<label>Priority<input id="pol-priority" type="number" min="0" value="${p.priority}"></label>',
  '<label>Priority<input id="pol-priority" type="number" min="0" value="${p.priority}"><small>0 là ưu tiên cao nhất; hệ thống kiểm tra rule theo priority tăng dần.</small></label>',
  'priority helper text'
);
patch("name:'',priority:100,status:'DRAFT'", "name:'',priority:0,status:'DRAFT'", 'new policy default priority');

// No overlap validation. Amount range validation remains.
patchRegex(
  /function validatePolicy\(p,activate\)\{[^\n]+\}/,
  "function validatePolicy(p,activate){if(!p.name.trim())return'Rule name is required.';if(p.module!=='PAYOUT')return'Module must be PAYOUT in MVP.';if(!Number.isFinite(Number(p.priority))||Number(p.priority)<0)return'Priority must be a non-negative number.';if(!p.steps.length)return'At least one approval step is required.';if(p.steps.some(s=>!(s.roleRefs||[]).length&&!(s.userRefs||[]).length))return'Every approval step must have at least one ROLE or USER.';if(p.condition.basis==='FILE_TOTAL_AMOUNT'){const from=Number(p.condition.from||0);if(from<0)return'From amount cannot be negative.';if(p.condition.operator==='BETWEEN'&&!(Number(p.condition.to)>=from))return'To amount must be greater than or equal to From amount.'}return''}",
  'validatePolicy overlap removal'
);

const blobUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
try {
  await import(blobUrl);
} finally {
  URL.revokeObjectURL(blobUrl);
}
