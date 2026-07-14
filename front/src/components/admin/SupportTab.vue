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
const openQueryDetail = (q) => { selectedQuery.value = q }

const formatQueryText = (text) => {
  if (!text) return ''
  return text.split('\n').filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('')
}
</script>

<template>
  <div class="support-container fade-in">
    
    <!-- Minimalist Sub-Tab Navigation -->
    <div class="clean-tabs-bar">
      <button :class="['clean-tab', { active: activeSubTab === 'chats' }]" @click="activeSubTab = 'chats'">
        User Chats
      </button>
      <button :class="['clean-tab', { active: activeSubTab === 'queries' }]" @click="activeSubTab = 'queries'">
        Contact Queries
        <span v-if="pendingQueryCount > 0" class="tab-badge">{{ pendingQueryCount }}</span>
      </button>
    </div>

    <!-- ─── USER CHATS INTERFACE ─── -->
    <div v-if="activeSubTab === 'chats'" class="workspace-area chat-workspace fade-in">
      
      <!-- Independent Scroller: User List -->
      <div class="thread-list-pane scroller">
        <div class="pane-header">Active Sessions</div>
        <div v-if="supportThreads.length === 0" class="empty-state">No active chats.</div>
        
        <div v-for="t in supportThreads" :key="t.userId"
             :class="['user-thread-card', { active: selectedChatUserId === t.userId }]"
             @click="selectedChatUserId = t.userId">
          <div class="avatar-circle">{{ (t.userName || 'U')[0].toUpperCase() }}</div>
          <div class="thread-info">
            <span class="thread-name">{{ t.userName || 'Pahari User' }}</span>
            <span class="thread-id">ID: {{ t.userId.substring(0, 8) }}…</span>
          </div>
        </div>
      </div>

      <!-- Independent Scroller: Chat Window -->
      <div class="chat-window-pane">
        <div v-if="!selectedChatUserId" class="empty-state fill-height">
          <span class="icon">💬</span>
          <p>Select a user from the list to start chatting.</p>
        </div>
        
        <template v-else>
          <div class="chat-header">
            <strong>{{ activeChatDoc?.userName || 'Pahari User' }}</strong>
            <span class="chat-id-tag">ID: {{ selectedChatUserId }}</span>
          </div>

          <div class="chat-messages-area scroller">
            <div v-for="(msg, i) in activeChatDoc?.messages || []" :key="i"
                 :class="['chat-bubble-wrapper', msg.role === 'admin' ? 'is-admin' : 'is-user']">
              <span class="bubble-time">{{ formatTime(msg.timestamp) }}</span>
              <div class="chat-bubble">{{ msg.text }}</div>
            </div>
          </div>

          <div class="chat-input-area">
            <input 
              v-model="adminChatText" 
              class="clean-input" 
              placeholder="Type your reply..." 
              @keyup.enter="sendAdminReply" 
            />
            <button class="btn-primary" :disabled="chatSending" @click="sendAdminReply">
              {{ chatSending ? '...' : 'Send' }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- ─── CONTACT QUERIES INTERFACE ─── -->
    <div v-if="activeSubTab === 'queries'" class="workspace-area queries-workspace fade-in">
      
      <!-- Filters -->
      <div class="filter-bar">
        <input v-model="searchQueries" class="clean-input search-box" placeholder="Search name, email, or query..." />
        <select v-model="statusFilter" class="clean-input filter-box">
          <option value="all">All Queries</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div v-if="queryError" class="alert-box error">{{ queryError }}</div>
      <div v-else-if="loadingQueries && queries.length === 0" class="empty-state">Loading queries…</div>
      <div v-else-if="filteredQueries.length === 0" class="empty-state">No queries match your criteria.</div>

      <!-- Independent Scroller: Table Area -->
      <div v-else class="table-container scroller">
        <table class="clean-table">
          <thead>
            <tr>
              <th>Sender Info</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Date Received</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="q in filteredQueries" :key="q.id" @click="openQueryDetail(q)" class="clickable-row">
              <td>
                <div class="sender-info">
                  <span class="sender-name">{{ q.name || 'Anonymous' }}</span>
                  <span class="sender-meta">{{ q.email }} <template v-if="q.phone">• {{ q.phone }}</template></span>
                </div>
              </td>
              <td><span class="subject-text">{{ q.subject || 'No Subject' }}</span></td>
              <td>
                <span class="status-dot-pill" :class="q.status === 'resolved' ? 'resolved' : 'pending'">
                  <i class="dot"></i> {{ q.status || 'pending' }}
                </span>
              </td>
              <td class="date-text">{{ formatTime(q.createdAt) }}</td>
              <td>
                <div class="action-buttons">
                  <button v-if="q.status !== 'resolved'" class="btn-text" @click.stop="changeQueryStatus(q.id, 'resolved')">Resolve</button>
                  <button v-else class="btn-text" @click.stop="changeQueryStatus(q.id, 'pending')">Reopen</button>
                  <button class="btn-text danger" @click.stop="removeQuery(q.id)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div class="load-more-row" v-if="queries.length >= queryLimit">
          <button class="btn-outline" @click="queryLimit += 10">Load More Queries</button>
        </div>
      </div>
    </div>

    <!-- ─── QUERY MODAL ─── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="selectedQuery" class="modal-overlay" @click.self="selectedQuery = null">
          <div class="clean-modal">
            <div class="modal-header">
              <h3>Query Details</h3>
              <button class="btn-close" @click="selectedQuery = null">✕</button>
            </div>
            
            <div class="modal-content scroller">
              <div class="info-grid">
                <div class="info-group">
                  <label>Name</label>
                  <p>{{ selectedQuery.name || 'Anonymous' }}</p>
                </div>
                <div class="info-group">
                  <label>Email</label>
                  <p>{{ selectedQuery.email }}</p>
                </div>
                <div class="info-group" v-if="selectedQuery.phone">
                  <label>Phone</label>
                  <p>{{ selectedQuery.phone }}</p>
                </div>
                <div class="info-group">
                  <label>Date Received</label>
                  <p>{{ formatTime(selectedQuery.createdAt) }}</p>
                </div>
                <div class="info-group">
                  <label>Status</label>
                  <p>
                    <span class="status-dot-pill" :class="selectedQuery.status === 'resolved' ? 'resolved' : 'pending'">
                      <i class="dot"></i> {{ selectedQuery.status || 'pending' }}
                    </span>
                  </p>
                </div>
                <div class="info-group">
                  <label>Source</label>
                  <p class="source-tag">{{ selectedQuery.source || 'contact' }}</p>
                </div>
              </div>

              <div class="message-block">
                <label>Message / Query</label>
                <div class="message-content" v-html="formatQueryText(selectedQuery.query)"></div>
              </div>
            </div>
            
            <div class="modal-footer">
              <button class="btn-outline" @click="selectedQuery = null">Close</button>
              <button v-if="selectedQuery.status !== 'resolved'" class="btn-primary" @click="changeQueryStatus(selectedQuery.id, 'resolved'); selectedQuery = null">Mark as Resolved</button>
              <button v-else class="btn-outline" @click="changeQueryStatus(selectedQuery.id, 'pending'); selectedQuery = null">Reopen Query</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ─── BASE TOKENS & ANIMATIONS ─── */
.support-container { 
  display: flex; 
  flex-direction: column; 
  height: calc(100vh - 150px); /* Locks container to screen height to enable internal scrolling */
  font-family: 'Inter', sans-serif;
  color: #111827;
}

.fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

/* Custom Sleek Scrollbar */
.scroller { overflow-y: auto; }
.scroller::-webkit-scrollbar { width: 6px; height: 6px; }
.scroller::-webkit-scrollbar-track { background: transparent; }
.scroller::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 10px; }
.scroller::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }

