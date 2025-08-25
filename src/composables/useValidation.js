import { useRentalState } from './useRentalState';
import Swal from 'sweetalert2';

export function useValidation() {
  const { state } = useRentalState();

  function validateCurrentStep() {
    state.errors = {};
    state.errorMessage = '';
    let isValid = true;

    switch (state.currentStep) {
      case 1:
        if (!state.formData.bookingId) {
          state.errors.bookingId = 'Please select a booking';
          isValid = false;
        }
        break;
      case 2:
        if (!state.isApplicationPending) {
          const requiredFields = {
            branch_id: 'Branch is required',
            employment_status: 'Employment status is required',
            nida_number: 'NIDA number is required',
            annual_income: 'Annual income is required',
            background_check_status: 'Background check status is required',
            credit_report_status: 'Credit report status is required',
          };
          Object.entries(requiredFields).forEach(([field, message]) => {
            if (!state.formData.application[field]) {
              state.errors[field] = message;
              isValid = false;
            }
          });
          if (state.formData.application.background_check_status &&
              !state.statusOptions.includes(state.formData.application.background_check_status)) {
            state.errors.background_check_status = 'Invalid background check status';
            isValid = false;
          }
          if (state.formData.application.credit_report_status &&
              !state.statusOptions.includes(state.formData.application.credit_report_status)) {
            state.errors.credit_report_status = 'Invalid credit report status';
            isValid = false;
          }
          if (state.formData.application.employment_status === 'student' &&
              !state.formData.application.registration_number) {
            state.errors.registration_number = 'Registration number is required for students';
            isValid = false;
          }
        }
        break;
      case 3:
        if (!state.isLeaseCreated) {
          const requiredLeaseFields = {
            properties_term_period_id: 'Term period is required',
            payment_frequency: 'Payment frequency is required',
            start_date: 'Start date is required',
            end_date: 'End date is required',
          };
          Object.entries(requiredLeaseFields).forEach(([field, message]) => {
            if (!state.formData.lease[field]) {
              state.errors[field] = message;
              isValid = false;
            }
          });
          if (!state.formData.lease.room_id) {
            if (state.formData.bookingId) {
              const booking = state.confirmedBookings.find(b => b.id === state.formData.bookingId);
              if (booking && booking.room_id) {
                state.formData.lease.room_id = booking.room_id;
                state.formData.lease.room_number = booking.room_number || booking.display_text;
              } else {
                state.errors.room_id = 'Room is required. Please select a valid booking with a room.';
                isValid = false;
              }
            } else {
              state.errors.room_id = 'Room is required';
              isValid = false;
            }
          }
        }
        break;
      case 5:
        const requiredBillingFields = {
          country_id: 'Country is required',
          city_id: 'City is required',
          street_id: 'Street is required',
        };
        Object.entries(requiredBillingFields).forEach(([field, message]) => {
          if (!state.formData.billing[field]) {
            state.errors[field] = message;
            isValid = false;
          }
        });
        break;
      case 6:
        if (!state.formData.payment.payment_method_id) {
          state.errors.payment_method_id = 'Payment method is required';
          isValid = false;
        }
        if (!state.formData.payment.payment_type_id) {
          state.errors.payment_type_id = 'Payment type is required';
          isValid = false;
        }
        if (!state.formData.payment.amount || state.formData.payment.amount <= 0) {
          state.errors.payment_amount = 'Payment amount must be greater than zero';
          isValid = false;
        }
        if (state.formData.payment.payment_details.type === 'bank_transfer') {
          if (!state.formData.payment.payment_details.token || !state.formData.payment.payment_details.bank_name) {
            state.errors.payment_details = 'Bank transfer details are incomplete';
            isValid = false;
          }
        } else if (state.formData.payment.payment_details.type === 'mobile') {
          if (!state.formData.payment.payment_details.phone_number) {
            state.errors.payment_details = 'Mobile payment phone number is required';
            isValid = false;
          }
        }
        break;
    }

    if (!isValid) {
      state.errorMessage = 'Please correct the highlighted errors before proceeding.';
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: state.errorMessage,
        timer: 3000,
        timerProgressBar: true,
      });
    }

    return isValid;
  }

  function shakeCurrentStep() {
    const stepElement = document.querySelector('.step-content:not([style*="display: none"])');
    if (stepElement) {
      stepElement.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => {
        stepElement.style.animation = '';
      }, 500);
    }
  }

  return {
    validateCurrentStep,
    shakeCurrentStep,
  };
}