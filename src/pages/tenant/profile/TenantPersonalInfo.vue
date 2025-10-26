<template>
  <div class="container mx-auto p-4 sm:p-6 lg:p-8 max-w-5xl">

    <div class="bg-white shadow-xl rounded-xl overflow-hidden mb-8">
      
      <div class="bg-indigo-600 p-6 sm:p-8 text-white">
        <div v-if="user" class="flex items-center space-x-4">
          <div class="w-12 h-12 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xl sm:text-3xl font-bold border-2 border-white flex-shrink-0">
            {{ user.first_name ? user.first_name[0] : 'U' }}
          </div>
          <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold break-words">{{ user.first_name || 'User' }} {{ user.last_name || 'Profile' }}</h1>
            <p class="text-indigo-200 text-sm sm:text-base italic">{{ user.role || 'N/A' }}</p>
          </div>
        </div>
        <div v-else>
          <h1 class="text-2xl sm:text-3xl font-extrabold">User Profile</h1>
        </div>
      </div>

      <div class="p-4 sm:p-6 lg:p-8 border-l-4 border-indigo-600">
        <h2 class="text-xl sm:text-2xl font-semibold text-gray-700 mb-6">Account Information</h2>
        
        <div v-if="user" class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm sm:text-base">
          <div class="space-y-3">
            <div class="flex flex-col sm:flex-row sm:space-x-2">
              <strong class="font-medium text-gray-900 flex-shrink-0 w-24 sm:w-32">Username:</strong>
              <span class="text-gray-700 break-all">{{ user.username || 'N/A' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row sm:space-x-2">
              <strong class="font-medium text-gray-900 flex-shrink-0 w-24 sm:w-32">Email:</strong>
              <span class="text-gray-700 break-all">{{ user.email || 'N/A' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row sm:space-x-2">
              <strong class="font-medium text-gray-900 flex-shrink-0 w-24 sm:w-32">Phone:</strong>
              <span class="text-gray-700">{{ user.phone || 'N/A' }}</span>
            </div>
          </div>
          
          <div class="space-y-3">
            <div class="flex flex-col sm:flex-row sm:space-x-2">
              <strong class="font-medium text-gray-900 flex-shrink-0 w-24 sm:w-32">Client Type:</strong>
              <span class="text-gray-700">{{ user.client_type || 'N/A' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row sm:space-x-2">
              <strong class="font-medium text-gray-900 flex-shrink-0 w-24 sm:w-32">NIDA Number:</strong>
              <span class="text-gray-700">{{ user.nida_number || 'N/A' }}</span>
            </div>
            <div class="flex flex-col sm:flex-row sm:space-x-2">
              <strong class="font-medium text-gray-900 flex-shrink-0 w-24 sm:w-32">Student ID:</strong>
              <span class="text-gray-700">{{ user.student_registration_number || 'N/A' }}</span>
            </div>
          </div>
        </div>
        
        <div v-else class="text-red-600 p-4 bg-red-50 rounded-lg text-sm">
          <p class="font-medium">No user data found. Please log in again to view your profile.</p>
        </div>
      </div>
    </div>

    <div class="bg-white shadow-xl rounded-xl p-4 sm:p-6 lg:p-8">
      <h2 class="text-xl sm:text-2xl font-semibold text-gray-700 mb-6">Recent Bookings</h2>
      
      <div v-if="user && user.bookings && user.bookings.length > 0" class="overflow-x-auto border rounded-lg">
        <table class="w-full table-auto min-w-[600px] text-xs sm:text-sm">
          <thead>
            <tr class="bg-gray-50 text-gray-600 uppercase leading-normal">
              <th class="py-3 px-3 sm:px-6 text-left">Property</th>
              <th class="py-3 px-3 sm:px-6 text-left hidden sm:table-cell">Appt. Type</th>
              <th class="py-3 px-3 sm:px-6 text-center">Date</th>
              <th class="py-3 px-3 sm:px-6 text-center hidden md:table-cell">Time Slot</th>
              <th class="py-3 px-3 sm:px-6 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="text-gray-700 font-light">
            <tr 
              v-for="booking in user.bookings" 
              :key="booking.id" 
              class="border-b border-gray-200 hover:bg-gray-50"
            >
              <td class="py-3 px-3 sm:px-6 text-left whitespace-nowrap">{{ booking.property_title || 'N/A' }}</td>
              <td class="py-3 px-3 sm:px-6 text-left hidden sm:table-cell">{{ booking.appointment_type_name || 'N/A' }}</td>
              <td class="py-3 px-3 sm:px-6 text-center whitespace-nowrap">{{ formatDate(booking.date) }}</td>
              <td class="py-3 px-3 sm:px-6 text-center hidden md:table-cell">{{ formatTimeSlot(booking.time_slot) }}</td>
              <td class="py-3 px-3 sm:px-6 text-center">
                <span :class="getStatusBadgeClass(booking.status)">
                  {{ booking.status || 'N/A' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-gray-600 p-4 bg-gray-50 rounded-lg text-sm">
        <p>You currently have no scheduled bookings.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'UserProfile',
  setup() {
    const user = ref(null);

    // Load user data from localStorage
    const loadUserData = () => {
      try {
        const userDataString = localStorage.getItem('userData');
        if (userDataString) {
          const parsedData = JSON.parse(userDataString);
          user.value = parsedData.user || parsedData;
        } else {
          console.error('No user data found in localStorage');
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
      }
    };

    // Format date for display
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    // Format time slot for display
    const formatTimeSlot = (timeSlot) => {
      if (!timeSlot) return 'N/A';
      try {
        // Safely try to parse the time slot, assuming it might be a simple HH:MM string
        const date = new Date(`2000-01-01T${timeSlot}`); 
        if (isNaN(date.getTime())) {
          // If parsing failed, return a simple substring (e.g., '10:00' from '10:00:00')
          return timeSlot.substring(0, 5); 
        }
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } catch (e) {
        return timeSlot;
      }
    };

    // Get badge class based on booking status
    const getStatusBadgeClass = (status) => {
      switch (status?.toLowerCase()) {
        case 'confirmed':
          return 'inline-block px-2 sm:px-3 py-0.5 text-xs font-bold text-green-800 bg-green-200 rounded-full';
        case 'pending':
          return 'inline-block px-2 sm:px-3 py-0.5 text-xs font-bold text-yellow-800 bg-yellow-200 rounded-full';
        case 'cancelled':
          return 'inline-block px-2 sm:px-3 py-0.5 text-xs font-bold text-red-800 bg-red-200 rounded-full';
        default:
          return 'inline-block px-2 sm:px-3 py-0.5 text-xs font-bold text-gray-800 bg-gray-200 rounded-full';
      }
    };

    // Load data when component is mounted
    onMounted(() => {
      loadUserData();
    });

    return {
      user,
      formatDate,
      formatTimeSlot,
      getStatusBadgeClass,
    };
  },
};
</script>

<style scoped>
/*
  The table is the main challenge on mobile.
  - min-w-[600px] ensures the table content doesn't crush but enables horizontal scrolling.
  - Hidden classes (`hidden sm:table-cell`, `hidden md:table-cell`) are used in the HTML to remove less critical columns on smaller screens.
*/
.min-w-\[600px\] {
    min-width: 600px;
}
</style>