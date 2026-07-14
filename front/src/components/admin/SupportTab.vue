<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { 
  subscribeToSupportChats, 
  sendAdminSupportReply,
  subscribeToContactQueriesPaginated,
  updateContactQueryStatus, 
  deleteContactQuery 
} from '../db.js'

defineOptions({ name: 'SupportTab' })

const activeSubTab = ref('chats')

const supportThreads = ref([])
const selectedChatUserId = ref(null)
const adminChatText = ref('')
const chatSending = ref(false)
let _unsubSupport = null

const queries = ref([])
const loadingQueries = ref(true)
const queryError = ref('')
const searchQueries = ref('')
const statusFilter = ref('all')
const queryLimit = ref(10)
let _unsubQueries = null

_unsubSupport = subscribeToSupportChats(snap => {
  supportThreads.value = snap.docs
    .map(d => ({ userId: d.id, ...d.data() }))
    .sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0))
})

watch(queryLimit, (newLimit) => {
  if (_unsubQueries) _unsubQueries()
  loadingQueries.value = true
  queryError.value = ''
  _unsubQueries = subscribeToContactQueriesPaginated(newLimit, snap => {
    queries.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    loadingQueries.value = false
  }, (err) => {
    loadingQueries.value = false
    queryError.value = err?.message?.includes('index')
      ? 'Firestore index missing for contact_queries. Open browser console for the index creation link.'
      : (err?.message || 'Permission denied reading contact_queries. Check Firebase rules.')
  })
}, { immediate: true })

onUnmounted(() => {
  if (_unsubSupport) _unsubSupport()
  if (_unsubQueries) _unsubQueries()
})

const activeChatDoc = computed(() => supportThreads.value.find(t => t.userId === selectedChatUserId.value))
const pendingQueryCount = computed(() => queries.value.filter(q => (q.status || 'pending') === 'pending').length)

const sendAdminReply = async () => {
  if (!adminChatText.value.trim() || !selectedChatUserId.value) return
  chatSending.value = true
  try {
    await sendAdminSupportReply(selectedChatUserId.value, adminChatText.value.trim())
    adminChatText.value = ''
  } catch (e) {
    alert(e.message)
  }
  chatSending.value = false
}

const filteredQueries = computed(() => {
  const q = searchQueries.value.trim().toLowerCase()
  return queries.value.filter(item => {
    const matchStatus = statusFilter.value === 'all' || (item.status || 'pending') === statusFilter.value
    const haystack = `${item.name || ''} ${item.email || ''} ${item.phone || ''} ${item.subject || ''} ${item.query || ''} ${item.source || ''}`.toLowerCase()
    const matchSearch = !q || haystack.includes(q)
    return matchStatus && matchSearch
  })
})

const changeQueryStatus = async (id, status) => {
  try {
    await updateContactQueryStatus(id, status)
  } catch (e) {
    alert(e.message)
  }
}

const removeQuery = async (id) => {
  if (!confirm('Delete this query permanently?')) return
  try {
    await deleteContactQuery(id)
  } catch (e) {
    alert(e.message)
  }
}

const formatTime = (ts) => {
  if (!ts) return '—'
  if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString('en-IN', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})
  if (typeof ts === 'number') return new Date(ts).toLocaleString('en-IN', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})
  return '—'
}

const selectedQuery = ref(null)

const openQueryDetail = (q) => {
  selectedQuery.value = q
}

const formatQueryText = (text) => {
  if (!text) return ''
  return text.split('\n').filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('')
}
</script>

