<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  subscribeToSupportChats, 
  sendAdminSupportReply,
  fetchContactQueries, 
  updateContactQueryStatus, 
  deleteContactQuery 
} from '../db.js'

defineOptions({ name: 'SupportTab' })

// ── INTERNAL TAB STATE ──
const activeSubTab = ref('chats') // 'chats' or 'queries'

// ─────────────────────────────────────────────────────────────────────────────
// 1. CHAT SYSTEM LOGIC
// ─────────────────────────────────────────────────────────────────────────────
const supportThreads = ref([])
const selectedChatUserId = ref(null)
const adminChatText = ref('')
const chatSending = ref(false)
let _unsubSupport = null

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONTACT QUERIES LOGIC
// ─────────────────────────────────────────────────────────────────────────────
const queries = ref([])
const loadingQueries = ref(false)
const searchQueries = ref('')
const statusFilter = ref('all')

onMounted(() => {
  // Mount Live Chats
  _unsubSupport = subscribeToSupportChats(snap => {
    supportThreads.value = snap.docs
      .map(d => ({ userId: d.id, ...d.data() }))
      .sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0))
  })
  
  // Mount Contact Queries
  loadQueries()
})

onUnmounted(() => {
  if (_unsubSupport) _unsubSupport()
})

// ── CHAT METHODS ──
const activeChatDoc = computed(() => supportThreads.value.find(t => t.userId === selectedChatUserId.value))

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

// ── QUERIES METHODS ──
const loadQueries = async () => {
  loadingQueries.value = true
  try {
    queries.value = await fetchContactQueries()
  } catch (e) {
    alert(e.message || 'Failed to load contact queries')
  } finally {
    loadingQueries.value = false
  }
}

const filteredQueries = computed(() => {
  const q = searchQueries.value.trim().toLowerCase()
  return queries.value.filter(item => {
    const matchStatus = statusFilter.value === 'all' || (item.status || 'pending') === statusFilter.value
    const haystack = `${item.name || ''} ${item.email || ''} ${item.phone || ''} ${item.subject || ''} ${item.query || ''}`.toLowerCase()
    const matchSearch = !q || haystack.includes(q)
    return matchStatus && matchSearch
  })
})

const changeQueryStatus = async (id, status) => {
  try {
    await updateContactQueryStatus(id, status)
    await loadQueries()
  } catch (e) {
    alert(e.message)
  }
}

const removeQuery = async (id) => {
  if (!confirm('Delete this query permanently?')) return
  try {
    await deleteContactQuery(id)
    await loadQueries()
  } catch (e) {
    alert(e.message)
  }
}

// ── UTILITIES ──
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
        <p class="ws-sub">Manage registered user chats and public contact form queries.</p>
      </div>
      
      <div class="support-tabs">
        <button 
          :class="['sub-tab-btn', { active: activeSubTab === 'chats' }]" 
          @click="activeSubTab = 'chats'"
        >
          👤 Registered User Chats
        </button>
        <button 
          :class="['sub-tab-btn', { active: activeSubTab === 'queries' }]" 
          @click="activeSubTab = 'queries'"
        >
          🌍 Public Contact Queries
        </button>
      </div>
    </div>

    <div class="tab-content-area">
      
      <div v-if="activeSubTab === 'chats'" class="chat-shell fade-in">
        <div class="thread-list">
          <div class="thread-list-head">Active Client Sessions</div>
          <div v-if="supportThreads.length === 0" class="thread-empty">No active chats.</div>
          
          <div v-for="t in supportThreads" :key="t.userId" 
               :class="['thread-item', { selected: selectedChatUserId === t.userId }]" 
               @click="selectedChatUserId = t.userId">
            <div class="thread-name">{{ t.userName || 'Pahari User' }}</div>
            <div class="thread-uid">ID: {{ t.userId.substring(0, 8) }}…</div>
          </div>
        </div>
        
        <div class="chat-window">
          <div v-if="!selectedChatUserId" class="chat-placeholder">
            <span>💬</span>
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
              <button class="btn-send" :disabled="chatSending" @click="sendAdminReply">
                {{ chatSending ? '...' : 'Send' }}
              </button>
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
          <button class="q-btn" @click="loadQueries">Refresh</button>
        </div>

        <div v-if="loadingQueries" class="q-empty">Loading queries…</div>
        <div v-else-if="filteredQueries.length === 0" class="q-empty">No queries found.</div>

        <div v-else class="q-grid">
          <article v-for="q in filteredQueries" :key="q.id" class="q-card">
            <div class="q-card-top">
              <div>
                <h3>{{ q.name || 'Anonymous' }}</h3>
                <p class="q-meta">{{ q.email }}<span v-if="q.phone"> · {{ q.phone }}</span></p>
              </div>
              <span class="q-pill" :class="q.status === 'resolved' ? 'ok' : 'wait'">
                {{ q.status || 'pending' }}
              </span>
            </div>

            <p v-if="q.subject" class="q-subject">{{ q.subject }}</p>
            <p class="q-query">{{ q.query }}</p>

            <div class="q-card-foot">
              <span class="q-time">{{ formatTime(q.createdAt) }}</span>
              <div class="q-actions">
                <button v-if="q.status !== 'resolved'" class="q-btn-soft" @click="changeQueryStatus(q.id, 'resolved')">Mark Resolved</button>
                <button v-else class="q-btn-soft" @click="changeQueryStatus(q.id, 'pending')">Reopen</button>
                <button class="q-btn-danger" @click="removeQuery(q.id)">Delete</button>
              </div>
            </div>
          </article>
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

