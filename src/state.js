import { initialPolicies, initialRequests } from './data.js'

export const deepClone = o => JSON.parse(JSON.stringify(o))
export const state = {
  requests: deepClone(initialRequests),
  policies: deepClone(initialPolicies),
  page: 'requests',
  selectedRequestId: null,
  modal: null,
  filters: { detailTab: 'overview', recordSubTab: 'selected' },
  configDraft: null,
  uploadDraft: null,
  openApprovalMenuId: null
}

export const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))
export const now = () => new Date().toISOString()
export const selectedRequest = () => state.requests.find(r => r.id === state.selectedRequestId)
export const currentStep = r => r.approvalSnapshot?.steps?.find(s => s.status === 'PENDING')
export const selectedRecords = r => r.records.filter(x => x.selected)
export const issueRecords = r => r.records.filter(x => !x.selected)
export const existingIds = () => new Set(state.requests.flatMap(r => r.records.filter(x => x.sourceRecordId && x.validationStatus === 'VALID').map(x => x.sourceRecordId)))

export const statusClass = v => ({
  APPROVED:'green', COMPLETED:'green', SUCCESS:'green', ACTIVE:'green', VALID:'green', SELECTED:'green',
  PENDING:'pink', PENDING_L1:'pink', PENDING_L2:'pink', PENDING_L3:'pink',
  UPLOADED:'gray', READY:'gray', NOT_STARTED:'gray', UNPROCESSED:'gray', NOT_SELECTED:'gray', DRAFT:'navy', SUBMITTED:'navy',
  PROCESSING:'blue', RETRYING:'blue',
  PARTIALLY_FAILED:'orange', UNKNOWN:'orange', RECONCILIATION_REQUIRED:'orange', BLOCKED_BY_LIMIT:'orange',
  FAILED:'red', REJECTED:'red', INVALID:'red', BLOCKED:'red', DUPLICATE:'purple', INACTIVE:'gray'
}[v] || 'gray')

export const prettyStatus = v => String(v || '—').replace('PENDING_L', 'Pending L').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
export const pill = (v, label) => `<span class="status-pill status-${statusClass(v)}">${esc(label || prettyStatus(v))}</span>`
export const icon = n => `<span class="ico">${({search:'⌕',upload:'⇧',eye:'◉',back:'←',check:'✓',x:'×',clock:'◷',download:'⇩',refresh:'↻',retry:'↺',plus:'+',copy:'⧉',power:'⏻',pencil:'✎',trash:'⌫',file:'▤',route:'⇢',shield:'◇',warning:'!',settings:'⚙',payout:'$',marketing:'◆',users:'♙',ticket:'▣',send:'➤',layers:'▱',rocket:'↗',down:'⌄',right:'›',play:'▶'}[n] || '•')}</span>`
export const errorText = r => (r.validationErrors || []).join('; ') || r.errorMessage || r.errorCode || '—'
