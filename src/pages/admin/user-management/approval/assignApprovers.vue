<template>
    <div class="bg-white shadow-md rounded-lg p-4">
        <template v-if="loadingItems">
            <div class="loading-spinner">
                <Loader loading-text="Loading approval configurations..." />
            </div>
        </template>
        <template v-else-if="errorMessage">
            <div class="text-center py-4 text-red-600">
                {{ errorMessage }}
                <button class="ml-4 text-blue-600 underline" @click="retryFetch">Retry</button>
            </div>
        </template>
        <template v-else>
            <div class="text-lg font-bold mb-4">Approval Configurations</div>
            <div v-if="!items || items.length === 0" class="text-center py-4 text-gray-500">
                No configurations available
            </div>
            <VaDataTable
                v-else
                :items="items"
                striped
                :columns="columns"
                hoverable
            >
                <template #cell(sn)="{ rowIndex }">
                    {{ rowIndex + 1 }}
                </template>
                <template #cell(type)="{ rowData }">
                    {{ capitalize(rowData.type.replace('-', ' ')) }}
                </template>
                <template #cell(approvers)="{ rowData }">
                    {{ getApproversString(rowData.approvers) }}
                </template>
                <template #cell(actions)="{ rowData }">
                    <div class="flex space-x-2">
                        <VaButton
                            size="small"
                            color="primary"
                            icon="visibility"
                            @click="openView(rowData)"
                        />
                        <VaButton
                            v-if="isAdmin"
                            size="small"
                            color="warning"
                            icon="edit"
                            class="ml-2"
                            :disabled="loadingAction"
                            @click="openAssignApprovers(rowData)"
                        />
                        <VaButton
                            v-if="isAdmin && rowData.approvers.length > 0"
                            size="small"
                            color="danger"
                            icon="delete"
                            class="ml-2"
                            :disabled="loadingAction"
                            @click="confirmDelete(rowData)"
                        />
                    </div>
                </template>
            </VaDataTable>
            <VaModal
                v-model="showAssignApprovers"
                size="large"
                layout="centered"
                close-button
                hide-default-actions
                class="p-4"
            >
                <div class="text-lg font-bold mb-4">
                    Assign Approvers for {{ capitalize(selectedType.replace('-', ' ')) }}
                </div>
                <div class="space-y-4">
                    <VaSelect
                        v-model="selectedApprovers"
                        :options="filteredUsers"
                        label="Select Approvers (in order)"
                        multiple
                        value-by="id"
                        text-by="name"
                        placeholder="Search and select users"
                        searchable
                        class="w-full"
                        :disabled="loadingUsers || loadingAction"
                        :error="filteredUsers.length === 0 && !loadingUsers"
                        :error-messages="filteredUsers.length === 0 && !loadingUsers ? ['No users available to assign'] : []"
                    />
                    <div class="flex justify-end space-x-2">
                        <VaButton
                            color="primary"
                            :disabled="loadingAction"
                            @click="handleAssignApprovers"
                        >
                            Assign
                        </VaButton>
                        <VaButton color="secondary" @click="closeAssignApprovers">Cancel</VaButton>
                    </div>
                </div>
            </VaModal>
            <VaModal
                v-model="showView"
                size="large"
                layout="centered"
                close-button
                hide-default-actions
                class="p-4"
            >
                <div class="text-lg font-bold mb-4">
                    Approvers for {{ capitalize(selectedConfig?.type.replace('-', ' ')) }}
                </div>
                <div v-if="selectedConfig" class="space-y-2">
                    <p v-if="selectedConfig.approvers.length === 0">No approvers assigned.</p>
                    <div v-else>
                        <div v-for="(approver, index) in selectedConfig.approvers" :key="index" class="border-b py-2">
                            <p><strong>Level {{ approver.level }}:</strong> {{ approver.user.first_name }} {{ approver.user.last_name }} ({{ approver.user.role }})</p>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end mt-4">
                    <VaButton color="secondary" @click="closeView">Close</VaButton>
                </div>
            </VaModal>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import Loader from '../../../../components/Loader.vue';

// Interfaces
interface Approver {
    user: {
        id: number;
        first_name: string;
        last_name: string;
        role: string;
    };
    level: number;
}

interface Item {
    type: string;
    approvers: Approver[];
}

interface User {
    id: number;
    name: string;
    role: string;
}

// State
const items = ref<Item[]>([]);
const loadingItems = ref<boolean>(false);
const errorMessage = ref<string>('');
const loadingAction = ref<boolean>(false);
const showAssignApprovers = ref<boolean>(false);
const selectedApprovers = ref<number[]>([]);
const users = ref<User[]>([]);
const loadingUsers = ref<boolean>(false);
const selectedType = ref<string>('');
const selectedConfig = ref<Item | null>(null);
const showView = ref<boolean>(false);

