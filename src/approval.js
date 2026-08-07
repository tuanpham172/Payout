export function conditionMatches(condition, request) {
  if (!condition || condition.basis === 'ALWAYS') return true
  if (condition.basis === 'FILE_TOTAL_AMOUNT') {
    const amount = Number(request.approvalTotalAmount || 0)
    if (condition.operator === 'BETWEEN') return amount > Number(condition.from || 0) && amount <= Number(condition.to || 0)
    if (condition.operator === 'GREATER_THAN') return amount > Number(condition.from || 0)
  }
  return false
}
export function resolveApprovalPolicy(policies, request) {
  const matches = policies
    .filter(p=>p.status==='ACTIVE')
    .filter(p=>conditionMatches(p.condition,request))
    .sort((a,b)=>Number(b.priority||0)-Number(a.priority||0))
  if (!matches.length) return {policy:null,error:'NO_MATCHING_POLICY'}
  const topPriority=Number(matches[0].priority||0)
  const top=matches.filter(p=>Number(p.priority||0)===topPriority)
  if (top.length>1) return {policy:null,error:'AMBIGUOUS_POLICY',candidates:top}
  return {policy:top[0],error:null}
}
export function describeCondition(c) {
  if (!c || c.basis==='ALWAYS') return 'Always'
  if (c.operator==='BETWEEN') return `${num(c.from)} < File Total Amount ≤ ${num(c.to)} VND`
  if (c.operator==='GREATER_THAN') return `File Total Amount > ${num(c.from)} VND`
  return c.basis
}
export function snapshotPolicy(policy, request) {
  return { policyId:policy.id,policyName:policy.name,policyVersion:policy.version,basis:policy.condition.basis,matchedCondition:describeCondition(policy.condition),snapshotAt:new Date().toISOString(),approvalTotalAmount:request.approvalTotalAmount,steps:policy.steps.slice().sort((a,b)=>a.order-b.order).map((s,i)=>({...s,status:i===0?'PENDING':'NOT_STARTED',actedBy:'',actedAt:'',remark:''})) }
}
export const num=(v)=>Number(v||0).toLocaleString('vi-VN')
export const money=(v)=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(v||0))
export const dateTime=(v)=>{ if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d) }
export const shortMoney=(v)=>{v=Number(v||0);if(Math.abs(v)>=1e9)return`${(v/1e9).toFixed(v%1e9?1:0)}B`;if(Math.abs(v)>=1e6)return`${(v/1e6).toFixed(v%1e6?1:0)}M`;if(Math.abs(v)>=1e3)return`${(v/1e3).toFixed(v%1e3?1:0)}K`;return String(v)}