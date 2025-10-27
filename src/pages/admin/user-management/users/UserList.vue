<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <template v-if="loadingUsers">
      <div class="loading-spinner">
        <Loader :loading-text="'Loading users...'" />
      </div>
    </template>
    <template v-else-if="errorMessage">
      <div class="error-message">
        {{ errorMessage }}
        <button
          class="retry-button"
          @click="retryFetch"
          aria-label="Retry loading users"
        >
          Retry
        </button>
      </div>
    </template>
    <template v-else>
      <div class="controls-container">
        <div class="search-container">
          <VaInput
            v-model="searchQuery"
            placeholder="Search by name or username..."
            class="search-input"
            :disabled="loadingUsers"
            @input="debouncedSearch"
            aria-label="Search users by name or username"
          />
          <VaButton v-if="searchQuery" color="warning" size="small" @click="clearSearch" aria-label="Clear search query">
            Clear Search
          </VaButton>
        </div>
        <div class="per-page-container">
          <VaSelect
            v-model="perPage"
            :options="perPageOptions"
            label="Items per page"
            value-by="value"
            text-by="text"
            class="per-page-select"
            @update:modelValue="handlePerPageChange"
            aria-label="Select items per page"
          />
        </div>
      </div>
      <div v-if="!users || (users.length === 0 && !loadingUsers)" class="no-data-message">
        No users found.
      </div>
      <div v-else-if="users && users.length > 0" class="table-responsive">
        <VaDataTable
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
            <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" aria-label="View user details" />
          </template>
        </VaDataTable>
      </div>
      <div v-if="users && users.length > 0" class="pagination-container">
        <div class="pagination-info">
          Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} users
        </div>
        <div class="pagination-buttons">
          <VaButton
            size="small"
            :disabled="currentPage === 1"
            @click="handlePageChange(currentPage - 1)"
            aria-label="Go to previous page"
          >
            Previous
          </VaButton>
          <VaButton
            v-for="page in paginationPages"
            :key="page"
            size="small"
            :color="currentPage === page ? '#00A3E0' : 'secondary'"
            @click="handlePageChange(page)"
            :aria-label="`Go to page ${page}`"
          >
            {{ page }}
          </VaButton>
          <VaButton
            size="small"
            :disabled="currentPage === pagination.last_page"
            @click="handlePageChange(currentPage + 1)"
            aria-label="Go to next page"
          >
            Next
          </VaButton>
        </div>
      </div>
      <VaModal v-model="showView" size="large" layout="centered" close-button hide-default-actions class="modal-container">
        <div class="modal-title">User Details</div>
        <div v-if="selectedUser" class="modal-content">
          <div class="user-details">
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
          <div class="bookings-section">
            <div class="bookings-title">Bookings</div>
            <div v-if="selectedUser.bookings && selectedUser.bookings.length > 0" class="table-responsive">
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
            <div v-else class="no-data-message">
              No bookings found for this user.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <VaButton color="secondary" @click="closeView" aria-label="Close user details modal">Close</VaButton>
        </div>
      </VaModal>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '../../../../stores/userStore';
import { debounce } from 'lodash';
import type { User, Pagination, Role } from '../../../../types/user';
import Loader from '../../../../components/Loader.vue';

