<template>
  <div class="p-4 sm:p-6">
    <h2 class="text-lg sm:text-xl font-bold mb-4">
      {{ mode === 'add' ? 'Add New Message' : 'Edit Message' }}
    </h2>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-2">
          <VaInput
            v-model="form.name"
            label="Name"
            placeholder="Enter name"
            :error="!!errorMessages.name"
            :error-messages="errorMessages.name ? [errorMessages.name] : []"
            :disabled="isSubmitting"
            required
            aria-label="Name"
          />
        </div>

        <div class="mb-2">
          <VaInput
            v-model="form.email"
            type="email"
            label="Email"
            placeholder="Enter email"
            :error="!!errorMessages.email"
            :error-messages="errorMessages.email ? [errorMessages.email] : []"
            :disabled="isSubmitting"
            required
            aria-label="Email"
          />
        </div>

        <div class="mb-2 col-span-1 md:col-span-2">
          <VaInput
            v-model="form.subject"
            label="Subject"
            placeholder="Enter subject"
            :error="!!errorMessages.subject"
            :error-messages="errorMessages.subject ? [errorMessages.subject] : []"
            :disabled="isSubmitting"
            required
            aria-label="Subject"
          />
        </div>

        <div class="mb-2 col-span-1 md:col-span-2">
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
            aria-label="Message"
          />
        </div>

        <div v-if="mode === 'edit'" class="mb-2 col-span-1 md:col-span-2">
          <VaSelect
            v-model="form.is_read"
            label="Read Status"
            :options="readStatusOptions"
            value-by="value"
            text-by="text"
            :error="!!errorMessages.is_read"
            :error-messages="errorMessages.is_read ? [errorMessages.is_read] : []"
            :disabled="isSubmitting"
            aria-label="Read Status"
          />
        </div>
      </div>

      <div class="flex justify-end space-x-2 mt-4 sm:mt-6">
        <VaButton color="secondary" :disabled="isSubmitting" @click="resetForm">
          Cancel
        </VaButton>
        <VaButton color="#00A3E0" type="submit" :loading="isSubmitting" :disabled="isSubmitting">
          Submit
        </VaButton>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, watch, onMounted, PropType, nextTick } from 'vue';
import Swal from 'sweetalert2';

// --- Type Definitions ---

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

// FormData type: id is only optional in 'add' mode, is_read is only optional in 'add' mode
type FormMode = 'add' | 'edit';

interface BaseFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface AddFormData extends BaseFormData {
  id?: undefined;
  is_read?: boolean;
}

interface EditFormData extends BaseFormData {
  id: number;
  is_read: boolean;
}

// Union type for the reactive form state
type FormData = AddFormData | EditFormData;

interface Errors {
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: string;
}

const initialErrors: Errors = {
  name: '',
  email: '',
  subject: '',
  message: '',
  is_read: '',
};

