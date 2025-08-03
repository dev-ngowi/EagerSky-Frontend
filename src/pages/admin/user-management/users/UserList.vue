<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <!-- Search -->
      <div class="flex space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by name or username..."
          class="w-64"
          :disabled="loadingUsers"
          @input="debouncedSearch"
        />
        <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch"> Clear Search </VaButton>
      </div>
      <!-- Pagination Controls -->
      <div class="flex items-center space-x-4">
        <VaSelect
          v-model="perPage"
          :options="perPageOptions"
          label="Items per page"
          value-by="value"
          text-by="text"
          class="w-32"
          @update:modelValue="handlePerPageChange"
        />
      </div>
    </div>
    <div v-if="!users || (users.length === 0 && !loadingUsers)" class="text-center py-4">No users found.</div>
    <VaDataTable
      v-else-if="users && users.length > 0"
      :key="componentKey"
      :items="users"
      striped
      :columns="columns"
      :loading="loadingUsers"
    >
      <template #cell(sn)="{ rowIndex }">
        {{ (currentPage - 1) * perPage + rowIndex + 1 }}
      </template>
      <template #cell(actions)="{ rowData }: { rowData: User }">
        <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
      </template>
    </VaDataTable>
    <!-- Pagination Navigation -->
    <div v-if="users && users.length > 0" class="flex justify-between items-center mt-4">
      <div class="text-sm">Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} users</div>
      <div class="flex space-x-2">
        <VaButton size="small" :disabled="currentPage === 1" @click="handlePageChange(currentPage - 1)">
          Previous
        </VaButton>
        <VaButton
          v-for="page in paginationPages"
          :key="page"
          size="small"
          :color="currentPage === page ? '#00A3E0' : 'secondary'"
          @click="handlePageChange(page)"
        >
          {{ page }}
        </VaButton>
        <VaButton
          size="small"
          :disabled="currentPage === pagination.last_page"
          @click="handlePageChange(currentPage + 1)"
        >
          Next
        </VaButton>
      </div>
    </div>
    <!-- View Modal -->
    <VaModal v-model="showView" size="large" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">User Details</div>
      <div v-if="selectedUser" class="space-y-4">
        <div class="space-y-2">
          <p><strong>First Name:</strong> {{ selectedUser.first_name || 'N/A' }}</p>
          <p><strong>Last Name:</strong> {{ selectedUser.last_name || 'N/A' }}</p>
          <p><strong>Username:</strong> {{ selectedUser.username || 'N/A' }}</p>
          <p><strong>Email:</strong> {{ selectedUser.email || 'N/A' }}</p>
          <p><strong>Phone:</strong> {{ selectedUser.phone || 'N/A' }}</p>
          <p><strong>Role:</strong> {{ roleDisplay(selectedUser) }}</p>
          <p><strong>Client Type:</strong> {{ selectedUser.client_type || 'N/A' }}</p>
          <p><strong>Student Registration Number:</strong> {{ selectedUser.student_registration_number || 'N/A' }}</p>
          <p><strong>Created At:</strong> {{ selectedUser.created_at || 'N/A' }}</p>
          <p><strong>Updated At:</strong> {{ selectedUser.updated_at || 'N/A' }}</p>
        </div>
        <!-- Bookings Section -->
        <div class="mt-6">
          <div class="text-md font-semibold mb-2">Bookings</div>
          <div v-if="selectedUser.bookings && selectedUser.bookings.length > 0">
            <VaDataTable
              :items="selectedUser.bookings"
              :columns="bookingColumns"
              striped
              :loading="loadingUsers"
            >
              <template #cell(sn)="{ rowIndex }">
                {{ rowIndex + 1 }}
              </template>
            </VaDataTable>
          </div>
          <div v-else class="text-center py-2">No bookings found for this user.</div>
        </div>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="closeView">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '../../../../stores/userStore';
import { debounce } from 'lodash';
import type { User, Pagination, Role } from '../../../../types/user';

