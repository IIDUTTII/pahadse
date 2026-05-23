<script setup>
import { ref } from 'vue'
import { auth, provider } from '../firebase.js'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'Login'
})

const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

// 1. Email & Password Login
const loginWithEmail = async () => {
  try {
    errorMessage.value = ''
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value)
    console.log('Logged in user:', userCredential.user.email)
    router.push('/') // Redirect to user profile after login
  } catch (error) {
    errorMessage.value = error.message
  }
}

// 2. Google Popup Login
const loginWithGoogle = async () => {
  try {
    errorMessage.value = ''
    const result = await signInWithPopup(auth, provider)
    console.log('Logged in user:', result.user.displayName)
    router.push('/') // Redirect to user profile after login
  } catch (error) {
    errorMessage.value = error.message
  }
}
</script>

<template>
  <div class="login-container">
    <h2>Login</h2>
    
    <!-- Email Form -->
    <form @submit.prevent="loginWithEmail">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button type="submit">Login with Email</button>
    </form>

    <hr />

    <!-- Google Button -->
    <button @click="loginWithGoogle" class="google-btn">
      Sign in with Google
    </button>

    <!-- Error Display -->
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.login-container { max-width: 300px; margin: 2rem auto; display: flex; flex-direction: column; gap: 1rem; }
input, button { padding: 0.5rem; width: 100%; box-sizing: border-box; }
.google-btn { background-color: #4285F4; color: white; border: none; cursor: pointer; }
.error { color: red; font-size: 0.9rem; }
</style>
