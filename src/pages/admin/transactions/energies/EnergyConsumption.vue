<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <VaInput
          v-model="searchQuery"
          placeholder="Search by property or status"
          class="w-64"
          @input="debouncedSearch"
        />
      </div>
      <div class="flex space-x-2">
        <VaButton v-if="showForm" icon="close" color="success" size="small" class="px-4" @click="cancelForm">
          Done
        </VaButton>
        <VaButton
          v-if="!showForm"
          icon="add"
          color="#00A3E0"
          size="small"
          class="px-4"
          @click="openForm('add')"
        >
          Add Energy Consumption
        </VaButton>
      </div>
    </div>
    <template v-if="!showForm">
      <VaDataTable
        :key="componentKey"
        :items="energyConsumptions"
        striped
        :columns="columns"
        :loading="loadingEnergyConsumptions"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        @update:current-page="changePage"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(electricity_usage)="{ rowData }">
          {{ rowData.electricity_usage !== null ? rowData.electricity_usage : 'N/A' }} kWh
        </template>
        <template #cell(gas_usage)="{ rowData }">
          {{ rowData.gas_usage !== null ? rowData.gas_usage : 'N/A' }} m<sup>3</sup>
        </template>
        <template #cell(water_usage)="{ rowData }">
          {{ rowData.water_usage !== null ? rowData.water_usage : 'N/A' }} m<sup>3</sup>
        </template>
        <template #cell(total_cost)="{ rowData }">
          {{ rowData.total_cost !== null ? rowData.total_cost : 'N/A' }}
        </template>
        <template #cell(actions)="{ rowData }">
          <VaButton size="small" color="primary" icon="visibility" @click="openView(rowData)" />
          <VaButton size="small" color="warning" icon="edit" class="ml-2" @click="openForm('edit', rowData)" />
          <VaButton size="small" color="danger" icon="delete" class="ml-2" @click="confirmDelete(rowData)" />
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} records
        </div>
        <div class="flex space-x-2">
          <VaButton
            size="small"
            :disabled="pagination.current_page === 1"
            @click="changePage(pagination.current_page - 1)"
          >
            Previous
          </VaButton>
          <VaButton
            size="small"
            :disabled="pagination.current_page === pagination.last_page"
            @click="changePage(pagination.current_page + 1)"
          >
            Next
          </VaButton>
        </div>
      </div>
    </template>
    <template v-else>
      <EnergyConsumptionForm
        :energy-consumption="formMode === 'edit' ? selectedEnergyConsumption : null"
        :mode="formMode"
        @close="closeForm"
        @submit="debouncedHandleSubmit"
      />
    </template>
    <VaModal v-model="showView" size="medium" layout="centered" close-button hide-default-actions class="p-4">
      <div class="text-lg font-bold mb-4">{{ $t('Energy Consumption Details', 'Energy Consumption Details') }}</div>
      <div v-if="selectedEnergyConsumption" class="space-y-2">
        <p><strong>Property:</strong> {{ selectedEnergyConsumption.property_title || 'N/A' }}</p>
        <p><strong>Consumption Date:</strong> {{ selectedEnergyConsumption.consumption_date || 'N/A' }}</p>
        <p><strong>Electricity Usage:</strong> {{ selectedEnergyConsumption.electricity_usage !== null ? selectedEnergyConsumption.electricity_usage + ' kWh' : 'N/A' }}</p>
        <p><strong>Gas Usage:</strong> {{ selectedEnergyConsumption.gas_usage !== null ? selectedEnergyConsumption.gas_usage + ' m<sup>3</sup>' : 'N/A' }}</p>
        <p><strong>Water Usage:</strong> {{ selectedEnergyConsumption.water_usage !== null ? selectedEnergyConsumption.water_usage + ' m<sup>3</sup>' : 'N/A' }}</p>
        <p><strong>Total Cost:</strong> {{ selectedEnergyConsumption.total_cost !== null ? selectedEnergyConsumption.total_cost : 'N/A' }}</p>
        <p><strong>Status:</strong> {{ selectedEnergyConsumption.status || 'N/A' }}</p>
        <p><strong>Due Date:</strong> {{ selectedEnergyConsumption.due_date || 'N/A' }}</p>
        <p><strong>Created:</strong> {{ selectedEnergyConsumption.created_at || 'N/A' }}</p>
        <p><strong>Updated:</strong> {{ selectedEnergyConsumption.updated_at || 'N/A' }}</p>
      </div>
      <div class="flex justify-end mt-4">
        <VaButton color="secondary" @click="showView = false">Close</VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapActions, mapState } from 'pinia';
