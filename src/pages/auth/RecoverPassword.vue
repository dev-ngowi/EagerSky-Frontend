<!-- <template>
  <div class="forgot-password-wrapper">
    <div class="forgot-password-card">
      <VaForm ref="passwordForm" @submit.prevent="submit">
        <div class="form-content">
          <h1 class="form-title">Forgot your password?</h1>
          <p class="form-description">
            If you've forgotten your password, don't worry. Simply enter your email address below, and we'll send you an email
            with a temporary password. Restoring access to your account has never been easier.
          </p>
          <VaInput
            v-model="email"
            :rules="[(v) => !!v || 'Email field is required']"
            class="email-input"
            label="Enter your email"
            type="email"
          />
          <div class="button-group">
            <VaButton class="submit-btn" @click="submit">Send password</VaButton>
            <VaButton :to="{ name: 'login' }" class="back-btn" preset="secondary">Go back</VaButton>
          </div>
        </div>
      </VaForm>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useForm } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import axios from 'axios'

const email = ref('')
const form = useForm('passwordForm')
const router = useRouter()

const submit = async () => {
  if (form.validate()) {
    try {
      const response = await axios.post('/api/password/reset/otp', {
        email: email.value
      })
      
      alert('Password reset OTP has been sent to your email!')
      
      // Navigate to OTP verification page with email and user_id
      router.push({
        name: 'verify-reset-otp',
        query: { 
          email: email.value,
          user_id: response.data.data.user_id
        }
      })
      
      console.log('Password reset OTP sent successfully', response.data)
    } catch (error) {
      console.error('Failed to send password reset OTP:', error)
      alert(error.response?.data?.message || 'Failed to send password reset OTP. Please try again.')
    }
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.forgot-password-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 20px;
  background-color: #f5f5f5;
}

.forgot-password-card {
  width: 100%;
  max-width: 480px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.form-content {
  padding: 40px 32px;
}

.form-title {
  font-size: 2.25rem;
  font-weight: 600;
  text-align: center;
  margin: 0 0 24px 0;
  color: #1a1a1a;
  line-height: 1.2;
}

.form-description {
  font-size: 1rem;
  text-align: center;
  margin: 0 0 32px 0;
  color: #666;
  line-height: 1.5;
}

.email-input {
  margin-bottom: 24px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submit-btn,
.back-btn {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .forgot-password-wrapper {
    padding: 16px;
  }
  
  .form-content {
    padding: 32px 24px;
  }
  
  .form-title {
    font-size: 2rem;
    margin-bottom: 20px;
  }
  
  .form-description {
    font-size: 0.95rem;
    margin-bottom: 28px;
  }
}

@media (max-width: 480px) {
  .forgot-password-wrapper {
    padding: 12px;
  }
  
  .form-content {
    padding: 28px 20px;
  }
  
  .form-title {
    font-size: 1.75rem;
    margin-bottom: 18px;
  }
  
  .form-description {
    font-size: 0.9rem;
    margin-bottom: 24px;
  }
  
  .email-input {
    margin-bottom: 20px;
  }
  
  .submit-btn,
  .back-btn {
    height: 44px;
    font-size: 0.95rem;
  }
}

@media (max-width: 360px) {
  .forgot-password-wrapper {
    padding: 8px;
  }
  
  .form-content {
    padding: 24px 16px;
  }
  
  .form-title {
    font-size: 1.5rem;
    margin-bottom: 16px;
  }
  
  .form-description {
    font-size: 0.85rem;
    margin-bottom: 20px;
  }
  
  .submit-btn,
  .back-btn {
    height: 42px;
    font-size: 0.9rem;
  }
}

@media (max-height: 500px) and (orientation: landscape) {
  .forgot-password-wrapper {
    align-items: flex-start;
    padding-top: 20px;
  }
  
  .form-content {
    padding: 20px 24px;
  }
  
  .form-title {
    font-size: 1.5rem;
    margin-bottom: 12px;
  }
  
  .form-description {
    font-size: 0.85rem;
    margin-bottom: 16px;
  }
  
  .email-input {
    margin-bottom: 16px;
  }
  
  .button-group {
    gap: 8px;
  }
  
  .submit-btn,
  .back-btn {
    height: 40px;
  }
}
</style> -->