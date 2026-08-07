export const currentUser = { id:'u-tuan-demo', name:'Tuấn Phạm', email:'tuan.pham@cake.vn', roles:['Tech Product Manager','Payout Admin'] }

export const users = [
  { id:'u-growth-head', name:'Growth Head', email:'growth.head@cake.vn' },
  { id:'u-finance-manager', name:'Finance Manager', email:'finance.manager@cake.vn' },
  { id:'u-director', name:'Growth Director', email:'growth.director@cake.vn' },
  { id:'u-ops-lead', name:'Ops Lead', email:'ops.lead@cake.vn' },
]
export const roles = ['Growth Head','Finance Approver','Finance Manager','Growth Director','Ops Approver']
export const campaigns = [
  { id:'TD_REFERRAL_2026', name:'TD Referral 2026', status:'ACTIVE', rewardType:'CASHBACK', currency:'VND', fixedAmount:100000, budgetTotal:1_000_000_000, budgetRemaining:420_000_000, dailyCap:200_000_000 },
  { id:'GROWTH_CASHBACK_Q3', name:'Growth Cashback Q3', status:'ACTIVE', rewardType:'CASHBACK', currency:'VND', fixedAmount:null, budgetTotal:2_000_000_000, budgetRemaining:760_000_000, dailyCap:300_000_000 },
]

