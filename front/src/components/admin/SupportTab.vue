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
  if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString('en-IN')
  if (typeof ts === 'number') return new Date(ts).toLocaleString('en-IN')
  return '—'
}
</script>

<template>
  <div class="support-container fade-in">
    <div class="ws-head">
      <div>
        <h2 class="ws-title">Support & Inbox</h2>
        <p class="ws-sub">Registered chats live-update. Public contact form submissions appear under Contact Queries.</p>
      </div>

      <div class="support-tabs">
        <button :class="['sub-tab-btn', { active: activeSubTab === 'chats' }]" @click="activeSubTab = 'chats'">
          User Chats
          <span v-if="supportThreads.length" class="tab-count">{{ supportThreads.length }}</span>
        </button>
        <button :class="['sub-tab-btn', { active: activeSubTab === 'queries' }]" @click="activeSubTab = 'queries'">
          Contact Queries
          <span v-if="pendingQueryCount" class="tab-count warn">{{ pendingQueryCount }}</span>
        </button>
      </div>
    </div>

    <div class="tab-content-area">
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
                <th>Message</th>
                <th>Source</th>
                <th>Status</th>
                <th>Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in filteredQueries" :key="q.id">
                <td>
                  <strong>{{ q.name || 'Anonymous' }}</strong>
                  <span>{{ q.email }}</span>
                  <span v-if="q.phone">{{ q.phone }}</span>
                </td>
                <td>{{ q.subject || '-' }}</td>
                <td class="query-cell">{{ q.query }}</td>
                <td><span class="source-pill">{{ q.source || 'contact' }}</span></td>
                <td>
                  <span class="q-pill" :class="q.status === 'resolved' ? 'ok' : 'wait'">{{ q.status || 'pending' }}</span>
                </td>
                <td>{{ formatTime(q.createdAt) }}</td>
                <td>
                  <div class="q-actions compact">
                    <button v-if="q.status !== 'resolved'" class="q-btn-soft" @click="changeQueryStatus(q.id, 'resolved')">Resolve</button>
                    <button v-else class="q-btn-soft" @click="changeQueryStatus(q.id, 'pending')">Reopen</button>
                    <button class="q-btn-danger" @click="removeQuery(q.id)">Delete</button>
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
    </div>
  </div>
</template>

<style scoped>
.support-container { display: flex; flex-direction: column; height: calc(100vh - 120px); }
.ws-head { margin-bottom: 24px; }
.ws-title { font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0; }
.ws-sub { color: #64748B; font-size: 0.9rem; margin-top: 4px; }
.support-tabs { display: flex; gap: 10px; margin-top: 16px; background: #F1F5F9; padding: 6px; border-radius: 8px; width: fit-content; flex-wrap: wrap; }
.sub-tab-btn { background: transparent; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
.sub-tab-btn.active { background: #FFFFFF; color: #0F2A1F; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.tab-count { background: #E2E8F0; color: #0F172A; border-radius: 999px; padding: 2px 8px; font-size: 0.72rem; font-weight: 800; }
.tab-count.warn { background: #FEF3C7; color: #92400E; }
.tab-content-area { flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
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
.queries-shell { padding: 20px; overflow-y: auto; height: 100%; box-sizing: border-box; }
.q-tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 20px; }
.q-search, .q-select { border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 12px; background: #FFF; outline: none; }
.q-search { flex: 1; min-width: 250px; }
.q-error { background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; padding: 14px; border-radius: 8px; font-weight: 700; margin-bottom: 16px; }
.q-empty { padding: 40px 20px; text-align: center; color: #64748B; font-weight: 600; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; }
.q-table-shell { border: 1px solid #E5E7EB; border-radius: 8px; overflow-x: auto; background: #FFFFFF; }
.q-table { width: 100%; border-collapse: collapse; min-width: 980px; }
.q-table th { text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; background: #F8FAFC; padding: 12px 14px; border-bottom: 1px solid #E5E7EB; }
.q-table td { padding: 14px; border-bottom: 1px solid #F1F5F9; color: #334155; vertical-align: top; font-size: 0.9rem; }
.q-table td strong { display: block; color: #0F172A; font-weight: 800; }
.q-table td span { display: block; margin-top: 3px; color: #64748B; font-size: 0.82rem; }
.query-cell { max-width: 320px; white-space: pre-wrap; line-height: 1.45; }
.source-pill { display: inline-flex; padding: 4px 8px; border-radius: 999px; background: #F1F5F9; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
.q-pill { display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
.q-pill.wait { background: #FEF3C7; color: #92400E; }
.q-pill.ok { background: #DCFCE7; color: #15803D; }
.q-actions.compact { display: flex; gap: 8px; flex-wrap: wrap; }
.q-load-more { display: flex; justify-content: center; padding: 16px; }
.q-btn { background: #0F2A1F; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; }
.q-btn-soft { background: #F1F5F9; color: #0F172A; border: 1px solid #CBD5E1; border-radius: 6px; padding: 6px 12px; font-weight: 700; cursor: pointer; font-size: 0.8rem; }
.q-btn-danger { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 6px; padding: 6px 12px; font-weight: 700; cursor: pointer; font-size: 0.8rem; }
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
@media (max-width: 768px) {
  .chat-shell { flex-direction: column; }
  .thread-list { width: 100%; height: 180px; border-right: none; border-bottom: 1px solid #E2E8F0; }
  .support-tabs { flex-direction: column; width: 100%; }
}
</style>