<template>
  <div class="support-container fade-in">
    <div class="tab-content-area">
      <div class="sub-tab-bar">
        <button :class="['sub-tab-btn', { active: activeSubTab === 'chats' }]" @click="activeSubTab = 'chats'">
          User Chats
        </button>
        <button :class="['sub-tab-btn', { active: activeSubTab === 'queries' }]" @click="activeSubTab = 'queries'">
          Contact Queries
          <span class="tab-count warn">{{ pendingQueryCount }}</span>
        </button>
      </div>

      <div v-if="activeSubTab === 'chats'" class="chat-shell fade-in">
        <div class="thread-list">
          <div class="thread-list-head">Active Client Sessions</div>
          <div v-if="supportThreads.length === 0" class="thread-empty">No active chats yet.</div>
          <div v-for="t in supportThreads" :key="t.userId"
               :class="['thread-item', { selected: selectedChatUserId === t.userId }]"
               @click="selectedChatUserId = t.userId">
            <div class="thread-name">{{ t.userName || 'Pahari User' }}</div>
            <div class="thread-uid">ID: {{ t.userId.substring(0, 8) }}…</div>
          </div>
        </div>

        <div class="chat-window">
          <div v-if="!selectedChatUserId" class="chat-placeholder">
            <p>Select a conversation from the sidebar.</p>
          </div>
          <template v-else>
            <div class="chat-messages">
              <div v-for="(msg, i) in activeChatDoc?.messages || []" :key="i"
                   :class="['bubble-wrap', msg.role === 'admin' ? 'mine' : 'theirs']">
                <div class="bubble-meta">{{ msg.role === 'admin' ? 'You (Admin)' : activeChatDoc?.userName }} · {{ formatTime(msg.timestamp) }}</div>
                <div :class="['bubble', msg.role === 'admin' ? 'bubble-admin' : 'bubble-user']">{{ msg.text }}</div>
              </div>
            </div>
            <div class="chat-input-bar">
              <input v-model="adminChatText" class="chat-input" placeholder="Type your reply..." @keyup.enter="sendAdminReply" />
              <button class="btn-send" :disabled="chatSending" @click="sendAdminReply">{{ chatSending ? '...' : 'Send' }}</button>
            </div>
          </template>
        </div>
      </div>

      <div v-if="activeSubTab === 'queries'" class="queries-shell fade-in">
        <div class="q-tools">
          <input v-model="searchQueries" class="q-search" placeholder="Search name, email, query…" />
          <select v-model="statusFilter" class="q-select">
            <option value="all">All Queries</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div v-if="queryError" class="q-error">{{ queryError }}</div>
        <div v-else-if="loadingQueries && queries.length === 0" class="q-empty">Loading queries…</div>
        <div v-else-if="filteredQueries.length === 0" class="q-empty">No queries found. Submissions from the public Contact page appear here (not in User Chats).</div>

        <div v-else class="q-table-shell">
          <table class="q-table">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Subject</th>
                <th>Source</th>
                <th>Status</th>
                <th>Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in filteredQueries" :key="q.id" @click="openQueryDetail(q)" class="q-row-clickable">
                <td>
                  <strong>{{ q.name || 'Anonymous' }}</strong>
                  <span>{{ q.email }}</span>
                  <span v-if="q.phone">{{ q.phone }}</span>
                </td>
                <td>{{ q.subject || '-' }}</td>
                <td><span class="source-pill">{{ q.source || 'contact' }}</span></td>
                <td>
                  <span class="q-pill" :class="q.status === 'resolved' ? 'ok' : 'wait'">{{ q.status || 'pending' }}</span>
                </td>
                <td>{{ formatTime(q.createdAt) }}</td>
                <td>
                  <div class="q-actions compact">
                    <button v-if="q.status !== 'resolved'" class="q-btn-soft" @click.stop="changeQueryStatus(q.id, 'resolved')">Resolve</button>
                    <button v-else class="q-btn-soft" @click.stop="changeQueryStatus(q.id, 'pending')">Reopen</button>
                    <button class="q-btn-danger" @click.stop="removeQuery(q.id)">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="q-load-more" v-if="queries.length >= queryLimit">
            <button class="q-btn" @click="queryLimit += 10">Load 10 older queries</button>
          </div>
        </div>
      </div>

      <Teleport to="body">
        <div v-if="selectedQuery" class="query-modal-overlay" @click.self="selectedQuery = null">
          <div class="query-modal">
            <div class="modal-header">
              <h3>Contact Query Details</h3>
              <button class="modal-close" @click="selectedQuery = null" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
              <div class="detail-row">
                <label>Name</label>
                <span>{{ selectedQuery.name || 'Anonymous' }}</span>
              </div>
              <div class="detail-row">
                <label>Email</label>
                <span>{{ selectedQuery.email }}</span>
              </div>
              <div class="detail-row" v-if="selectedQuery.phone">
                <label>Phone</label>
                <span>{{ selectedQuery.phone }}</span>
              </div>
              <div class="detail-row">
                <label>Subject</label>
                <span>{{ selectedQuery.subject || '—' }}</span>
              </div>
              <div class="detail-row">
                <label>Source</label>
                <span><span class="source-pill">{{ selectedQuery.source || 'contact' }}</span></span>
              </div>
              <div class="detail-row">
                <label>Status</label>
                <span><span class="q-pill" :class="selectedQuery.status === 'resolved' ? 'ok' : 'wait'">{{ selectedQuery.status || 'pending' }}</span></span>
              </div>
              <div class="detail-row">
                <label>Received</label>
                <span>{{ formatTime(selectedQuery.createdAt) }}</span>
              </div>
              <div class="detail-row full-width">
                <label>Message</label>
                <div class="query-message" v-html="formatQueryText(selectedQuery.query)"></div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="q-btn-soft" @click="selectedQuery = null">Close</button>
              <button v-if="selectedQuery.status !== 'resolved'" class="q-btn" @click="changeQueryStatus(selectedQuery.id, 'resolved'); selectedQuery = null">Mark Resolved</button>
              <button v-else class="q-btn-soft" @click="changeQueryStatus(selectedQuery.id, 'pending'); selectedQuery = null">Reopen</button>
              <button class="q-btn-danger" @click="removeQuery(selectedQuery.id); selectedQuery = null">Delete</button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.support-container { display: flex; flex-direction: column; height: calc(100vh - 120px); }