// Define the expected successful response type structure for getUsers
interface UserFetchResponse {
  data: {
    data: User[];
    // Include other properties returned by your API for pagination
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export default defineComponent({
  name: 'UserList',
  components: {
    Loader,
  },
  setup() {
    const userStore = useUserStore();
    const { users, loadingUsers, searchQuery, currentPage, perPage, totalItems, roles } = storeToRefs(userStore);
    const errorMessage = ref<string | null>(null);
    const maxRetries = 3;
    const retryDelay = 2000;

    const fetchWithRetry = async <T>(
      fn: () => Promise<T>,
      retries: number,
      delay: number
    ): Promise<T | null> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            errorMessage.value = 'Failed to load data. Please check your connection and try again.';
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    };

    const fetchUsers = async () => {
      console.log('Fetching users...', { page: currentPage.value, perPage: perPage.value });
      loadingUsers.value = true;
      errorMessage.value = null;
      
      // We assert the return type to UserFetchResponse to satisfy the generic, 
      // assuming userStore.getUsers() returns this structure.
      const response = await fetchWithRetry(
        () => userStore.getUsers() as Promise<UserFetchResponse>,
        maxRetries,
        retryDelay
      );

      // ⭐ FIX for TS1345: Check explicitly for non-null/non-void response
      if (response !== null && 'data' in response) {
        console.log('Fetch users response:', response.data);
        
        // Use the strongly typed response
        response.data.data.forEach((user: User) => {
          console.log(`User: ${user.username}, role_id: ${user.role_id}, bookings: ${user.bookings?.length || 0}`);
        });
      } else {
        console.error('Failed to fetch users after retries or response was null');
      }
      loadingUsers.value = false;
    };

    const fetchRoles = async () => {
      console.log('Starting to fetch roles...');
      errorMessage.value = null;
      const response = await fetchWithRetry(
        () => userStore.getRoles(),
        maxRetries,
        retryDelay
      );
      
      // Check for non-null response for roles
      if (response !== null) {
        console.log('Roles fetched:', userStore.roles);
      } else {
        console.error('Failed to fetch roles after retries');
      }
    };

    const retryFetch = async () => {
      errorMessage.value = null;
      await Promise.all([fetchRoles(), fetchUsers()]);
    };

    return {
      userStore,
      users,
      loadingUsers,
      searchQuery,
      currentPage,
      perPage,
      totalItems,
      roles,
      errorMessage,
      fetchUsers,
      fetchRoles,
      retryFetch,
    };
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
    await Promise.all([this.fetchRoles(), this.fetchUsers()]);
  },
  methods: {
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
    openView(user: User) {
      this.selectedUser = user;
      this.showView = true;
    },
    closeView() {
      this.selectedUser = null;
      this.showView = false;
    },
    roleDisplay(user: User | null) {
      if (!user || !user.role_id) {
        console.warn(`No role_id for user: ${user?.username || 'unknown'}`);
        return 'N/A';
      }
      if (this.userStore.roles.length === 0) {
        console.warn('No roles loaded, retrying...');
        this.fetchRoles();
        return 'Loading...';
      }
      const role = this.userStore.roles.find(r => r.value === user.role_id);
      if (!role) {
        console.warn(`Role not found for role_id: ${user.role_id}`, this.userStore.roles);
        return user.role || 'N/A';
      }
      return role.text;
    },
    debouncedSearch: null as unknown as () => void,
  },
});
</script>

<style lang="scss" scoped>
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

.p-4 {
  padding: 0.75rem;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }
}

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;

  @media screen and (min-width: 768px) {
    min-height: 400px;
  }
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: #ef4444;
  font-size: 0.875rem;
  text-align: center;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
    padding: 2rem;
  }

  .retry-button {
    margin-top: 0.5rem;
    color: #2563eb;
    text-decoration: underline;
    font-size: 0.875rem;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0.25rem 0.5rem;
    min-height: 40px;

    @media screen and (min-width: 768px) {
      font-size: 1rem;
    }
  }
}

.controls-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;

  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media screen and (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }

  .search-input {
    width: 100%;
    max-width: 100%;
    font-size: 0.875rem;

    @media screen and (min-width: 640px) {
      max-width: 16rem;
    }

    @media screen and (min-width: 768px) {
      max-width: 20rem;
    }
  }

  .va-button {
    min-height: 40px;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
    }
  }
}

.per-page-container {
  .per-page-select {
    width: 100%;
    max-width: 8rem;
    font-size: 0.875rem;

    @media screen and (min-width: 768px) {
      max-width: 10rem;
      font-size: 1rem;
    }
  }
}

.no-data-message {
  text-align: center;
  padding: 1rem;
  color: #6b7280;
  font-size: 0.875rem;

  @media screen and (min-width: 768px) {
    font-size: 1rem;
    padding: 2rem;
  }
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  .va-data-table {
    min-width: 400px;

    th,
    td {
      padding: 0.5rem;
      font-size: 0.75rem;
      white-space: nowrap;

      @media screen and (min-width: 768px) {
        padding: 0.75rem;
        font-size: 0.875rem;
      }
    }
  }
}

.pagination-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;

  @media screen and (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }

  .pagination-info {
    font-size: 0.75rem;
    color: #6b7280;

    @media screen and (min-width: 768px) {
      font-size: 0.875rem;
    }
  }

  .pagination-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;

    @media screen and (min-width: 768px) {
      gap: 0.5rem;
    }

    .va-button {
      min-height: 40px;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;

      @media screen and (min-width: 768px) {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
      }
    }
  }
}