export const initialPolicies = [
  { id:'POL-TD-001', name:'TD Referral · Low value', scopeType:'CAMPAIGN', scopeId:'TD_REFERRAL_2026', priority:100, status:'ACTIVE', version:1, effectiveFrom:'2026-08-01', effectiveTo:'', condition:{ basis:'FILE_TOTAL_AMOUNT', operator:'BETWEEN', from:0, to:50_000_000 }, steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head'}] },
  { id:'POL-TD-002', name:'TD Referral · Medium value', scopeType:'CAMPAIGN', scopeId:'TD_REFERRAL_2026', priority:100, status:'ACTIVE', version:2, effectiveFrom:'2026-08-01', effectiveTo:'', condition:{ basis:'FILE_TOTAL_AMOUNT', operator:'BETWEEN', from:50_000_000, to:200_000_000 }, steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head'},{order:2,level:'L2',approverType:'USER',approverRef:'u-finance-manager',label:'Finance Manager · finance.manager@cake.vn'}] },
  { id:'POL-TD-003', name:'TD Referral · High value', scopeType:'CAMPAIGN', scopeId:'TD_REFERRAL_2026', priority:100, status:'ACTIVE', version:1, effectiveFrom:'2026-08-01', effectiveTo:'', condition:{ basis:'FILE_TOTAL_AMOUNT', operator:'GREATER_THAN', from:200_000_000, to:null }, steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head'},{order:2,level:'L2',approverType:'ROLE',approverRef:'Finance Approver',label:'Finance Approver'},{order:3,level:'L3',approverType:'USER',approverRef:'u-director',label:'Growth Director · growth.director@cake.vn'}] },
  { id:'POL-GROWTH-DEFAULT', name:'Growth Cashback · Default route', scopeType:'CAMPAIGN', scopeId:'GROWTH_CASHBACK_Q3', priority:10, status:'ACTIVE', version:1, effectiveFrom:'2026-08-01', effectiveTo:'', condition:{ basis:'ALWAYS', operator:'ALWAYS', from:null, to:null }, steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head'},{order:2,level:'L2',approverType:'ROLE',approverRef:'Finance Approver',label:'Finance Approver'}] },
]

const recordsA = Array.from({length:18},(_,i)=>({
  id:`PAY-REC-${String(i+1).padStart(4,'0')}`, sourceRecordId:`TDREF-20260806-${String(i+1).padStart(4,'0')}`, customerId:`C${String(i+1).padStart(5,'0')}`,
  expectedAmount:100000, actualAmount:i<14?100000:null, accountRef:`00110000${String(i+1).padStart(4,'0')}`, eligibilityDate:'2026-08-06', validationStatus:'VALID',
  payoutStatus:i<14?'SUCCESS':i===14?'FAILED':i===15?'UNKNOWN':'READY', errorCode:i===14?'LIAB_TEMPORARY_ERROR':i===15?'TIMEOUT':'', liabTransactionId:i<14?`LIAB-TXN-${10000+i}`:'', retryCount:0
}))

export const initialRequests = [
  { id:'PAY-20260807-001', filename:'td_referral_20260806.xlsx', description:'TD Referral daily payout T-1', campaignId:'TD_REFERRAL_2026', campaignName:'TD Referral 2026', maker:'marketing.ops@cake.vn', uploadedAt:'2026-08-07T09:14:25', submittedAt:'2026-08-07T09:18:11', checksum:'demo-9d6fe8', totalRecords:18, validRecords:18, duplicateRecords:0, invalidRecords:0, selectedRecords:18, approvalTotalAmount:1_800_000, approvalStatus:'APPROVED', processingStatus:'PARTIALLY_FAILED', currentApprovalStep:null,
    approvalSnapshot:{ policyId:'POL-TD-001',policyName:'TD Referral · Low value',policyVersion:1,basis:'FILE_TOTAL_AMOUNT',matchedCondition:'0 < File Total Amount ≤ 50,000,000 VND',steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head',status:'APPROVED',actedBy:'growth.head@cake.vn',actedAt:'2026-08-07T09:20:10',remark:''}],snapshotAt:'2026-08-07T09:18:11' }, records:recordsA,
    activity:[{at:'2026-08-07T09:14:25',actor:'marketing.ops@cake.vn',action:'UPLOAD_FILE',detail:'Uploaded td_referral_20260806.xlsx'},{at:'2026-08-07T09:15:02',actor:'SYSTEM',action:'VALIDATION_PASSED',detail:'18 valid · 0 duplicate · 0 invalid'},{at:'2026-08-07T09:18:11',actor:'marketing.ops@cake.vn',action:'SUBMIT_APPROVAL',detail:'Resolved POL-TD-001 v1 · L1 Growth Head'},{at:'2026-08-07T09:20:10',actor:'growth.head@cake.vn',action:'APPROVE_L1',detail:'Final approval completed'}] },
  { id:'PAY-20260807-002', filename:'td_referral_20260807_morning.xlsx', description:'Morning payout file', campaignId:'TD_REFERRAL_2026', campaignName:'TD Referral 2026', maker:'growth.mkt@cake.vn', uploadedAt:'2026-08-07T14:05:20', submittedAt:'2026-08-07T14:10:00', checksum:'demo-a11c5c', totalRecords:820, validRecords:816, duplicateRecords:2, invalidRecords:2, selectedRecords:816, approvalTotalAmount:81_600_000, approvalStatus:'PENDING_L2', processingStatus:'UPLOADED', currentApprovalStep:2,
    approvalSnapshot:{ policyId:'POL-TD-002',policyName:'TD Referral · Medium value',policyVersion:2,basis:'FILE_TOTAL_AMOUNT',matchedCondition:'50,000,000 < File Total Amount ≤ 200,000,000 VND',steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head',status:'APPROVED',actedBy:'growth.head@cake.vn',actedAt:'2026-08-07T14:15:00',remark:''},{order:2,level:'L2',approverType:'USER',approverRef:'u-finance-manager',label:'Finance Manager · finance.manager@cake.vn',status:'PENDING',actedBy:'',actedAt:'',remark:''}],snapshotAt:'2026-08-07T14:10:00' },
    records:Array.from({length:20},(_,i)=>({id:`PAY2-REC-${i+1}`,sourceRecordId:`TDREF-20260807-${String(i+1).padStart(4,'0')}`,customerId:`C${String(500+i).padStart(5,'0')}`,expectedAmount:100000,actualAmount:null,accountRef:`00120000${String(i+1).padStart(4,'0')}`,eligibilityDate:'2026-08-07',validationStatus:'VALID',payoutStatus:'READY',errorCode:'',liabTransactionId:'',retryCount:0})),
    activity:[{at:'2026-08-07T14:05:20',actor:'growth.mkt@cake.vn',action:'UPLOAD_FILE',detail:'Uploaded td_referral_20260807_morning.xlsx'},{at:'2026-08-07T14:10:00',actor:'growth.mkt@cake.vn',action:'SUBMIT_APPROVAL',detail:'Resolved POL-TD-002 v2 · L1 → L2'},{at:'2026-08-07T14:15:00',actor:'growth.head@cake.vn',action:'APPROVE_L1',detail:'Waiting for L2 Finance Manager'}] }
]