import { useEnergyConsumptionStore, EnergyConsumption, Payload } from '../../../../stores/energyConsumptionStore';
import EnergyConsumptionForm from './EnergyConsumptionForm.vue';
import Swal from 'sweetalert2';
import { debounce } from 'lodash';
import type { AxiosResponse } from 'axios';

interface EnergyConsumptionResponseData {
  message?: string;
  errors?: Record<string, string[]>;
  data?: any;
  pagination?: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export default defineComponent({
  name: 'EnergyConsumption',
  components: {
    EnergyConsumptionForm,
  },
  data() {
    return {
      columns: [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'property_title', sortable: true, label: 'Property' },
        { key: 'consumption_date', sortable: true, label: 'Consumption Date' },
        { key: 'electricity_usage', sortable: true, label: 'Electricity (kWh)' },
        { key: 'gas_usage', sortable: true, label: 'Gas (m³)' },
        { key: 'water_usage', sortable: true, label: 'Water (m³)' },
        { key: 'total_cost', sortable: true, label: 'Total Cost' },
        { key: 'status', sortable: true, label: 'Status' },
        { key: 'due_date', sortable: true, label: 'Due Date' },
        { key: 'created_at', sortable: true, label: 'Created' },
        { key: 'updated_at', sortable: true, label: 'Updated' },
        { key: 'actions', sortable: false, label: 'Actions' },
      ],
      showForm: false,
      showView: false,
      selectedEnergyConsumption: null as EnergyConsumption | null,
      formMode: 'add' as 'add' | 'edit',
      componentKey: 0,
      deleting: false,
      submitting: false,
      searchQuery: '' as string,
      debouncedHandleSubmit: null as unknown as (payload: Payload, mode: 'add' | 'edit') => void,
      debouncedSearch: null as unknown as () => void,
    };
  },
  computed: {
    ...mapState(useEnergyConsumptionStore, ['energyConsumptions', 'loadingEnergyConsumptions', 'pagination']),
  },
  created() {
    this.debouncedHandleSubmit = debounce(this.handleSubmit, 1000, { leading: true, trailing: false }) as (payload: Payload, mode: 'add' | 'edit') => void;
    this.debouncedSearch = debounce(this.handleSearch, 500) as () => void;
  },
  mounted() {
    console.log('EnergyConsumption mounted, fetching records');
    this.getEnergyConsumptions({ page: 1, per_page: 10 });
  },
  methods: {
    ...mapActions(useEnergyConsumptionStore, ['getEnergyConsumptions', 'addEnergyConsumption', 'updateEnergyConsumption', 'deleteEnergyConsumption']),
    showError(message: string, errors?: Record<string, string[]>) {
      let errorMessage = message;
      if (errors) {
        errorMessage += '\n' + Object.values(errors).flat().join('\n');
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
    },
    openForm(mode: 'add' | 'edit', energyConsumption?: EnergyConsumption) {
      console.log(`Opening form in ${mode} mode`, energyConsumption ? JSON.stringify(energyConsumption, null, 2) : '');
      this.formMode = mode;
      this.selectedEnergyConsumption = mode === 'edit' && energyConsumption ? energyConsumption : null;
      this.showForm = true;
    },
    openView(energyConsumption: EnergyConsumption) {
      console.log('Opening view modal for record:', JSON.stringify(energyConsumption, null, 2));
      this.selectedEnergyConsumption = energyConsumption;
      this.showView = true;
    },
    async confirmDelete(energyConsumption: EnergyConsumption) {
      console.log('Confirming delete for record:', JSON.stringify(energyConsumption, null, 2));
      this.selectedEnergyConsumption = energyConsumption;
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete the energy consumption record for "${energyConsumption.property_title || 'N/A'}". This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        position: 'center',
        toast: false,
        showConfirmButton: true,
      });
      if (result.isConfirmed) {
        await this.handleDelete();
      }
    },
    async handleDelete() {
      if (!this.selectedEnergyConsumption?.id) {
        console.error('No selected energy consumption record to delete');
        this.showError('No energy consumption record selected.');
        return;
      }
      this.deleting = true;
      try {
        const response: AxiosResponse<EnergyConsumptionResponseData> = await this.deleteEnergyConsumption(this.selectedEnergyConsumption.id);
        console.log('Delete response:', response);
        if (response.status === 200 || response.status === 204) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Energy consumption record deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          this.selectedEnergyConsumption = null;
          this.componentKey += 1;
          await this.getEnergyConsumptions({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
        } else {
          console.warn('Delete failed with status:', response.status, response.data);
          this.showError(response.data?.message || 'Failed to delete energy consumption record.', response.data?.errors);
        }
      } catch (err: any) {
        console.error('Delete error:', err.response?.data || err);
        this.showError(err.response?.data?.message || 'Failed to delete energy consumption record.', err.response?.data?.errors);
      } finally {
        this.deleting = false;
      }
    },
    async handleSubmit(payload: Payload, mode: 'add' | 'edit') {
      if (this.submitting) return;
      this.submitting = true;
      try {
        let response: AxiosResponse<EnergyConsumptionResponseData>;
        if (mode === 'add') {
          response = await this.addEnergyConsumption(payload);
        } else if (mode === 'edit' && this.selectedEnergyConsumption?.id) {
          response = await this.updateEnergyConsumption(payload, this.selectedEnergyConsumption.id);
        } else {
          throw new Error('Invalid edit mode: No selected energy consumption record');
        }
        console.log(`${mode} response:`, response);
        if (response.status === 201 || response.status === 200) {
          Swal.fire({
            title: mode === 'add' ? 'Created!' : 'Updated!',
            text: `Energy consumption record has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
          await this.getEnergyConsumptions({
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            search: this.searchQuery,
          });
          this.componentKey += 1;
          this.closeForm();
        } else {
          this.showError(
            response.data?.message || (mode === 'add' ? 'Failed to add record.' : 'Failed to update record.'),
            response.data?.errors
          );
        }
      } catch (err: any) {
        console.error(`${mode} error:`, err.response?.data || err);
        this.showError(
          err.response?.data?.message || (mode === 'add' ? 'Failed to add record.' : 'Failed to update record.'),
          err.response?.data?.errors
        );
      } finally {
        this.submitting = false;
      }
    },
    async handleSearch() {
      console.log('Searching with query:', this.searchQuery);
      await this.getEnergyConsumptions({ page: 1, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },
    async changePage(page: number) {
      console.log('Changing page to:', page);
      await this.getEnergyConsumptions({ page, per_page: this.pagination.per_page, search: this.searchQuery });
      this.componentKey += 1;
    },
    cancelForm() {
      this.closeForm();
      this.getEnergyConsumptions({
        page: this.pagination.current_page,
        per_page: this.pagination.per_page,
        search: this.searchQuery,
      });
    },
    closeForm() {
      console.log('Closing form, resetting selectedEnergyConsumption');
      this.showForm = false;
      this.showView = false;
      this.selectedEnergyConsumption = null;
      this.formMode = 'add';
    },
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
.flex {
  display: flex;
}
.justify-between {
  justify-content: space-between;
}
.items-center {
  align-items: center;
}
.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
}
.space-x-4 > :not(:last-child) {
  margin-right: 1rem;
}
.w-64 {
  width: 16rem;
}
</style>