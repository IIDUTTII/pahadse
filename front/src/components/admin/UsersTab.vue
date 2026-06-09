<script setup>
import { ref, onMounted } from 'vue'
import { fetchAllUsersFromDb, updateUserRoleInDb } from '../db.js'

const props = defineProps({
  userRole: { type: String, default: 'user' }
})

const usersList = ref([])

// Modal States
const showRoleModal = ref(false)
const roleModalUser = ref(null)
const roleModalRole = ref('user')
const roleModalBusy = ref(false)

onMounted(async () => {
  try {
    usersList.value = await fetchAllUsersFromDb()
  } catch (e) {
    console.error("Failed to fetch users:", e)
  }
})

const openRoleModal = (u, role) => {
  if (role === 'superadmin' && props.userRole !== 'superadmin') {
    alert('⚠️ Only an existing SuperAdmin can assign another SuperAdmin.')
    return
  }
  roleModalUser.value = u
  roleModalRole.value = role
  showRoleModal.value = true
}

const closeRoleModal = () => {
  if (roleModalBusy.value) return
  showRoleModal.value = false
  roleModalUser.value = null
  roleModalRole.value = 'user'
}

const confirmRoleChange = async () => {
  if (!roleModalUser.value) return
  roleModalBusy.value = true
  try {
    await updateUserRoleInDb(roleModalUser.value.id, roleModalRole.value)
    usersList.value = await fetchAllUsersFromDb() // Refresh table
    closeRoleModal()
  } catch (e) {
    alert(e.message)
  } finally {
    roleModalBusy.value = false
  }
}
</script>

