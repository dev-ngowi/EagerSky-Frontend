<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">Role Assignment</h2>
    
    <!-- Search and Per Page Controls -->
    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by username, email or name..."
          class="w-full sm:w-80"
          :disabled="loadingUsers"
          @input="handleSearchInput"
          clearable
        />
        <VaButton 
          v-if="searchQuery" 
          color="warning" 
          size="small" 
          @click="clearSearch"
          class="w-full sm:w-auto"
        >
          Clear Search
        </VaButton>
      </div>
      
      <div class="flex items-center w-full lg:w-auto">
        <VaSelect
          v-model="pagination.per_page"
          :options="perPageOptions"
          label="Items per page"
          value-by="value"
          text-by="text"
          class="w-full sm:w-40"
          @update:modelValue="handlePerPageChange"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loadingUsers" class="text-center py-8">
      <VaProgressCircle indeterminate />
      <p class="mt-3 text-gray-600">Loading users...</p>
    </div>

    <!-- No Users Found -->
    <div v-else-if="!users || users.length === 0" class="text-center py-8">
      <div class="text-gray-500">
        <i class="fas fa-users text-4xl mb-3"></i>
        <p class="text-lg">{{ searchQuery ? 'No users found matching your search.' : 'No users found.' }}</p>
      </div>
    </div>

    <!-- Data Table -->
    <div v-else class="overflow-x-auto">
      <VaDataTable
        :key="componentKey"
        :items="users"
        striped
        :columns="tableColumns"
        :loading="loadingUsers"
        class="data-table"
      >
        <!-- Serial Number -->
        <template #cell(sn)="{ rowIndex }">
          <span class="font-medium text-sm">
            {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
          </span>
        </template>

        <!-- Full Name -->
        <template #cell(full_name)="{ rowData }">
          <div class="flex flex-col sm:flex-row sm:items-center">
            <span class="font-medium text-sm">{{ rowData.full_name }}</span>
            <span class="text-xs text-gray-500 sm:ml-2 sm:hidden break-all">{{ rowData.email }}</span>
          </div>
        </template>

        <!-- Username (Hidden on mobile) -->
        <template #cell(username)="{ rowData }">
          <span class="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
            {{ rowData.username }}
          </span>
        </template>

        <!-- Email (Hidden on mobile) -->
        <template #cell(email)="{ rowData }">
          <span class="text-sm text-gray-600 break-all">{{ rowData.email }}</span>
        </template>

        <!-- Current Role with Badge -->
        <template #cell(role)="{ rowData }">
          <div class="flex flex-wrap gap-1">
            <VaBadge
              v-if="rowData.role"
              :color="getRoleBadgeColor(rowData.role.name)"
              :text="rowData.role.name"
              class="role-badge"
            />
            <VaBadge
              v-else
              color="danger"
              text="No Role Assigned"
              class="role-badge"
            />
          </div>
        </template>

        <!-- Assign Role -->
        <template #cell(assign_role)="{ rowData }">
          <VaSelect
            :model-value="rowData.role_name || ''"
            :options="roleOptions"
            :disabled="updatingRole && updatingId === rowData.id"
            @update:model-value="(value) => updateRole(rowData, value)"
            class="role-select"
            placeholder="Select Role"
            value-by="value"
            text-by="text"
            :loading="updatingRole && updatingId === rowData.id"
          />
        </template>
      </VaDataTable>
    </div>

    <!-- Pagination -->
    <div v-if="users && users.length > 0" class="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
      <div class="text-sm text-gray-600 order-2 sm:order-1">
        Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }} users
      </div>
      
      <div class="flex flex-wrap justify-center gap-1 order-1 sm:order-2">
        <VaButton
          size="small"
          :disabled="pagination.current_page === 1"
          @click="handlePageChange(pagination.current_page - 1)"
          class="pagination-btn"
        >
          <i class="fas fa-chevron-left mr-1"></i>
          <span class="hidden sm:inline">Previous</span>
        </VaButton>
        
        <VaButton
          v-for="page in paginationPages"
          :key="page"
          size="small"
          :color="pagination.current_page === page ? 'primary' : 'secondary'"
          @click="handlePageChange(page)"
          class="pagination-btn"
          :class="{ 'current-page': pagination.current_page === page }"
        >
          {{ page }}
        </VaButton>
        
        <VaButton
          size="small"
          :disabled="pagination.current_page === pagination.last_page"
          @click="handlePageChange(pagination.current_page + 1)"
          class="pagination-btn"
        >
          <span class="hidden sm:inline">Next</span>
          <i class="fas fa-chevron-right ml-1"></i>
        </VaButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import makeRequest from '../../../../services/makeRequest';

interface User {
  id: number;
  full_name: string;
  username: string;
  email: string;
  role: { id: number; name: string } | null;
  role_name: string;
}

interface Role {
  id: number;
  name: string;
}

