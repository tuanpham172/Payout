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

// Demo-only authority values. Approval Configuration is GLOBAL and not tied to Campaign.
export const initialPolicies = [
  { id:'POL-GLOBAL-001', name:'Low value payout', priority:100, status:'ACTIVE', version:1, condition:{ basis:'FILE_TOTAL_AMOUNT', operator:'BETWEEN', from:0, to:5_000_000 }, steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head'}] },
  { id:'POL-GLOBAL-002', name:'Medium value payout', priority:100, status:'ACTIVE', version:2, condition:{ basis:'FILE_TOTAL_AMOUNT', operator:'BETWEEN', from:5_000_000, to:10_000_000 }, steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head'},{order:2,level:'L2',approverType:'USER',approverRef:'u-finance-manager',label:'Finance Manager · finance.manager@cake.vn'}] },
  { id:'POL-GLOBAL-003', name:'High value payout', priority:100, status:'ACTIVE', version:1, condition:{ basis:'FILE_TOTAL_AMOUNT', operator:'GREATER_THAN', from:10_000_000, to:null }, steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head'},{order:2,level:'L2',approverType:'ROLE',approverRef:'Finance Approver',label:'Finance Approver'},{order:3,level:'L3',approverType:'USER',approverRef:'u-director',label:'Growth Director · growth.director@cake.vn'}] },
  { id:'POL-GLOBAL-DEFAULT', name:'Default approval route', priority:10, status:'ACTIVE', version:1, condition:{ basis:'ALWAYS', operator:'ALWAYS', from:null, to:null }, steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head'}] },
]

function demoRow(i, overrides={}) {
  return {
    id:`DEMO-REC-${String(i).padStart(4,'0')}`,
    rowNumber:i,
    sourceRecordId:`TDREF-20260807-${String(i).padStart(4,'0')}`,
    customerId:`C${String(5000+i).padStart(6,'0')}`,
    campaignId:'TD_REFERRAL_2026',
    expectedAmount:100000,
    actualAmount:null,
    accountRef:`00120000${String(i).padStart(4,'0')}`,
    eligibilityDate:'2026-08-06',
    validationStatus:'VALID',
    validationErrors:[],
    selectionStatus:'SELECTED',
    selected:true,
    payoutStatus:'READY',
    errorCode:'',
    errorMessage:'',
    liabTransactionId:'',
    retryCount:0,
    ...overrides
  }
}

const recordsA = Array.from({length:18},(_,i)=>demoRow(i+1,{
  id:`PAY1-REC-${String(i+1).padStart(4,'0')}`,
  sourceRecordId:`TDREF-20260806-${String(i+1).padStart(4,'0')}`,
  customerId:`C${String(i+1).padStart(5,'0')}`,
  eligibilityDate:'2026-08-05',
  actualAmount:i<14?100000:null,
  payoutStatus:i<14?'SUCCESS':i===14?'FAILED':i===15?'UNKNOWN':'READY',
  errorCode:i===14?'LIAB_TEMPORARY_ERROR':i===15?'LIAB_TIMEOUT':'',
  errorMessage:i===14?'LIAB temporary service error; retryable.':i===15?'No deterministic result from LIAB; reconciliation required.':'',
  liabTransactionId:i<14?`LIAB-TXN-${10000+i}`:''
}))

const recordsB = Array.from({length:67},(_,idx)=>demoRow(idx+1))
// 3 duplicate rows.
recordsB[60] = demoRow(61,{sourceRecordId:recordsB[4].sourceRecordId,validationStatus:'DUPLICATE',validationErrors:['Duplicate source_record_id in source file'],selectionStatus:'NOT_SELECTED',selected:false,payoutStatus:'BLOCKED',errorMessage:'Duplicate source_record_id in source file'})
recordsB[61] = demoRow(62,{sourceRecordId:recordsB[11].sourceRecordId,validationStatus:'DUPLICATE',validationErrors:['Duplicate source_record_id in source file'],selectionStatus:'NOT_SELECTED',selected:false,payoutStatus:'BLOCKED',errorMessage:'Duplicate source_record_id in source file'})
recordsB[62] = demoRow(63,{sourceRecordId:recordsB[17].sourceRecordId,validationStatus:'DUPLICATE',validationErrors:['Duplicate source_record_id in source file'],selectionStatus:'NOT_SELECTED',selected:false,payoutStatus:'BLOCKED',errorMessage:'Duplicate source_record_id in source file'})
// 4 invalid rows with explicit reasons.
recordsB[63] = demoRow(64,{customerId:'',validationStatus:'INVALID',validationErrors:['Missing customer_id'],selectionStatus:'NOT_SELECTED',selected:false,payoutStatus:'BLOCKED',errorMessage:'Missing customer_id'})
recordsB[64] = demoRow(65,{expectedAmount:120000,validationStatus:'INVALID',validationErrors:['Amount mismatch: Campaign fixed reward is 100,000 VND'],selectionStatus:'NOT_SELECTED',selected:false,payoutStatus:'BLOCKED',errorMessage:'Amount mismatch: Campaign fixed reward is 100,000 VND'})
recordsB[65] = demoRow(66,{accountRef:'',validationStatus:'INVALID',validationErrors:['Missing account_ref'],selectionStatus:'NOT_SELECTED',selected:false,payoutStatus:'BLOCKED',errorMessage:'Missing account_ref'})
recordsB[66] = demoRow(67,{eligibilityDate:'',validationStatus:'INVALID',validationErrors:['Missing eligibility_date'],selectionStatus:'NOT_SELECTED',selected:false,payoutStatus:'BLOCKED',errorMessage:'Missing eligibility_date'})

export const initialRequests = [
  { id:'PAY-20260807-001', filename:'td_referral_20260806.xlsx', description:'TD Referral daily payout T-1', campaignId:'TD_REFERRAL_2026', campaignName:'TD Referral 2026', maker:'marketing.ops@cake.vn', uploadedAt:'2026-08-07T09:14:25', submittedAt:'2026-08-07T09:18:11', checksum:'demo-9d6fe8', totalRecords:18, validRecords:18, duplicateRecords:0, invalidRecords:0, selectedRecords:18, approvalTotalAmount:1_800_000, approvalStatus:'APPROVED', processingStatus:'PARTIALLY_FAILED', currentApprovalStep:null,
    approvalSnapshot:{ policyId:'POL-GLOBAL-001',policyName:'Low value payout',policyVersion:1,basis:'FILE_TOTAL_AMOUNT',matchedCondition:'0 < File Total Amount ≤ 5,000,000 VND',steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head',status:'APPROVED',actedBy:'growth.head@cake.vn',actedAt:'2026-08-07T09:20:10',remark:''}],snapshotAt:'2026-08-07T09:18:11' }, records:recordsA,
    activity:[{at:'2026-08-07T09:14:25',actor:'marketing.ops@cake.vn',action:'UPLOAD_FILE',detail:'Uploaded td_referral_20260806.xlsx'},{at:'2026-08-07T09:15:02',actor:'SYSTEM',action:'VALIDATION_PASSED',detail:'18 valid · 0 duplicate · 0 invalid'},{at:'2026-08-07T09:18:11',actor:'marketing.ops@cake.vn',action:'SUBMIT_APPROVAL',detail:'Resolved POL-GLOBAL-001 v1 · L1 Growth Head'},{at:'2026-08-07T09:20:10',actor:'growth.head@cake.vn',action:'APPROVE_L1',detail:'Final approval completed'}] },
  { id:'PAY-20260807-002', filename:'td_referral_demo_67_rows.xlsx', description:'TD Referral demo source file', campaignId:'TD_REFERRAL_2026', campaignName:'TD Referral 2026', maker:'growth.mkt@cake.vn', uploadedAt:'2026-08-07T14:05:20', submittedAt:'2026-08-07T14:10:00', checksum:'demo-a11c5c', totalRecords:67, validRecords:60, duplicateRecords:3, invalidRecords:4, selectedRecords:60, approvalTotalAmount:6_000_000, approvalStatus:'PENDING_L2', processingStatus:'NOT_STARTED', currentApprovalStep:2,
    approvalSnapshot:{ policyId:'POL-GLOBAL-002',policyName:'Medium value payout',policyVersion:2,basis:'FILE_TOTAL_AMOUNT',matchedCondition:'5,000,000 < File Total Amount ≤ 10,000,000 VND',steps:[{order:1,level:'L1',approverType:'ROLE',approverRef:'Growth Head',label:'Growth Head',status:'APPROVED',actedBy:'growth.head@cake.vn',actedAt:'2026-08-07T14:15:00',remark:''},{order:2,level:'L2',approverType:'USER',approverRef:'u-finance-manager',label:'Finance Manager · finance.manager@cake.vn',status:'PENDING',actedBy:'',actedAt:'',remark:''}],snapshotAt:'2026-08-07T14:10:00' }, records:recordsB,
    activity:[{at:'2026-08-07T14:05:20',actor:'growth.mkt@cake.vn',action:'UPLOAD_FILE',detail:'Uploaded td_referral_demo_67_rows.xlsx'},{at:'2026-08-07T14:05:35',actor:'SYSTEM',action:'VALIDATION_COMPLETED',detail:'60 valid · 3 duplicate · 4 invalid · 60 selected'},{at:'2026-08-07T14:10:00',actor:'growth.mkt@cake.vn',action:'SUBMIT_APPROVAL',detail:'Resolved POL-GLOBAL-002 v2 · L1 → L2'},{at:'2026-08-07T14:15:00',actor:'growth.head@cake.vn',action:'APPROVE_L1',detail:'Waiting for L2 Finance Manager'}] }
]