.modal-container {
  padding: 0.75rem;

  @media screen and (min-width: 768px) {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.75rem;

    @media screen and (min-width: 768px) {
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
  }

  .modal-content {
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 0.5rem;

    @media screen and (min-width: 768px) {
      max-height: 70vh;
      padding-right: 1rem;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.875rem;

      @media screen and (min-width: 768px) {
        font-size: 1rem;
        gap: 1rem;
      }

      p {
        margin: 0;
      }
    }

    .bookings-section {
      margin-top: 1rem;

      @media screen and (min-width: 768px) {
        margin-top: 1.5rem;
      }

      .bookings-title {
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 0.5rem;

        @media screen and (min-width: 768px) {
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
        }
      }
    }
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.75rem;

    @media screen and (min-width: 768px) {
      margin-top: 1rem;
    }

    .va-button {
      min-height: 40px;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;

      @media screen and (min-width: 768px) {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
      }
    }
  }
}

@media (max-width: 640px) {
  .p-4 {
    padding: 0.5rem;
  }

  .controls-container {
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .search-container {
    .search-input {
      font-size: 0.75rem;
      max-width: 100%;
    }

    .va-button {
      font-size: 0.625rem;
      padding: 0.25rem 0.5rem;
    }
  }

  .per-page-container {
    .per-page-select {
      font-size: 0.75rem;
      max-width: 7rem;
    }
  }

  .no-data-message {
    font-size: 0.75rem;
    padding: 0.75rem;
  }

  .table-responsive {
    .va-data-table {
      min-width: 300px;

      th[data-key="first_name"],
      td[data-key="first_name"],
      th[data-key="last_name"],
      td[data-key="last_name"],
      th[data-key="phone"],
      td[data-key="phone"] {
        display: none; /* Hide less critical columns on mobile */
      }

      th[data-key="sn"],
      td[data-key="sn"] {
        min-width: 40px;
      }

      th[data-key="username"],
      td[data-key="username"] {
        min-width: 100px;
      }

      th[data-key="email"],
      td[data-key="email"] {
        min-width: 120px;
      }

      th[data-key="role"],
      td[data-key="role"] {
        min-width: 80px;
      }

      th[data-key="actions"],
      td[data-key="actions"] {
        min-width: 50px;
      }
    }
  }

  .pagination-container {
    gap: 0.25rem;

    .pagination-info {
      font-size: 0.625rem;
    }

    .pagination-buttons {
      .va-button {
        font-size: 0.625rem;
        padding: 0.25rem 0.5rem;
        min-width: 40px;
      }
    }
  }

  .modal-container {
    padding: 0.5rem;

    .modal-title {
      font-size: 1rem;
      margin-bottom: 0.5rem;
    }

    .modal-content {
      max-height: 50vh;

      .user-details {
        font-size: 0.75rem;
        gap: 0.25rem;
      }

      .bookings-section {
        margin-top: 0.75rem;

        .bookings-title {
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .table-responsive {
          .va-data-table {
            min-width: 250px;

            th[data-key="property_price"],
            td[data-key="property_price"],
            th[data-key="appointment_type_name"],
            td[data-key="appointment_type_name"],
            th[data-key="date"],
            td[data-key="date"],
            th[data-key="time_slot"],
            td[data-key="time_slot"],
            th[data-key="duration"],
            td[data-key="duration"],
            th[data-key="created_at"],
            td[data-key="created_at"] {
              display: none; /* Hide less critical booking columns on mobile */
            }

            th[data-key="sn"],
            td[data-key="sn"] {
              min-width: 40px;
            }

            th[data-key="property_title"],
            td[data-key="property_title"] {
              min-width: 100px;
            }

            th[data-key="status"],
            td[data-key="status"] {
              min-width: 80px;
            }
          }
        }
      }
    }

    .modal-footer {
      margin-top: 0.5rem;

      .va-button {
        font-size: 0.625rem;
        padding: 0.25rem 0.5rem;
      }
    }
  }
}

@media (max-width: 480px) {
  .p-4 {
    padding: 0.25rem;
  }

  .controls-container {
    gap: 0.125rem;
  }

  .search-container {
    .search-input {
      font-size: 0.625rem;
    }

    .va-button {
      font-size: 0.5rem;
      padding: 0.2rem 0.4rem;
    }
  }

  .per-page-container {
    .per-page-select {
      font-size: 0.625rem;
      max-width: 6rem;
    }
  }

  .no-data-message {
    font-size: 0.625rem;
    padding: 0.5rem;
  }

  .error-message {
    font-size: 0.75rem;
    padding: 0.75rem;

    .retry-button {
      font-size: 0.75rem;
      padding: 0.2rem 0.4rem;
    }
  }

  .pagination-container {
    .pagination-info {
      font-size: 0.5rem;
    }

    .pagination-buttons {
      .va-button {
        font-size: 0.5rem;
        padding: 0.2rem 0.4rem;
        min-width: 36px;
      }
    }
  }

  .modal-container {
    padding: 0.25rem;

    .modal-title {
      font-size: 0.875rem;
    }

    .modal-content {
      max-height: 40vh;

      .user-details {
        font-size: 0.625rem;
      }

      .bookings-section {
        .bookings-title {
          font-size: 0.75rem;
        }
      }
    }
  }
}
</style>