export default defineComponent({
  name: 'RoleAssignment',
  data() {
    return {
      users: [] as User[],
      roles: [] as Role[],
      roleOptions: [] as { value: string; text: string }[],
      pagination: {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
        from: 1,
        to: 10,
      },
      loadingUsers: true, // Start with loading true
      updatingRole: false,
      updatingId: null as number | null,
      searchQuery: '' as string,
      componentKey: 0,
      perPageOptions: [
        { value: 10, text: '10 per page' },
        { value: 15, text: '15 per page' },
        { value: 25, text: '25 per page' },
        { value: 50, text: '50 per page' },
      ],
    };
  },
  
  computed: {
    tableColumns() {
      // Responsive columns - hide some on mobile
      const baseColumns = [
        { key: 'sn', sortable: false, label: '#', width: '60px' },
        { key: 'full_name', sortable: true, label: 'Name', width: '200px' },
        { key: 'role', sortable: true, label: 'Current Role', width: '150px' },
        { key: 'assign_role', sortable: false, label: 'Assign Role', width: '200px' },
      ];

      // Add username and email columns for larger screens
      if (window.innerWidth >= 768) {
        baseColumns.splice(2, 0, 
          { key: 'username', sortable: true, label: 'Username', width: '150px' },
          { key: 'email', sortable: true, label: 'Email', width: '200px' }
        );
      }

      return baseColumns;
    },

    paginationPages() {
      const pages: number[] = [];
      const lastPage = this.pagination.last_page;
      const current = this.pagination.current_page;
      const range = window.innerWidth < 640 ? 1 : 2; // Smaller range on mobile
      
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

    // Debounced search function with increased delay
    debouncedSearch() {
      return debounce(this.performSearch, 1000); // Increased from 500ms to 1000ms
    },
  },

  async mounted() {
    await this.getRoles();
    await this.getUsers();
    
    // Add window resize listener for responsive columns
    window.addEventListener('resize', this.handleResize);
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },

  methods: {
    handleResize() {
      // Force re-render of table columns on resize
      this.componentKey += 1;
    },

    getRoleBadgeColor(roleName: string): string {
      const roleColors: { [key: string]: string } = {
        'Admin': 'danger',
        'Administrator': 'danger', 
        'Manager': 'warning',
        'User': 'primary',
        'Editor': 'info',
        'Viewer': 'success',
        'Guest': 'secondary',
      };
      
      return roleColors[roleName] || 'primary';
    },

    async getRoles() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/roles`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        
        if (response.status === 200) {
          this.roles = response.data.data.roles || [];
          this.roleOptions = this.roles.map(role => ({ 
            value: role.name, 
            text: role.name 
          }));
        } else {
          this.showErrorMessage(response.data?.message || 'Failed to fetch roles.');
        }
      } catch (error: any) {
        this.showErrorMessage(error.response?.data?.message || 'Failed to fetch roles.');
      }
    },

    async getUsers(params: { page?: number; per_page?: number; search?: string } = {}) {
      this.loadingUsers = true;
      try {
        const requestParams: any = {
          page: params.page || this.pagination.current_page,
          per_page: params.per_page || this.pagination.per_page,
        };

        // Handle search parameter properly
        const searchTerm = params.search !== undefined ? params.search : this.searchQuery;
        if (searchTerm && searchTerm.trim()) {
          requestParams.search = searchTerm.trim();
        }

        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/user-roles`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: requestParams,
        });

        if (response.status === 200) {
          const userRoles = response.data.data?.user_roles || [];
          this.users = userRoles.map((userRole: any) => ({
            id: userRole.user.id,
            full_name: `${userRole.user.first_name} ${userRole.user.last_name}`,
            username: userRole.user.username,
            email: userRole.user.email,
            role: userRole.role,
            role_name: userRole.role?.name || '',
          }));

          this.pagination = {
            total: response.data.pagination?.total || 0,
            per_page: response.data.pagination?.per_page || this.pagination.per_page,
            current_page: response.data.pagination?.current_page || 1,
            last_page: response.data.pagination?.last_page || 1,
            from: response.data.pagination?.from || 0,
            to: response.data.pagination?.to || 0,
          };
        } else {
          this.showErrorMessage(response.data?.message || 'Failed to fetch users.');
        }
      } catch (error: any) {
        this.showErrorMessage(error.response?.data?.message || 'Failed to fetch users.');
      } finally {
        this.loadingUsers = false;
      }
    },

    handleSearchInput() {
      // Reset to first page when searching
      this.pagination.current_page = 1;
      this.debouncedSearch();
    },

    async performSearch() {
      await this.getUsers({ 
        page: 1, 
        per_page: this.pagination.per_page, 
        search: this.searchQuery 
      });
      this.componentKey += 1;
    },

    async clearSearch() {
      this.searchQuery = '';
      this.pagination.current_page = 1;
      await this.getUsers({ 
        page: 1, 
        per_page: this.pagination.per_page, 
        search: '' 
      });
      this.componentKey += 1;
    },

    async handlePageChange(page: number) {
      if (page < 1 || page > this.pagination.last_page) return;
      
      this.pagination.current_page = page;
      await this.getUsers({ 
        page, 
        per_page: this.pagination.per_page, 
        search: this.searchQuery 
      });
      this.componentKey += 1;
    },

    async handlePerPageChange(perPage: number) {
      this.pagination.per_page = perPage;
      this.pagination.current_page = 1;
      await this.getUsers({ 
        page: 1, 
        per_page: perPage, 
        search: this.searchQuery 
      });
      this.componentKey += 1;
    },

    async updateRole(user: User, newRoleValue: any) {
      if (this.updatingRole && this.updatingId === user.id) return;

      this.updatingRole = true;
      this.updatingId = user.id;

      try {
        let roleNameString = typeof newRoleValue === 'string' 
          ? newRoleValue.trim()
          : (newRoleValue?.value || newRoleValue?.text || newRoleValue?.name || '').toString().trim();

        if (!roleNameString) {
          this.showErrorMessage('Invalid role selected');
          return;
        }

        const newRole = this.roles.find(role => role.name === roleNameString);
        if (!newRole) {
          this.showErrorMessage('Invalid role selected');
          return;
        }

        if (user.role && user.role.name === roleNameString) {
          this.showWarningMessage('User already has this role');
          return;
        }

        const hasExistingRole = user.role !== null;
        const url = hasExistingRole
          ? `${import.meta.env.VITE_APP_API_BASE_URL}/v1/user-roles/${user.id}`
          : `${import.meta.env.VITE_APP_API_BASE_URL}/v1/user-roles`;
        const method = hasExistingRole ? 'put' : 'post';

        const response = await makeRequest({
          url,
          method,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          data: {
            user_id: user.id,
            role_id: newRole.id,
          },
        });

        if (response.status === 200 || response.status === 201) {
          // Update user data locally
          user.role = { id: newRole.id, name: roleNameString };
          user.role_name = roleNameString;
          this.showSuccessMessage(
            `User role ${hasExistingRole ? 'updated' : 'assigned'} successfully.`
          );
        } else {
          this.showErrorMessage(
            response.data?.message || `Failed to ${hasExistingRole ? 'update' : 'assign'} user role.`
          );
        }
      } catch (error: any) {
        this.showErrorMessage(
          error.response?.data?.message || `Failed to ${user.role ? 'update' : 'assign'} user role.`
        );
      } finally {
        this.updatingRole = false;
        this.updatingId = null;
      }
    },

    showSuccessMessage(message: string) {
      Swal.fire({
        title: 'Success!',
        text: message,
        icon: 'success',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    },

    showErrorMessage(message: string) {
      Swal.fire({
        title: 'Error!',
        text: message,
        icon: 'error',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    },

    showWarningMessage(message: string) {
      Swal.fire({
        title: 'Warning!',
        text: message,
        icon: 'warning',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    },
  },
});
</script>

<style scoped>
.card {
  background-color: #ffffff;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.role-badge {
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.role-select {
  min-width: 140px;
}

.pagination-btn {
  min-width: 36px;
  height: 36px;
  transition: all 0.2s ease;
}

.pagination-btn.current-page {
  font-weight: 600;
  transform: scale(1.05);
}

.data-table {
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* Enhanced responsive styles */
:deep(.va-data-table) {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

:deep(.va-data-table__table) {
  min-width: 100%;
  table-layout: auto;
}

:deep(.va-data-table__table-th) {
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 1rem 0.75rem;
  background-color: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  color: #374151;
}

:deep(.va-data-table__table-td) {
  font-size: 0.875rem;
  padding: 0.875rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

:deep(.va-data-table__table-tr:hover) {
  background-color: #f8fafc;
}

:deep(.va-progress-circle) {
  margin: 1rem auto;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .card {
    padding: 1rem;
    border-radius: 0.5rem;
  }

  .role-select {
    min-width: 120px;
    font-size: 0.8rem;
  }

  :deep(.va-data-table__table-th),
  :deep(.va-data-table__table-td) {
    font-size: 0.8125rem;
    padding: 0.75rem 0.5rem;
  }

  .pagination-btn {
    min-width: 32px;
    height: 32px;
    font-size: 0.875rem;
  }

  .role-badge {
    font-size: 0.6875rem;
  }
}

@media (max-width: 480px) {
  .card {
    padding: 0.75rem;
    margin: 0.5rem;
  }

  :deep(.va-data-table__table-th),
  :deep(.va-data-table__table-td) {
    font-size: 0.75rem;
    padding: 0.5rem 0.375rem;
  }

  .pagination-btn {
    min-width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }

  :deep(.va-select),
  :deep(.va-input) {
    font-size: 0.875rem;
  }

  .role-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
  }
}

/* Loading animation */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-row {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>