export default defineComponent({
  name: 'MessageForm',
  props: {
    message: {
      type: Object as PropType<Message | null>,
      default: null,
    },
    mode: {
      type: String as PropType<FormMode>,
      default: 'add',
    },
  },
  emits: {
    close: () => true,
    // Ensure the payload matches the correct data structure for the mode
    submit: (payload: FormData, mode: FormMode) => {
        if (mode === 'edit') {
            return typeof (payload as EditFormData).id === 'number';
        }
        return true;
    },
  },
  setup(props, { emit }) {
    const defaultForm: FormData = {
        name: '',
        email: '',
        subject: '',
        message: '',
    } as FormData;

    // Use a function to initialize/reset form based on props
    const initializeForm = (msg: Message | null, mode: FormMode): FormData => {
        if (msg && mode === 'edit') {
            return {
                id: msg.id,
                name: msg.name || '',
                email: msg.email || '',
                subject: msg.subject || '',
                message: msg.message || '',
                is_read: !!msg.is_read, // Ensure boolean for edit mode
            } as EditFormData;
        }
        // Add mode or null message
        return {
            name: msg?.name || '',
            email: msg?.email || '',
            subject: msg?.subject || '',
            message: msg?.message || '',
            is_read: false, // Default to unread for new messages
        } as AddFormData;
    };

    const form = reactive<FormData>(initializeForm(props.message, props.mode));
    const errorMessages = reactive<Errors>({ ...initialErrors });
    const isSubmitting = ref<boolean>(false);

    const readStatusOptions = ref([
      { value: true, text: 'Read' },
      { value: false, text: 'Unread' },
    ]);

    const clearErrors = () => {
        Object.assign(errorMessages, initialErrors);
    };

    const validateForm = () => {
      clearErrors();

      // Basic required checks
      if (!form.name) errorMessages.name = 'Name is required';
      else if (form.name.length > 255) errorMessages.name = 'Name must be 255 characters or less';

      if (!form.email) errorMessages.email = 'Email is required';
      else if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errorMessages.email = 'Invalid email format';
      else if (form.email.length > 255) errorMessages.email = 'Email must be 255 characters or less';

      if (!form.subject) errorMessages.subject = 'Subject is required';
      else if (form.subject.length > 255) errorMessages.subject = 'Subject must be 255 characters or less';

      if (!form.message) errorMessages.message = 'Message is required';

      if (props.mode === 'edit' && typeof form.is_read !== 'boolean') {
          errorMessages.is_read = 'Read status is required';
      }

      return !Object.values(errorMessages).some((error) => error);
    };

    const submitForm = async () => {
      if (!validateForm()) {
        nextTick(() => {
            // Optional: Scroll to the first error if needed
            // const firstErrorField = Object.keys(errorMessages).find(key => errorMessages[key as keyof Errors]);
        });
        return;
      }

      isSubmitting.value = true;
      try {
        // Explicitly cast form to the correct type based on mode for the emit
        const payload: FormData = props.mode === 'edit'
            ? { ...form } as EditFormData
            : { ...form } as AddFormData;

        emit('submit', payload, props.mode);
        // We assume the parent component handles the API call and sets isSubmitting to false,
        // or calls resetForm/cancelForm on success/failure.
      } catch (error: any) {
        // If an error happens *before* emit, handle it here.
        console.error('Submission error (pre-emit):', error.message);
        Swal.fire({
          title: 'Error!',
          text: 'An internal form error occurred before submission.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        // Note: isSubmitting should ideally be reset by the parent component after API response.
        // For self-contained logic, we temporarily reset it here, but in a real app,
        // it should be managed externally to prevent UI flash.
        // isSubmitting.value = false;
      }
    };

    // This function acts as both a cancel and a final success/failure reset (if needed)
    const resetForm = () => {
      // Re-initialize the form state from props or to default if no props.message
      Object.assign(form, initializeForm(props.message, props.mode));
      clearErrors();
      isSubmitting.value = false; // Always reset loading state on cancel
      emit('close');
    };

    // Watcher to handle props changes, useful when re-using the component
    watch(
      () => props.message,
      (newVal) => {
        // Only update if the component is in 'edit' mode and a new message object is provided
        if (props.mode === 'edit' || (props.mode === 'add' && !newVal)) {
            Object.assign(form, initializeForm(newVal, props.mode));
            clearErrors();
        }
      },
      { immediate: true, deep: true }
    );

    // Watcher for external control of isSubmitting (optional, depends on parent)
    // You might want to expose a function to the parent to reset isSubmitting externally.
    // For now, let's keep it locally controlled but recommend external control.

    onMounted(() => {
      console.log('MessageForm mounted with mode:', props.mode, 'and message:', props.message);
    });

    // Explicitly returning the type-safe form object
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
/* Base Styles */
.p-4 {
  padding: 1rem;
}
.mb-2 {
  margin-bottom: 0.5rem;
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
.text-lg {
  font-size: 1.125rem; /* Default title size for smaller screens */
}
.font-bold {
  font-weight: 700;
}
.grid {
  display: grid;
}
.grid-cols-1 {
  grid-template-columns: 1fr;
}
.gap-4 {
  gap: 1rem;
}

/* Small Screens (sm) */
.sm\:p-6 {
  @media (min-width: 640px) {
    padding: 1.5rem;
  }
}
.sm\:text-xl {
  @media (min-width: 640px) {
    font-size: 1.25rem;
  }
}
.sm\:mt-6 {
  @media (min-width: 640px) {
    margin-top: 1.5rem;
  }
}

/* Medium Screens (md) - Desktop/Tablet Layout */
.md\:grid-cols-2 {
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Ensure full width on mobile for subject/message/status, then span 2 on desktop if needed */
.col-span-1 {
  grid-column: span 1;
}
.md\:col-span-2 {
  @media (min-width: 768px) {
    grid-column: span 2;
  }
}

/* Removed custom spinner in favor of Vuestic's built-in `:loading` prop on VaButton */
</style>