/* ─── TAB NAVIGATION ─── */
.clean-tabs-bar { display: flex; gap: 32px; border-bottom: 1px solid #E5E7EB; margin-bottom: 24px; }
.clean-tab { background: transparent; border: none; padding: 0 0 16px 0; font-size: 15px; font-weight: 500; color: #6B7280; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.2s; font-family: inherit;}
.clean-tab:hover { color: #111827; }
.clean-tab.active { color: #111827; font-weight: 600; border-bottom-color: #111827; }
.tab-badge { background: #EF4444; color: #ffffff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }

/* ─── COMMON WORKSPACE ─── */
.workspace-area { flex: 1; display: flex; min-height: 0; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; }
.empty-state { text-align: center; padding: 40px 20px; color: #6B7280; font-size: 14px; font-weight: 500; }
.empty-state.fill-height { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; }
.empty-state .icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; }

/* ─── CHAT INTERFACE ─── */
.chat-workspace { flex-direction: row; }

/* Left Pane: User List */
.thread-list-pane { width: 320px; border-right: 1px solid #E5E7EB; background: #F9FAFB; display: flex; flex-direction: column; }
.pane-header { padding: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; border-bottom: 1px solid #E5E7EB; position: sticky; top: 0; background: #F9FAFB; z-index: 2;}
.user-thread-card { padding: 16px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #E5E7EB; cursor: pointer; transition: background 0.2s; }
.user-thread-card:hover { background: #F3F4F6; }
.user-thread-card.active { background: #ffffff; border-left: 3px solid #111827; }
.avatar-circle { width: 36px; height: 36px; border-radius: 50%; background: #E5E7EB; color: #4B5563; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0;}
.user-thread-card.active .avatar-circle { background: #111827; color: #ffffff; }
.thread-info { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
.thread-name { font-size: 14px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thread-id { font-size: 11px; color: #9CA3AF; font-family: monospace; }

/* Right Pane: Chat Window */
.chat-window-pane { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #ffffff; }
.chat-header { padding: 20px 24px; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: space-between; font-size: 15px; color: #111827; }
.chat-id-tag { font-size: 12px; color: #6B7280; font-family: monospace; background: #F3F4F6; padding: 4px 8px; border-radius: 6px; }

.chat-messages-area { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 16px; background: #ffffff; }
.chat-bubble-wrapper { display: flex; flex-direction: column; max-width: 70%; }
.chat-bubble-wrapper.is-user { align-self: flex-start; align-items: flex-start; }
.chat-bubble-wrapper.is-admin { align-self: flex-end; align-items: flex-end; }

.bubble-time { font-size: 11px; color: #9CA3AF; margin-bottom: 6px; }
.chat-bubble { padding: 14px 18px; font-size: 14px; line-height: 1.5; font-weight: 500; }
.is-user .chat-bubble { background: #F3F4F6; color: #111827; border-radius: 16px 16px 16px 4px; }
.is-admin .chat-bubble { background: #111827; color: #ffffff; border-radius: 16px 16px 4px 16px; }

.chat-input-area { padding: 20px 24px; border-top: 1px solid #E5E7EB; display: flex; gap: 12px; background: #ffffff; }

/* ─── QUERIES INTERFACE ─── */
.queries-workspace { flex-direction: column; padding: 24px; background: #ffffff; border: none; }
.filter-bar { display: flex; gap: 16px; margin-bottom: 24px; }
.search-box { flex: 1; max-width: 400px; }
.filter-box { width: 160px; }

.table-container { border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.clean-table { width: 100%; border-collapse: collapse; text-align: left; }
.clean-table th { padding: 16px 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; border-bottom: 1px solid #E5E7EB; background: #F9FAFB; }
.clean-table td { padding: 20px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
.clickable-row { cursor: pointer; transition: background 0.2s; }
.clickable-row:hover { background: #F9FAFB; }

.sender-info { display: flex; flex-direction: column; gap: 4px; }
.sender-name { font-size: 14px; font-weight: 600; color: #111827; }
.sender-meta { font-size: 12px; color: #6B7280; }
.subject-text { font-size: 14px; font-weight: 500; color: #111827; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.date-text { font-size: 13px; color: #6B7280; }

.status-dot-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: #4B5563; text-transform: capitalize; }
.status-dot-pill .dot { width: 8px; height: 8px; border-radius: 50%; background: #D1D5DB; }
.status-dot-pill.resolved .dot { background: #10B981; }
.status-dot-pill.pending .dot { background: #F59E0B; }

.action-buttons { display: flex; gap: 16px; }

.load-more-row { padding: 16px; text-align: center; border-top: 1px solid #E5E7EB; background: #F9FAFB; }

/* ─── FORMS & BUTTONS ─── */
.clean-input { padding: 12px 16px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; font-family: inherit; color: #111827; outline: none; transition: 0.2s; }
.clean-input:focus { background: #ffffff; border-color: #111827; }

.btn-primary { background: #111827; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: 0.2s; font-family: inherit;}
.btn-primary:hover:not(:disabled) { background: #374151; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-outline { background: #ffffff; color: #111827; border: 1px solid #D1D5DB; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; transition: 0.2s; font-family: inherit;}
.btn-outline:hover { background: #F9FAFB; border-color: #111827; }

.btn-text { background: transparent; border: none; color: #4B5563; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; padding: 0; font-family: inherit;}
.btn-text:hover { color: #111827; text-decoration: underline; }
.btn-text.danger:hover { color: #DC2626; }

.alert-box { padding: 14px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; margin-bottom: 24px; }
.alert-box.error { background: #FEE2E2; color: #DC2626; }

/* ─── MODAL ─── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.2); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.clean-modal { background: #ffffff; border-radius: 20px; width: 100%; max-width: 600px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
.modal-header { padding: 24px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 18px; font-weight: 600; color: #111827; }
.btn-close { background: transparent; border: none; font-size: 20px; color: #6B7280; cursor: pointer; transition: 0.2s; }
.btn-close:hover { color: #111827; }

.modal-content { padding: 24px; overflow-y: auto; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
.info-group label { display: block; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.info-group p { margin: 0; font-size: 15px; color: #111827; font-weight: 500; }
.source-tag { display: inline-block; background: #F3F4F6; padding: 4px 10px; border-radius: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;}

.message-block label { display: block; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
.message-content { background: #F9FAFB; padding: 20px; border-radius: 12px; font-size: 15px; line-height: 1.6; color: #374151; white-space: pre-wrap; }

.modal-footer { padding: 24px; border-top: 1px solid #E5E7EB; display: flex; justify-content: flex-end; gap: 12px; background: #F9FAFB; border-radius: 0 0 20px 20px; }

/* ─── RESPONSIVE ─── */
@media (max-width: 900px) {
  .support-container { height: auto; min-height: 100vh; }
  .chat-workspace { flex-direction: column; }
  .thread-list-pane { width: 100%; border-right: none; border-bottom: 1px solid #E5E7EB; max-height: 250px; }
  .chat-window-pane { min-height: 500px; }
}
@media (max-width: 600px) {
  .queries-workspace { padding: 16px; border: none; border-radius: 0;}
  .filter-bar { flex-direction: column; }
  .search-box, .filter-box { max-width: 100%; width: 100%; }
  .action-buttons { flex-direction: column; gap: 8px; align-items: flex-start; }
  .info-grid { grid-template-columns: 1fr; gap: 16px; }
  .modal-footer { flex-direction: column; }
  .modal-footer button { width: 100%; }
}
</style>