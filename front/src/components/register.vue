<script setup>
import { ref } from 'vue'
import { auth, provider } from '../firebase.js'
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth'

defineOptions({
  name: 'Register'
})

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const successMessage = ref('')

// 1. Email & Password Registration
const registerWithEmail = async () => {
  try {
    errorMessage.value = ''
    successMessage.value = ''
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value)
    successMessage.value = `Account created for: ${userCredential.user.email}`
    router.push('/') // Redirect to user profile after signup
  } catch (error) {
    errorMessage.value = error.message
  }
}

// 2. Google Signup (Works exactly like login if account doesn't exist)
const signupWithGoogle = async () => {
  try {
    errorMessage.value = ''
    successMessage.value = ''
    const result = await signInWithPopup(auth, provider)
    successMessage.value = `Welcome, ${result.user.displayName}!`
    router.push('/') // Redirect to user profile after signup
  } catch (error) {
    errorMessage.value = error.message
  }
}
</script>

<template>
  <div class="register-container">
    <h2>Create Account</h2>
    
    <!-- Registration Form -->
    <form @submit.prevent="registerWithEmail">
      <input v-model="email" type="email" placeholder="Enter Email" required />
      <input v-model="password" type="password" placeholder="Create Password" required />
      <button type="submit">Sign Up with Email</button>
    </form>

    <hr />

    <!-- Google Button -->
    <button @click="signupWithGoogle" class="google-btn">
      Sign Up with Google
    </button>

    <!-- Feedback Displays -->
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success">{{ successMessage }}</p>
  </div>
</template>

<style scoped>
.register-container { max-width: 300px; margin: 2rem auto; display: flex; flex-direction: column; gap: 1rem; }
input, button { padding: 0.5rem; width: 100%; box-sizing: border-box; }
.google-btn { background-color: #4285F4; color: white; border: none; cursor: pointer; }
.error { color: red; font-size: 0.9rem; }
.success { color: green; font-size: 0.9rem; }
</style>
