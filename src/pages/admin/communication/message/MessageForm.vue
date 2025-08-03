<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">{{ mode === 'add' ? 'Add New Message' : 'Edit Message' }}</h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <VaInput
            v-model="form.name"
            label="Name"
            placeholder="Enter name"
            :error="!!errorMessages.name"
            :error-messages="errorMessages.name ? [errorMessages.name] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4">
          <VaInput
            v-model="form.email"
            type="email"
            label="Email"
            placeholder="Enter email"
            :error="!!errorMessages.email"
            :error-messages="errorMessages.email ? [errorMessages.email] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4 col-span-2">
          <VaInput
            v-model="form.subject"
            label="Subject"
            placeholder="Enter subject"
            :error="!!errorMessages.subject"
            :error-messages="errorMessages.subject ? [errorMessages.subject] : []"
            :disabled="isSubmitting"
            required
          />
        </div>
        <div class="mb-4 col-span-2">
          <VaTextarea
            v-model="form.message"
            label="Message"
            placeholder="Enter message"
            :error="!!errorMessages.message"
            :error-messages="errorMessages.message ? [errorMessages.message] : []"
            :disabled="isSubmitting"
            autosize
            :min-rows="5"
            required
          />
        </div>
        <div v-if="mode === 'edit'" class="mb-4">
          <VaSelect
            v-model="form.is_read"
            label="Read Status"
            :options="readStatusOptions"
            value-by="value"
            text-by="text"
            :error="!!errorMessages.is_read"
            :error-messages="errorMessages.is_read ? [errorMessages.is_read] : []"
            :disabled="isSubmitting"
          />
        </div>
      </div>
      <div class="flex justify-end space-x-2 mt-4">
        <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">Cancel</VaButton>
        <VaButton color="#00A3E0" type="submit" :disabled="isSubmitting">
          <div v-if="isSubmitting" class="spinner" />
          <span v-else>Submit</span>
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, watch, onMounted, PropType } from 'vue';
import Swal from 'sweetalert2';

interface Message {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  id?: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read?: boolean;
}

interface Errors {
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: string;
}

export default defineComponent({
  name: 'MessageForm',
  props: {
    message: {
      type: Object as PropType<Message | null>,
      default: null,
    },
    mode: {
      type: String as PropType<'add' | 'edit'>,
      default: 'add',
    },
  },
  emits: {
    close: null,
    submit: (payload: FormData, mode: 'add' | 'edit') => true,
  },
  setup(props, { emit }) {
    const form = reactive<FormData>({
      id: props.message?.id,
      name: props.message?.name || '',
      email: props.message?.email || '',
      subject: props.message?.subject || '',
      message: props.message?.message || '',
      is_read: props.message?.is_read ?? false,
    });

    const errorMessages = reactive<Errors>({
      name: '',
      email: '',
      subject: '',
      message: '',
      is_read: '',
    });

    const readStatusOptions = ref([
      { value: true, text: 'Read' },
      { value: false, text: 'Unread' },
    ]);

    const isSubmitting = ref<boolean>(false);

    const validateForm = () => {
      Object.keys(errorMessages).forEach((key) => (errorMessages[key as keyof Errors] = ''));

      if (!form.name) errorMessages.name = 'Name is required';
      else if (form.name.length > 255) errorMessages.name = 'Name must be 255 characters or less';

      if (!form.email) errorMessages.email = 'Email is required';
      else if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errorMessages.email = 'Invalid email format';
      else if (form.email.length > 255) errorMessages.email = 'Email must be 255 characters or less';

      if (!form.subject) errorMessages.subject = 'Subject is required';
      else if (form.subject.length > 255) errorMessages.subject = 'Subject must be 255 characters or less';

      if (!form.message) errorMessages.message = 'Message is required';

      if (props.mode === 'edit' && typeof form.is_read !== 'boolean') errorMessages.is_read = 'Read status is required';

      return !Object.values(errorMessages).some((error) => error);
    };

    const submitForm = async () => {
      if (!validateForm()) {
        console.log('Validation errors:', errorMessages);
        return;
      }

      isSubmitting.value = true;
      try {
        const payload: FormData = { ...form };
        console.log('Submitting payload:', payload);
        emit('submit', payload, props.mode);
      } catch (error: any) {
        console.error('Submission error:', error.message, error.response?.data);
        const errorMessage = error.response?.data?.message || 'An unexpected error occurred';
        if (error.response?.data?.errors) {
          Object.assign(errorMessages, Object.fromEntries(
            Object.entries(error.response.data.errors).map(([key, value]) => [
              key,
              Array.isArray(value) ? value[0] : value,
            ])
          ));
        }
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        isSubmitting.value = false;
      }
    };

    const resetForm = () => {
      Object.assign(form, {
        id: props.mode === 'edit' ? form.id : undefined,
        name: '',
        email: '',
        subject: '',
        message: '',
        is_read: props.mode === 'edit' ? form.is_read : undefined,
      });
      Object.keys(errorMessages).forEach((key) => (errorMessages[key as keyof Errors] = ''));
      console.log('Form reset:', { ...form });
      emit('close');
    };

    watch(
      () => props.message,
      (newVal) => {
        if (newVal && props.mode === 'edit') {
          Object.assign(form, {
            id: newVal.id,
            name: newVal.name || '',
            email: newVal.email || '',
            subject: newVal.subject || '',
            message: newVal.message || '',
            is_read: !!newVal.is_read,
          });
          console.log('Form updated via watch:', { ...form });
        }
      },
      { immediate: true, deep: true }
    );

    onMounted(() => {
      console.log('MessageForm mounted with mode:', props.mode, 'and message:', props.message);
    });

    return {
      form,
      errorMessages,
      readStatusOptions,
      isSubmitting,
      submitForm,
      resetForm,
    };
  },
});
</script>

<style scoped>
.grid {
  display: grid;
}
.grid-cols-1 {
  grid-template-columns: 1fr;
}
.md\:grid-cols-2 {
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
.col-span-2 {
  grid-column: span 2;
}
.gap-4 {
  gap: 1rem;
}
.p-4 {
  padding: 1rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
}
.text-xl {
  font-size: 1.25rem;
}
.font-bold {
  font-weight: 700;
}
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #fff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>