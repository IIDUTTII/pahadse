<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { subscribeToAuditLogsPaginated } from '../db.js'

defineOptions({ name: 'AuditLogsTab' })

const logs = ref([])
const selected = ref(null)
const loading = ref(true)
const loadLimit = ref(10)

// Filters
const search = ref('')
const roleFilter = ref('all')
const actionFilter = ref('all')

let _unsubLogs = null

// ✨ DIRECT PAGINATION LOGIC
watch(loadLimit, (newLimit) => {
  if (_unsubLogs) _unsubLogs()
  
  _unsubLogs = subscribeToAuditLogsPaginated(newLimit, snap => {
    logs.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    loading.value = false
  })
}, { immediate: true })

onUnmounted(() => {
  if (_unsubLogs) _unsubLogs()
})

// Generate dynamic options for actions based on fetched logs
const actionOptions = computed(() => {
  return ['all', ...new Set(logs.value.map(l => l.action).filter(Boolean)).values()]
})

const filteredLogs = computed(() => {
  const q = search.value.trim().toLowerCase()
  return logs.value.filter(item => {
    const role = item.performedByRole || 'unknown'
    const matchRole = roleFilter.value === 'all' || role === roleFilter.value
    const matchAction = actionFilter.value === 'all' || item.action === actionFilter.value
    const haystack = `${item.action || ''} ${item.performedByEmail || ''} ${item.entityType || ''} ${item.entityId || ''}`.toLowerCase()
    const matchSearch = !q || haystack.includes(q)
    return matchRole && matchAction && matchSearch
  })
})

// Format JSON payloads safely
const pretty = (val) => {
  if (val == null) return '—'
  try { return JSON.stringify(val, null, 2) } catch { return String(val) }
}

const formatTime = (ts) => {
  if (!ts) return '—'
  if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString('en-IN')
  if (typeof ts === 'number') return new Date(ts).toLocaleString('en-IN')
  return '—'
}
</script>

<template>
  <div class="fade-in">
    <div class="ws-head">
      <div>
        <h2 class="ws-title">Security Audit Logs</h2>
        <p class="ws-sub">Track critical actions and data modifications across the system.</p>
      </div>

      <div class="ws-actions">
        <input v-model="search" class="search-input" placeholder="Search action, email, entity…" />
        
        <select v-model="roleFilter" class="select-pill">
          <option value="all">All Roles</option>
          <option value="superadmin">SuperAdmin</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="unknown">Unknown</option>
        </select>
        
        <select v-model="actionFilter" class="select-pill">
          <option v-for="opt in actionOptions" :key="opt" :value="opt">
            {{ opt === 'all' ? 'All Actions' : opt }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="loading && logs.length === 0" class="empty-state">
      <div class="spinner"></div>
      <p>Synchronizing security trail from database…</p>
    </div>
    <div v-else-if="filteredLogs.length === 0" class="empty-state">
      <p>No audit logs found matching your filters.</p>
    </div>

    <div v-else>
      <div class="audit-table-shell">
        <table class="audit-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Actor</th>
              <th>Role</th>
              <th>Entity</th>
              <th>Target</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="log in filteredLogs" :key="log.id">
              <tr class="audit-row" @click="selected = selected?.id === log.id ? null : log">
                <td><strong>{{ log.action || 'EVENT' }}</strong></td>
                <td>{{ log.performedByEmail || 'anonymous' }}</td>
                <td><span class="role-badge">{{ log.performedByRole || 'unknown' }}</span></td>
                <td><span class="entity-pill">{{ log.entityType || 'event' }}</span></td>
                <td><code class="id-code">{{ log.entityId || '-' }}</code></td>
                <td>{{ formatTime(log.createdAt) }}</td>
              </tr>
              <tr v-if="selected?.id === log.id" class="details-row">
                <td colspan="6">
                  <div class="log-details slide-down" @click.stop>
                    <div class="data-block">
                      <span class="small-label old">Old Data State</span>
                      <pre class="json-pre">{{ pretty(log.oldData) }}</pre>
                    </div>
                    <div class="data-block">
                      <span class="small-label new">New Data State</span>
                      <pre class="json-pre">{{ pretty(log.newData) }}</pre>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      
      <div class="load-more-zone" v-if="logs.length >= loadLimit">
        <button class="btn-load" @click="loadLimit += 10">Load 10 older logs</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* Headers matches Products/Orders Tab */
.ws-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.ws-title { font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0; }
.ws-sub { color: #64748B; font-size: 0.95rem; margin-top: 4px; font-weight: 500; }

.ws-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.search-input { min-width: 260px; padding: 10px 14px; border: 1px solid #CBD5E1; border-radius: 8px; outline: none; font-family: inherit; font-size: 0.9rem; background: #FFFFFF; }
.search-input:focus { border-color: #0F2A1F; }
.select-pill { padding: 10px 14px; border: 1px solid #CBD5E1; border-radius: 8px; outline: none; font-family: inherit; font-size: 0.9rem; background: #FFFFFF; cursor: pointer; }

/* Empty States */
.empty-state { padding: 60px 20px; text-align: center; color: #64748B; background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 12px; margin-top: 20px; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.spinner { width: 30px; height: 30px; border: 3px solid #E2E8F0; border-top-color: #0F2A1F; border-radius: 50%; animation: spin 0.85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Table Layout */
.audit-table-shell { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow-x: auto; }
.audit-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.audit-table th { text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; background: #F8FAFC; padding: 12px 14px; border-bottom: 1px solid #E2E8F0; }
.audit-table td { padding: 14px; border-bottom: 1px solid #F1F5F9; color: #334155; vertical-align: top; font-size: 0.9rem; }
.audit-row { cursor: pointer; transition: background 0.15s; }
.audit-row:hover { background: #F8FAFC; }
.audit-row strong { color: #0F172A; font-size: 0.9rem; }
.details-row td { background: #FBFCFE; padding: 0 14px 16px; }
.role-badge { display: inline-flex; text-transform: capitalize; color: #0F172A; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 999px; padding: 4px 9px; font-weight: 800; font-size: 0.75rem; }
.entity-pill { display: inline-flex; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; }
.small-label { display: block; font-size: 0.75rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
.small-label.old { color: #DC2626; }
.small-label.new { color: #16A34A; }
.id-code { font-family: monospace; background: #E2E8F0; padding: 2px 6px; border-radius: 4px; color: #334155; }

/* Expanded Details */
.log-details { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-top: 4px; background: #FFFFFF; }
.data-block { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.json-pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 0.8rem; font-family: monospace; color: #334155; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; max-height: 250px; overflow-y: auto; line-height: 1.4; }

.slide-down { animation: slideD 0.2s ease-out; }
@keyframes slideD { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }

/* Load More Button matching other tabs */
.load-more-zone { display: flex; justify-content: center; padding: 24px 0; margin-top: 10px; }
.btn-load { background: white; border: 2px solid #cbd5e1; padding: 12px 24px; border-radius: 30px; font-weight: 700; cursor: pointer; color: #0f172a; transition: 0.2s; }
.btn-load:hover { border-color: #0F2A1F; color: #0F2A1F; background: #f8fafc; }

@media (max-width: 768px) {
  .ws-head { flex-direction: column; align-items: stretch; }
  .ws-actions { width: 100%; flex-direction: column; align-items: stretch; }
  .search-input { min-width: 100%; }
  .log-details { grid-template-columns: 1fr; }
}

</style>