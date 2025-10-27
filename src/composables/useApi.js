import { useRentalState } from './useRentalState';
import makeRequest from '../services/makeRequest';
import Swal from 'sweetalert2';

export function useApi() {
  const { state, validateSession } = useRentalState();

  async function fetchConfirmedBookings(params = {}) {
    if (!validateSession()) {
      console.warn('Session validation failed, cannot fetch bookings');
      state.errorMessage = 'Please log in to continue.';
      await Swal.fire({
        icon: 'error',
        title: 'Authentication Required',
        text: state.errorMessage,
        confirmButtonText: 'Go to Login',
        confirmButtonColor: '#3b82f6',
      }).then(() => {
        // Redirect to login page
        window.location.href = '/login';
      });
      return { bookings: [], pagination: null };
    }

    state.loading = true;
    state.loadingText = 'Loading your confirmed bookings...';
    state.errorMessage = '';

    try {
      const response = await makeRequest({
        method: 'GET',
        url: `${state.API_BASE_URL}/v1/bookings/confirmed`,
        headers: {
          Authorization: `Bearer ${state.authStore.token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        params: {
          page: params.page || 1,
          per_page: params.per_page || 10,
          search: params.search || undefined,
          property_id: params.property_id || undefined,
          room_id: params.room_id || undefined,
        },
        requiresAuth: true,
      });

      // Extract bookings and pagination data
      const bookingsData = response.data?.data || [];
      const pagination = response.data?.pagination || {
        total_items: bookingsData.length,
        items_per_page: params.per_page || 10,
        current_page: params.page || 1,
        total_pages: Math.ceil(bookingsData.length / (params.per_page || 10)),
      };

      // Transform booking data
      state.confirmedBookings = bookingsData.map((booking, index) => {
        return {
          id: booking.booking_id || `booking_${index}`,
          booking_id: booking.booking_id || `booking_${index}`,
          property_id: booking.properties?.[0]?.id || null,
          room_id: booking.rooms?.[0]?.room_id || null,
          room_number: booking.rooms?.[0]?.room_number || null,
          property_name: booking.properties?.[0]?.title || `Property ${booking.properties?.[0]?.id || 'Unknown'}`,
          room_details: booking.rooms?.[0]?.details || null,
          booking_status: booking.booking_status || 'confirmed',
          start_date: booking.appointment_details?.scheduled_date || null,
          end_date: null, // Adjust if end_date is available in your data model
          created_at: booking.timestamps?.created_at || null,
          client_name: booking.client_information?.client_full_name || 'Unknown',
          appointment_type: booking.appointment_details?.appointment_type_name || 'Unknown',
          display_text: createDisplayText(booking, index),
        };
      }).filter(booking => booking.booking_id);

      console.log('Processed bookings:', state.confirmedBookings);

      // Handle empty results
      if (!state.confirmedBookings.length) {
        state.errorMessage = 'You have no confirmed bookings. Please create a booking to proceed.';
        await Swal.fire({
          icon: 'info',
          title: 'No Bookings Found',
          text: state.errorMessage,
          confirmButtonText: 'OK',
          confirmButtonColor: '#3b82f6',
        });
        return { bookings: [], pagination };
      }

      console.log(`Successfully loaded ${state.confirmedBookings.length} confirmed bookings`);
      return { bookings: state.confirmedBookings, pagination };

    } catch (error) {
      console.error('Error fetching confirmed bookings:', error);

      let errorMessage = 'Failed to fetch your confirmed bookings.';

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 401:
            errorMessage = 'Authentication failed. Please log in again.';
            state.authStore.token = null;
            localStorage.removeItem('authToken');
            await Swal.fire({
              icon: 'error',
              title: 'Session Expired',
              text: errorMessage,
              confirmButtonText: 'Go to Login',
              confirmButtonColor: '#3b82f6',
            }).then(() => {
              window.location.href = '/login';
            });
            break;
          case 403:
            errorMessage = 'You don\'t have permission to access your bookings.';
            break;
          case 404:
            errorMessage = 'Booking service is currently unavailable.';
            break;
          case 500:
            errorMessage = 'Server error occurred. Please try again later.';
            break;
          default:
            errorMessage = data?.message || data?.error || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      state.errorMessage = errorMessage;
      state.confirmedBookings = [];

      await Swal.fire({
        icon: 'error',
        title: 'Error Loading Bookings',
        text: errorMessage,
        confirmButtonText: 'Retry',
        showCancelButton: true,
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
      }).then((result) => {
        if (result.isConfirmed) {
          return fetchConfirmedBookings(params);
        }
      });

      return { bookings: [], pagination: null };
    } finally {
      state.loading = false;
      state.loadingText = '';
    }
  }

  function createDisplayText(booking, index) {
    const parts = [];

    // Property information
    if (booking.properties?.[0]?.title) {
      parts.push(booking.properties[0].title);
    } else if (booking.properties?.[0]?.id) {
      parts.push(`Property #${booking.properties[0].id}`);
    } else {
      parts.push(`Booking #${index + 1}`);
    }

    // Room information
    if (booking.rooms?.[0]?.room_number) {
      parts.push(`Room ${booking.rooms[0].room_number}`);
    } else if (booking.rooms?.[0]?.room_id) {
      parts.push(`Room #${booking.rooms[0].room_id}`);
    }

    // Date information
    if (booking.appointment_details?.scheduled_date) {
      const startDate = new Date(booking.appointment_details.scheduled_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      parts.push(`from ${startDate}`);
    }

    // Client name
    if (booking.client_information?.client_full_name) {
      parts.push(`for ${booking.client_information.client_full_name}`);
    }

    // Fallback
    if (parts.length === 0) {
      parts.push(`Booking #${booking.booking_id || index + 1}`);
    }

    return parts.join(' - ');
  }

  // Placeholder for other fetch functions to maintain compatibility
  async function fetchBranches() {
    // Implement if needed
    return [];
  }

  async function fetchCountries() {
    // Implement if needed
    return [];
  }

  async function fetchCities(countryId) {
    // Implement if needed
    return [];
  }

  async function fetchStreets(cityId) {
    // Implement if needed
    return [];
  }

  async function fetchPaymentMethods() {
    // Implement if needed
    return [];
  }

  async function fetchPaymentTypes(paymentMethodId) {
    // Implement if needed
    return [];
  }

  return {
    fetchConfirmedBookings,
    fetchBranches,
    fetchCountries,
    fetchCities,
    fetchStreets,
    fetchPaymentMethods,
    fetchPaymentTypes,
  };
}