/* Sub Tabs */
.support-tabs { display: flex; gap: 10px; margin-top: 16px; background: #F1F5F9; padding: 6px; border-radius: 12px; width: fit-content; }
.sub-tab-btn { background: transparent; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s; }
.sub-tab-btn.active { background: #FFFFFF; color: #0F2A1F; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

.tab-content-area { flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02); display: flex; flex-direction: column; }

/* ── CHAT STYLES ── */
.chat-shell { display: flex; height: 100%; flex: 1; }
.thread-list { width: 300px; border-right: 1px solid #E2E8F0; display: flex; flex-direction: column; background: #F8FAFC; overflow-y: auto; }
.thread-list-head { padding: 16px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E2E8F0; color: #64748B; background: #FFFFFF; }
.thread-empty { padding: 20px; text-align: center; color: #64748B; font-size: 0.85rem; }
.thread-item { padding: 16px; border-bottom: 1px solid #E2E8F0; cursor: pointer; transition: background 0.15s; }
.thread-item:hover { background: #F1F5F9; }
.thread-item.selected { background: #ECFDF5; border-left: 4px solid #15803D; }
.thread-name { font-weight: 800; font-size: 0.95rem; color: #0F172A; }
.thread-uid { font-size: 0.75rem; color: #64748B; margin-top: 4px; font-family: monospace; }
.chat-window { flex: 1; display: flex; flex-direction: column; background: #FFFFFF; }
.chat-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #94A3B8; }
.chat-placeholder span { font-size: 3rem; }
.chat-messages { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; background: #FAFAF9; }
.bubble-wrap { display: flex; flex-direction: column; max-width: 75%; }
.bubble-wrap.mine { align-self: flex-end; align-items: flex-end; }
.bubble-wrap.theirs { align-self: flex-start; align-items: flex-start; }
.bubble-meta { font-size: 0.7rem; color: #64748B; font-weight: 700; margin-bottom: 4px; }
.bubble { padding: 12px 16px; border-radius: 12px; font-size: 0.95rem; line-height: 1.5; font-weight: 500; }
.bubble-admin { background: #0F2A1F; color: #FFFFFF; border-radius: 12px 12px 2px 12px; }
.bubble-user { background: #FFFFFF; color: #0F172A; border: 1px solid #CBD5E1; border-radius: 12px 12px 12px 2px; }
.chat-input-bar { padding: 16px; border-top: 1px solid #E2E8F0; display: flex; gap: 10px; background: #FFFFFF; }
.chat-input { flex: 1; padding: 12px 16px; border: 2px solid #CBD5E1; border-radius: 8px; font-size: 0.95rem; outline: none; color: #0F172A; font-family: inherit; }
.chat-input:focus { border-color: #0F2A1F; }
.btn-send { background: #0F2A1F; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.2s; }
.btn-send:hover:not(:disabled) { background: #0a1c14; }

/* ── QUERIES STYLES ── */
.queries-shell { padding: 20px; overflow-y: auto; height: 100%; box-sizing: border-box; }
.q-tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 20px; }
.q-search, .q-select { border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 12px; background: #FFF; outline: none; }
.q-search { flex: 1; min-width: 250px; }
.q-search:focus { border-color: #0F2A1F; }
.q-btn { background: #0F2A1F; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; }
.q-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.q-card { background: #FFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.q-card-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.q-card h3 { margin: 0; font-size: 1.1rem; color: #0F172A; font-weight: 800; }
.q-meta { margin: 4px 0 0; font-size: 0.85rem; color: #64748B; }
.q-subject { margin: 0; font-weight: 700; color: #374151; font-size: 0.95rem; }
.q-query { margin: 0; line-height: 1.5; white-space: pre-wrap; font-size: 0.95rem; color: #475569; }
.q-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
.q-pill.ok { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
.q-pill.wait { background: #FFF7ED; color: #B45309; border: 1px solid #FED7AA; }
.q-card-foot { display: flex; justify-content: space-between; align-items: center; margin-top: auto; border-top: 1px dashed #E2E8F0; padding-top: 14px; }
.q-time { color: #94A3B8; font-size: 0.8rem; font-weight: 600; }
.q-actions { display: flex; gap: 8px; }
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