export default defineComponent({
  name: 'UserList',
  setup() {
    const userStore = useUserStore();
    const { users, loadingUsers, searchQuery, currentPage, perPage, totalItems, roles } = storeToRefs(userStore);
    return { userStore, users, loadingUsers, searchQuery, currentPage, perPage, totalItems, roles };
  },
  data() {
    return {
      showView: false,
      selectedUser: null as User | null,
      componentKey: 0,
      perPageOptions: [
        { value: 10, text: '10' },
        { value: 25, text: '25' },
        { value: 50, text: '50' },
      ] as Role[],
    };
  },
  computed: {
    columns() {
      return [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'first_name', sortable: true, label: 'First Name' },
        { key: 'last_name', sortable: true, label: 'Last Name' },
        { key: 'username', sortable: true, label: 'Username' },
        { key: 'email', sortable: false, label: 'Email' },
        { key: 'phone', sortable: false, label: 'Phone' },
        {
          key: 'role',
          sortable: true,
          label: 'Role',
          render: (row: User) => this.roleDisplay(row),
        },
        { key: 'actions', label: 'Actions', sortable: false },
      ];
    },
    bookingColumns() {
      return [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property Title' },
        { key: 'property_price', sortable: true, label: 'Price' },
        { key: 'appointment_type_name', sortable: true, label: 'Appointment Type' },
        { key: 'date', sortable: true, label: 'Date' },
        { key: 'time_slot', sortable: true, label: 'Time Slot' },
        { key: 'duration', sortable: false, label: 'Duration (min)' },
        { key: 'status', sortable: true, label: 'Status' },
        { key: 'created_at', sortable: true, label: 'Created At' },
      ];
    },
    pagination(): Pagination {
      return {
        current_page: this.currentPage,
        per_page: this.perPage,
        total: this.totalItems,
        last_page: Math.ceil(this.totalItems / this.perPage),
        from: this.totalItems > 0 ? (this.currentPage - 1) * this.perPage + 1 : 0,
        to: Math.min(this.currentPage * this.perPage, this.totalItems),
      };
    },
    paginationPages() {
      const pages: number[] = [];
      const lastPage = this.pagination.last_page;
      const current = this.currentPage;
      const range = 2;
      let start = Math.max(1, current - range);
      let end = Math.min(lastPage, current + range);

      if (end - start < 2 * range) {
        if (start === 1) {
          end = Math.min(lastPage, start + 2 * range);
        } else if (end === lastPage) {
          start = Math.max(1, end - 2 * range);
        }
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    },
  },
  created() {
    this.debouncedSearch = debounce(this.handleSearch, 300) as () => void;
  },
  async mounted() {
    console.log('Starting to fetch roles...');
    await this.userStore.getRoles();
    console.log('Roles fetched:', this.userStore.roles);
    console.log('Fetching users...');
    await this.fetchUsers();
  },
  methods: {
    async fetchUsers() {
      console.log('Fetching users...', { page: this.currentPage, perPage: this.perPage });
      const response = await this.userStore.getUsers();
      if (response && 'data' in response) {
        console.log('Fetch users response:', response.data);
        response.data.data.forEach((user: User) => {
          console.log(`User: ${user.username}, role_id: ${user.role_id}, bookings: ${user.bookings.length}`);
        });
      }
      console.log('Users state:', this.users);
      this.componentKey += 1;
    },
    openView(user: User) {
      this.selectedUser = user;
      this.showView = true;
    },
    closeView() {
      this.selectedUser = null;
      this.showView = false;
    },
    async handleSearch() {
      console.log('Search query:', this.searchQuery);
      this.userStore.setSearchQuery(this.searchQuery);
      await this.fetchUsers();
    },
    clearSearch() {
      this.searchQuery = '';
      this.userStore.setSearchQuery('');
      this.fetchUsers();
    },
    handlePageChange(page: number) {
      this.userStore.setPage(page);
      this.fetchUsers();
    },
    handlePerPageChange(perPage: number) {
      this.userStore.setPerPage(perPage);
      this.fetchUsers();
    },
    roleDisplay(user: User | null) {
      if (!user || !user.role_id) {
        console.warn(`No role_id for user: ${user?.username || 'unknown'}`);
        return 'N/A';
      }
      if (this.userStore.roles.length === 0) {
        console.warn('No roles loaded, retrying...');
        this.userStore.getRoles();
        return 'Loading...';
      }
      const role = this.userStore.roles.find(r => r.value === user.role_id);
      if (!role) {
        console.warn(`Role not found for role_id: ${user.role_id}`, this.userStore.roles);
        return user.role || 'N/A'; // Fallback to role from response
      }
      return role.text;
    },
    debouncedSearch: null as unknown as () => void,
  },
});
</script>

<style scoped>
.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
.p-6 {
  padding: 1.5rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
.space-y-2 > * + * {
  margin-top: 0.5rem;
}
.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>