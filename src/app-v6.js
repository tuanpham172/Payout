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