// Compute isAdmin from localStorage
const userData = JSON.parse(localStorage.getItem('userData') || '{}');
const isAdmin = computed(() => userData.role === 'admin');

// Computed filtered users to exclude tenants
const filteredUsers = computed(() => {
    return users.value.filter(user => user.role !== 'tenant');
});

// Table columns
const columns = [
    { key: 'sn', label: 'S/N', sortable: false },
    { key: 'type', label: 'Type', sortable: false },
    { key: 'approvers', label: 'Approvers', sortable: false },
    { key: 'actions', label: 'Actions', sortable: false },
];

// Helpers
const capitalize = (value: string) => {
    return value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const getApproversString = (approvers: Approver[]) => {
    return approvers
        .sort((a, b) => a.level - b.level)
        .map(a => `${a.user.first_name} ${a.user.last_name} (${a.user.role}) - Level ${a.level}`)
        .join('; ') || 'No approvers assigned';
};

const getEndpoint = (type: string) => {
    if (type === 'booking') return 'bookings';
    if (type === 'rental-application') return 'rental-applications';
    if (type === 'payment') return 'payments';
    throw new Error('Invalid type');
};

// Fetch with retry logic
const fetchWithRetry = async <T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            if (attempt === retries) {
                errorMessage.value = 'Failed to load data. Please check your connection and try again.';
                return null;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return null;
};

// Fetch configurations
const fetchConfigs = async () => {
    loadingItems.value = true;
    errorMessage.value = '';
    try {
        const types = ['booking', 'rental-application', 'payment'];
        const promises = types.map(async (t) => {
            const endpoint = getEndpoint(t);
            const response = await fetchWithRetry(() =>
                makeRequest({
                    url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/${endpoint}/approvers`,
                    method: 'get',
                    headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
                })
            );
            return { type: t, approvers: response?.data.data || [] };
        });
        const results = await Promise.all(promises);
        items.value = results.filter(Boolean) as Item[];
    } catch (error: any) {
        console.error('Fetch configurations error:', error);
        errorMessage.value = error.response?.data?.message || 'An error occurred while fetching configurations';
        Swal.fire({
            title: 'Error!',
            text: errorMessage.value,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
        });
    } finally {
        loadingItems.value = false;
    }
};

// Retry fetch
const retryFetch = async () => {
    errorMessage.value = '';
    await fetchConfigs();
};

// Fetch users
const fetchUsers = async (roles: string[]) => {
    loadingUsers.value = true;
    users.value = [];
    try {
        const response = await fetchWithRetry(() =>
            makeRequest({
                url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
                method: 'get',
                headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
                params: { roles: roles.join(',') },
            })
        );
        if (response && response.status === 200) {
            users.value = response.data.data
                .filter((user: any) => user.role && user.role !== 'tenant' && roles.includes(user.role))
                .map((user: any) => ({
                    id: user.id,
                    name: `${user.first_name} ${user.last_name} (${user.role})`,
                    role: user.role,
                }));
        } else {
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('Fetch users error:', error);
        Swal.fire({
            title: 'Error!',
            text: 'Failed to load users for assignment.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
        });
    } finally {
        loadingUsers.value = false;
    }
};

// Open assign approvers modal
const openAssignApprovers = (rowData: Item) => {
    if (!isAdmin.value) {
        Swal.fire({
            title: 'Error!',
            text: 'You do not have permission to assign approvers.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
        });
        return;
    }
    selectedType.value = rowData.type;
    selectedApprovers.value = rowData.approvers.map(a => a.user.id);
    const roles = selectedType.value === 'payment' ? ['accountant'] : ['admin', 'maintainer'];
    fetchUsers(roles);
    showAssignApprovers.value = true;
};

// Close assign approvers modal
const closeAssignApprovers = () => {
    selectedApprovers.value = [];
    showAssignApprovers.value = false;
    selectedType.value = '';
    users.value = [];
};

// Handle assigning approvers
const handleAssignApprovers = async () => {
    if (!selectedType.value || !isAdmin.value) {
        if (!isAdmin.value) {
            Swal.fire({
                title: 'Error!',
                text: 'You do not have permission to assign approvers.',
                icon: 'error',
                position: 'top-end',
                toast: true,
                showConfirmButton: false,
                timer: 3000,
            });
        }
        return;
    }

    loadingAction.value = true;
    try {
        const endpoint = getEndpoint(selectedType.value);
        const token = localStorage.getItem('auth_token') || '';
        const response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/${endpoint}/assign-approvers`,
            method: 'post',
            headers: { Authorization: `Bearer ${token}` },
            data: { user_ids: selectedApprovers.value },
        });
        if (response.status === 200) {
            Swal.fire({
                title: 'Success!',
                text: `Approvers assigned successfully for ${capitalize(selectedType.value.replace('-', ' '))}.`,
                icon: 'success',
                position: 'top-end',
                toast: true,
                showConfirmButton: false,
                timer: 3000,
            });
            closeAssignApprovers();
            await fetchConfigs();
        }
    } catch (error: any) {
        console.error(`Assign approvers error:`, error);
        
        let errorText = error.response?.data?.message || `Failed to assign approvers for ${capitalize(selectedType.value.replace('-', ' '))}.`;
        
        // Handle specific ROLE validation error
        if (error.response?.status === 422 && error.response?.data?.invalid_users) {
            const invalidUsersList = error.response.data.invalid_users.map((user: any) => {
                // Display a helpful message based on the backend check
                const roleDisplay = user.role === 'error:object' 
                    ? `[Error: Role not set correctly in DB/Model]` 
                    : `(Current Role: ${user.role})`;
                return `${user.name} ${roleDisplay}`;
            }).join('; ');
            
            const allowedRoles = error.response.data.allowed_roles.join(', ');
            errorText = `Role validation failed. Invalid users: ${invalidUsersList}. Allowed roles: ${allowedRoles}.`;
        } 
        
        // Handle general Laravel Validation errors
        else if (error.response?.status === 422 && error.response?.data?.errors) {
            const validationErrors = Object.values(error.response.data.errors).flat().join('; ');
            errorText = `Input validation failed: ${validationErrors}`;
        }


        Swal.fire({
            title: 'Error! (Status 422)',
            text: errorText,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 5000,
        });
    } finally {
        loadingAction.value = false;
    }
};

// Confirm delete
const confirmDelete = async (rowData: Item) => {
    if (!isAdmin.value) {
        Swal.fire({
            title: 'Error!',
            text: 'You do not have permission to delete approvers.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
        });
        return;
    }
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: `You are about to remove all approvers for "${capitalize(rowData.type.replace('-', ' '))}". This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
    });
    if (result.isConfirmed) {
        await deleteApprovers(rowData.type);
    }
};

// Delete approvers
const deleteApprovers = async (type: string) => {
    if (!isAdmin.value) {
        Swal.fire({
            title: 'Error!',
            text: 'You do not have permission to delete approvers.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
        });
        return;
    }
    loadingAction.value = true;
    try {
        const endpoint = getEndpoint(type);
        const response = await makeRequest({
            url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/${endpoint}/assign-approvers`,
            method: 'post',
            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
            data: { user_ids: [] },
        });
        if (response.status === 200) {
            Swal.fire({
                title: 'Success!',
                text: `Approvers removed successfully for ${capitalize(type.replace('-', ' '))}.`,
                icon: 'success',
                position: 'top-end',
                toast: true,
                showConfirmButton: false,
                timer: 3000,
            });
            await fetchConfigs();
        }
    } catch (error: any) {
        console.error(`Delete approvers error:`, error);
        Swal.fire({
            title: 'Error!',
            text: error.response?.data?.message || `Failed to remove approvers for ${capitalize(type.replace('-', ' '))}.`,
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
        });
    } finally {
        loadingAction.value = false;
    }
};

// Open view modal
const openView = (rowData: Item) => {
    selectedConfig.value = rowData;
    showView.value = true;
};

// Close view modal
const closeView = () => {
    selectedConfig.value = null;
    showView.value = false;
};

// Mount lifecycle
onMounted(() => {
    if (!isAdmin.value) {
        errorMessage.value = 'You do not have permission to access this page.';
        Swal.fire({
            title: 'Error!',
            text: 'You do not have permission to access this page.',
            icon: 'error',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 3000,
        });
        return;
    }
    retryFetch();
});
</script>

<style lang="scss" scoped>
.loading-spinner {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
}

.space-x-2 > * + * {
    margin-left: 0.5rem;
}

.ml-2 {
    margin-left: 0.5rem;
}

.mt-4 {
    margin-top: 1rem;
}

.mb-4 {
    margin-bottom: 1rem;
}

.p-4 {
    padding: 1rem;
}

:deep(.va-data-table__table-th),
:deep(.va-data-table__table-td) {
    font-size: 0.875rem;
    padding: 0.875rem 0.75rem;
    vertical-align: middle;
}

:deep(.va-data-table__table-tr:hover) {
    background-color: #f8fafc;
}
</style>