<template>
  <div class="fade-in">
    <div class="ws-head">
      <div>
        <h2 class="ws-title">Users List</h2>
        <p class="ws-sub">{{ usersList.length }} registered accounts</p>
      </div>
    </div>

    <div class="table-wrap desktop-only">
      <table class="data-table">
        <thead>
          <tr><th>Name / UID</th><th>Email</th><th>Current Role</th><th>Modify Permissions</th></tr>
        </thead>
        <tbody>
          <tr v-for="u in usersList" :key="u.id">
            <td>
              <div class="item-name">{{ u.displayName || 'Pahari User' }}</div>
              <code class="id-code">{{ u.id?.substring(0, 8) }}…</code>
            </td>
            <td class="item-sub">{{ u.email }}</td>
            <td>
              <span :class="['role-pill', u.role === 'superadmin' ? 'role-super' : u.role === 'admin' ? 'role-admin' : 'role-user']">
                {{ u.role || 'user' }}
              </span>
            </td>
            <td>
              <div v-if="userRole === 'superadmin'" class="row-actions">
                <button class="btn-role" @click="openRoleModal(u, 'user')">User</button>
                <button class="btn-role" @click="openRoleModal(u, 'admin')">Admin</button>
                <button class="btn-role" @click="openRoleModal(u, 'superadmin')">Super</button>
              </div>
              <span v-else class="item-sub">🔒 Not Authorized</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="user-cards mobile-only">
      <div v-for="u in usersList" :key="u.id" class="u-card">
        <div class="u-name">{{ u.displayName || 'Pahari User' }}</div>
        <div class="u-email">{{ u.email }}</div>
        <div class="u-row">
          <span :class="['role-pill', u.role === 'superadmin' ? 'role-super' : u.role === 'admin' ? 'role-admin' : 'role-user']">
            {{ u.role || 'user' }}
          </span>
          <div v-if="userRole === 'superadmin'" class="role-btns">
            <button class="btn-role" @click="openRoleModal(u, 'user')">User</button>
            <button class="btn-role" @click="openRoleModal(u, 'admin')">Admin</button>
            <button class="btn-role" @click="openRoleModal(u, 'superadmin')">Super</button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showRoleModal && roleModalUser" class="overlay" @click.self="closeRoleModal">
        <div class="modal">
          <div class="modal-head">
            <div>
              <p class="eyebrow">Role Change Confirmation</p>
              <h3>Confirm user update</h3>
            </div>
            <button class="icon-btn" @click="closeRoleModal" aria-label="Close">✕</button>
          </div>

          <div class="modal-body">
            <p class="msg">
              You are about to change the role of
              <strong>{{ roleModalUser.displayName || 'User' }}</strong>
              <span v-if="roleModalUser.email" class="muted">({{ roleModalUser.email }})</span>
            </p>

            <div class="compare">
              <div class="chip old">
                <span>Current</span>
                <strong>{{ roleModalUser.role || 'user' }}</strong>
              </div>
              <div class="arrow">→</div>
              <div class="chip new">
                <span>New</span>
                <strong>{{ roleModalRole }}</strong>
              </div>
            </div>

            <p v-if="roleModalRole === 'superadmin'" class="warning">
              Only an existing SuperAdmin should approve this change.
            </p>
          </div>

          <div class="actions">
            <button class="btn ghost" :disabled="roleModalBusy" @click="closeRoleModal">Cancel</button>
            <button class="btn primary" :disabled="roleModalBusy" @click="confirmRoleChange">
              {{ roleModalBusy ? 'Updating…' : 'Confirm Change' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* TAB STYLES */
.fade-in { animation: fIn 0.3s ease-out; }
@keyframes fIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.ws-head { margin-bottom: 24px; }
.ws-title { font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0; }
.ws-sub { color: #64748B; font-size: 0.9rem; margin-top: 4px; }
.table-wrap { background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th { background: #F8FAFC; padding: 16px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 2px solid #E2E8F0; }
.data-table td { padding: 16px; border-bottom: 1px solid #E2E8F0; color: #0F172A; }
.id-code { background: #F1F5F9; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; border: 1px solid #E2E8F0; margin-top: 4px; display: inline-block; }
.item-name { font-weight: 800; color: #0F172A; font-size: 1rem; }
.item-sub { font-size: 0.85rem; color: #64748B; font-weight: 500; }
.role-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
.role-super { background: #FEF2F2; color: #DC2626; border: 1px solid #FCA5A5; }
.role-admin { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
.role-user { background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; }
.row-actions { display: flex; gap: 6px; }
.btn-role { background: #FFFFFF; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; color: #0F172A; transition: 0.2s; }
.btn-role:hover { border-color: #0F2A1F; color: #0F2A1F; background: #F8FAFC; }

.desktop-only { display: block; }
.mobile-only { display: none; }
@media (max-width: 800px) {
  .desktop-only { display: none; }
  .mobile-only { display: flex; flex-direction: column; gap: 12px; }
  .u-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
  .u-name { font-weight: 800; font-size: 1.05rem; margin-bottom: 4px; }
  .u-email { font-size: 0.85rem; color: #64748B; margin-bottom: 12px; }
  .u-row { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
  .role-btns { display: flex; gap: 8px; flex-wrap: wrap; }
}

/* EMBEDDED MODAL STYLES */
.overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 1000; backdrop-filter: blur(4px); }
.modal { width: 100%; max-width: 520px; background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); overflow: hidden; border: 1px solid #e5e7eb; animation: fIn 0.2s ease-out; }
.modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 24px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; }
.eyebrow { margin: 0 0 4px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0F2A1F; }
.modal-head h3 { margin: 0; font-size: 1.15rem; color: #0F172A; font-weight: 800; }
.icon-btn { border: none; background: transparent; cursor: pointer; font-size: 1.1rem; color: #64748B; border-radius: 8px; padding: 6px 10px; transition: 0.2s; }
.icon-btn:hover { background: #FEE2E2; color: #DC2626; }
.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.msg { margin: 0; color: #334155; line-height: 1.5; font-size: 1rem; }
.muted { color: #64748B; }
.compare { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.chip { flex: 1; min-width: 120px; padding: 12px 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 4px; border: 1px solid #e5e7eb; }
.chip span { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; font-weight: 800; }
.chip strong { font-size: 1.1rem; color: #0F172A; text-transform: capitalize; }
.chip.old { background: #FFF7ED; border-color: #FED7AA; }
.chip.new { background: #ECFDF5; border-color: #A7F3D0; }
.arrow { font-weight: 900; color: #9CA3AF; font-size: 1.2rem; }
.warning { margin: 0; padding: 14px; border-radius: 10px; background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; font-size: 0.9rem; font-weight: 600; }
.actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px; }
.btn { border: none; border-radius: 8px; padding: 12px 20px; font-weight: 800; cursor: pointer; font-size: 0.95rem; transition: 0.2s; }
.btn.ghost { background: #F1F5F9; color: #0F172A; }
.btn.ghost:hover { background: #E2E8F0; }
.btn.primary { background: #0F2A1F; color: #fff; }
.btn.primary:hover { background: #0a1c14; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 520px) {
  .actions { flex-direction: column; }
  .btn { width: 100%; }
}
</style>