.sub-tab-bar { display: flex; gap: 6px; padding: 12px 16px 8px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; }
.sub-tab-btn { background: transparent; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.15s; font-size: 0.85rem; }
.sub-tab-btn:hover { background: #E2E8F0; }
.sub-tab-btn.active { background: #FFFFFF; color: #0F2A1F; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
.tab-content-area { flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 0 0 8px 8px; overflow: hidden; display: flex; flex-direction: column; }
.chat-shell { display: flex; height: 100%; flex: 1; }
.thread-list { width: 300px; border-right: 1px solid #E2E8F0; display: flex; flex-direction: column; background: #F8FAFC; overflow-y: auto; }
.thread-list-head { padding: 16px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; color: #64748B; background: #FFFFFF; }
.thread-empty { padding: 20px; text-align: center; color: #64748B; font-size: 0.85rem; }
.thread-item { padding: 16px; border-bottom: 1px solid #E2E8F0; cursor: pointer; transition: background 0.15s; }
.thread-item:hover { background: #F1F5F9; }
.thread-item.selected { background: #ECFDF5; border-left: 4px solid #15803D; }
.thread-name { font-weight: 800; font-size: 0.95rem; color: #0F172A; }
.thread-uid { font-size: 0.75rem; color: #64748B; margin-top: 4px; font-family: monospace; }
.chat-window { flex: 1; display: flex; flex-direction: column; background: #FFFFFF; }
.chat-placeholder { flex: 1; display: flex; align-items: center; justify-content: center; color: #94A3B8; font-weight: 600; }
.chat-messages { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; background: #FAFAF9; }
.bubble-wrap { display: flex; flex-direction: column; max-width: 75%; }
.bubble-wrap.mine { align-self: flex-end; align-items: flex-end; }
.bubble-wrap.theirs { align-self: flex-start; align-items: flex-start; }
.bubble-meta { font-size: 0.7rem; color: #64748B; font-weight: 700; margin-bottom: 4px; }
.bubble { padding: 12px 16px; border-radius: 8px; font-size: 0.95rem; line-height: 1.5; font-weight: 500; }
.bubble-admin { background: #0F2A1F; color: #FFFFFF; border-radius: 12px 12px 2px 12px; }
.bubble-user { background: #FFFFFF; color: #0F172A; border: 1px solid #CBD5E1; border-radius: 12px 12px 12px 2px; }
.chat-input-bar { padding: 16px; border-top: 1px solid #E2E8F0; display: flex; gap: 10px; background: #FFFFFF; }
.chat-input { flex: 1; padding: 12px 16px; border: 2px solid #CBD5E1; border-radius: 8px; font-size: 0.95rem; outline: none; font-family: inherit; }
.chat-input:focus { border-color: #0F2A1F; }
.btn-send { background: #0F2A1F; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 800; cursor: pointer; }
.queries-shell { padding: 16px 20px; overflow-y: auto; height: 100%; box-sizing: border-box; }
.q-tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
.q-search, .q-select { border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 12px; background: #FFF; outline: none; }
.q-search { flex: 1; min-width: 250px; }
.q-error { background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; padding: 12px; border-radius: 8px; font-weight: 700; margin-bottom: 12px; font-size: 0.85rem; }
.q-empty { padding: 32px 16px; text-align: center; color: #64748B; font-weight: 600; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; font-size: 0.85rem; }
.q-table-shell { border: 1px solid #E5E7EB; border-radius: 8px; overflow-x: auto; background: #FFFFFF; }
.q-table { width: 100%; border-collapse: collapse; min-width: 1200px; table-layout: fixed; }
.q-table th { text-align: left; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; background: #F8FAFC; padding: 10px 12px; border-bottom: 1px solid #E5E7EB; }
.q-table td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; color: #334155; vertical-align: top; font-size: 0.8rem; word-wrap: break-word; overflow-wrap: break-word; }
.q-table td strong { display: block; color: #0F172A; font-weight: 800; }
.q-table td span { display: block; margin-top: 3px; color: #64748B; font-size: 0.75rem; }
.query-cell { max-width: 450px; white-space: normal; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.5; }
.source-pill { display: inline-flex; padding: 3px 8px; border-radius: 999px; background: #F1F5F9; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
.q-pill { display: inline-flex; padding: 3px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
.q-pill.wait { background: #FEF3C7; color: #92400E; }
.q-pill.ok { background: #DCFCE7; color: #15803D; }
.q-actions.compact { display: flex; gap: 6px; flex-wrap: wrap; }
.q-load-more { display: flex; justify-content: center; padding: 12px; }
.q-btn { background: #0F2A1F; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.8rem; }
.query-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; animation: fIn 0.2s ease-out; }
.query-modal { background: #FFFFFF; border-radius: 12px; max-width: 640px; width: 100%; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: popIn 0.25s cubic-bezier(0.16,1,0.3,1); }
@keyframes popIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: none; } }
.query-modal .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; }
.query-modal .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0F172A; }
.query-modal .modal-close { background: none; border: none; font-size: 1.5rem; color: #64748B; cursor: pointer; padding: 0 8px; line-height: 1; }
.query-modal .modal-close:hover { color: #0F172A; }
.query-modal .modal-body { padding: 20px; overflow-y: auto; }
.query-modal .detail-row { display: grid; grid-template-columns: 140px 1fr; gap: 12px 16px; padding: 10px 0; border-bottom: 1px solid #F1F5F9; align-items: start; }
.query-modal .detail-row.full-width { grid-template-columns: 1fr; gap: 6px; }
.query-modal .detail-row:last-child { border-bottom: none; }
.query-modal .detail-row label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #64748B; letter-spacing: 0.04em; }
.query-modal .detail-row span { color: #0F172A; font-size: 0.9rem; line-height: 1.5; word-wrap: break-word; }
.query-modal .query-message { background: #FAFAF9; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; font-size: 0.95rem; line-height: 1.6; color: #1E1E1E; white-space: pre-wrap; }
.query-modal .query-message p { margin: 0 0 0.75em; }
.query-modal .query-message p:last-child { margin-bottom: 0; }
.query-modal .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid #E2E8F0; background: #F8FAFC; flex-wrap: wrap; }
@media (max-width: 640px) {
  .query-modal .detail-row { grid-template-columns: 1fr; gap: 4px; }
  .query-modal .detail-row label { font-size: 0.7rem; }
}
.q-btn-soft { background: #F1F5F9; color: #0F172A; border: 1px solid #CBD5E1; border-radius: 6px; padding: 5px 10px; font-weight: 700; cursor: pointer; font-size: 0.75rem; }
.q-btn-danger { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 6px; padding: 5px 10px; font-weight: 700; cursor: pointer; font-size: 0.75rem; }
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
@media (max-width: 768px) {
  .chat-shell { flex-direction: column; }
  .thread-list { width: 100%; height: 180px; border-right: none; border-bottom: 1px solid #E2E8F0; }
}
</style>
