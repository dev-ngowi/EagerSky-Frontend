<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <h1 class="text-2xl font-bold mb-4">{{ $t('Templates') }}</h1>
    <div class="flex justify-between items-center mb-4">
      <VaInput
        v-model="searchQuery"
        placeholder="Search templates..."
        class="w-64"
        @input="debouncedSearch"
      />
    </div>

    <template v-if="!showForm">
      <VaDataTable
        :items="templates"
        :columns="columns"
        :loading="loadingTemplates"
        :per-page="pagination.per_page"
        :current-page="pagination.current_page"
        :hoverable="true"
        :clickable="true"
        @row-click="openForm($event.rowData)"
        @update:currentPage="changePage"
      >
        <template #cell(sn)="{ rowIndex }">
          {{ (pagination.current_page - 1) * pagination.per_page + rowIndex + 1 }}
        </template>
        <template #cell(actions)="{ row }">
          <div class="flex space-x-2">
            <VaButton
              preset="primary"
              icon="picture_as_pdf"
              :color="generating[row.rowData.id] ? 'gray' : 'primary'"
              :title="generating[row.rowData.id] ? 'Generating...' : 'Generate Blank PDF'"
              :disabled="generating[row.rowData.id]"
              @click.stop="generateBlankPdf(row.rowData)"
            >
              <VaProgressCircle v-if="generating[row.rowData.id]" size="small" color="white" />
              <span v-else>Generate</span>
            </VaButton>
          </div>
        </template>
      </VaDataTable>
      <div class="flex justify-between items-center mt-4">
        <div>
          Showing {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
          {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} of
          {{ pagination.total }} templates
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
      <div class="bg-white shadow-md rounded-lg p-6">
        <h2 class="text-lg font-bold mb-4">Fill {{ selectedTemplate?.name || 'Template' }}</h2>
        <div class="space-y-6">
          <div v-if="selectedTemplate?.name === 'Property Master'">
            <h3 class="text-md font-medium mb-2">Property Master Form</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="col-span-1">
                <h4 class="text-sm font-semibold mb-2 text-gray-600">Property Information</h4>
                <div class="space-y-2">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Title</label>
                    <VaInput
                      v-model="formData.title"
                      placeholder="Enter property title"
                      class="mt-1 w-full"
                      :error="!!formErrors.title"
                      :error-messages="formErrors.title ? [formErrors.title] : []"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Description</label>
                    <VaTextarea
                      v-model="formData.description"
                      placeholder="Enter property description"
                      class="mt-1 w-full"
                      rows="3"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Features (JSON)</label>
                    <VaInput
                      v-model="formData.features"
                      placeholder='e.g., ["pool", "parking"]'
                      class="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Price</label>
                    <VaInput
                      v-model.number="formData.price"
                      type="number"
                      placeholder="Enter price"
                      class="mt-1 w-full"
                      :error="!!formErrors.price"
                      :error-messages="formErrors.price ? [formErrors.price] : []"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Bedrooms</label>
                    <VaInput
                      v-model.number="formData.bedrooms"
                      type="number"
                      placeholder="Enter number of bedrooms"
                      class="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Bathrooms</label>
                    <VaInput
                      v-model.number="formData.bathrooms"
                      type="number"
                      placeholder="Enter number of bathrooms"
                      class="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Area (sq.ft)</label>
                    <VaInput
                      v-model.number="formData.area_sqft"
                      type="number"
                      placeholder="Enter area in square feet"
                      class="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Year Built</label>
                    <VaInput
                      v-model.number="formData.year_built"
                      type="number"
                      placeholder="Enter year built"
                      class="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Status</label>
                    <VaSelect
                      v-model="formData.status"
                      :options="['available', 'sold', 'pending', 'rented', 'for_rent']"
                      placeholder="Select status"
                      class="mt-1 w-full"
                    />
                  </div>
                </div>
              </div>

              <div class="col-span-1">
                <h4 class="text-sm font-semibold mb-2 text-gray-600">Location</h4>
                <div class="space-y-2">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Category</label>
                    <VaSelect
                      v-model="formData.category_id"
                      :options="categories"
                      value-by="id"
                      text-by="name"
                      placeholder="Select category"
                      class="mt-1 w-full"
                      :error="!!formErrors.category_id"
                      :error-messages="formErrors.category_id ? [formErrors.category_id] : []"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Location</label>
                    <VaSelect
                      v-model="formData.location_id"
                      :options="locations"
                      value-by="id"
                      text-by="name"
                      placeholder="Select location"
                      class="mt-1 w-full"
                      :error="!!formErrors.location_id"
                      :error-messages="formErrors.location_id ? [formErrors.location_id] : []"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">List Date</label>
                    <VaInput
                      v-model="formData.list_date"
                      type="date"
                      placeholder="Enter list date"
                      class="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Sold Date</label>
                    <VaInput
                      v-model="formData.sold_date"
                      type="date"
                      placeholder="Enter sold date"
                      class="mt-1 w-full"
                    />
                  </div>
                </div>
              </div>

              <div class="col-span-1 md:col-span-2">
                <h4 class="text-sm font-semibold mb-2 text-gray-600">Energy and Smart Features</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Energy Rating</label>
                    <VaInput
                      v-model="formData.energy_rating"
                      placeholder="Enter energy rating"
                      class="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Energy Score</label>
                    <VaInput
                      v-model.number="formData.energy_score"
                      type="number"
                      placeholder="Enter energy score"
                      class="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Energy Rating Date</label>
                    <VaInput
                      v-model="formData.energy_rating_date"
                      type="date"
                      placeholder="Enter energy rating date"
                      class="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Smart Home Features (JSON)</label>
                    <VaInput
                      v-model="formData.smart_home_features"
                      placeholder='e.g., ["smart_lights", "thermostat"]'
                      class="mt-1 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="selectedTemplate?.name === 'Rental Application Form'">
            <h3 class="text-md font-medium mb-2">Rental Application Form</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">User</label>
                <VaSelect
                  v-model="formData.user_id"
                  :options="users"
                  value-by="id"
                  text-by="name"
                  placeholder="Select user"
                  class="mt-1 w-full"
                  :error="!!formErrors.user_id"
                  :error-messages="formErrors.user_id ? [formErrors.user_id] : []"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Property</label>
                <VaSelect
                  v-model="formData.property_id"
                  :options="properties"
                  value-by="id"
                  text-by="title"
                  placeholder="Select property"
                  class="mt-1 w-full"
                  :error="!!formErrors.property_id"
                  :error-messages="formErrors.property_id ? [formErrors.property_id] : []"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Employment Status</label>
                <VaInput
                  v-model="formData.employment_status"
                  placeholder="Enter employment status"
                  class="mt-1 w-full"
                  :error="!!formErrors.employment_status"
                  :error-messages="formErrors.employment_status ? [formErrors.employment_status] : []"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Annual Income</label>
                <VaInput
                  v-model.number="formData.annual_income"
                  type="number"
                  placeholder="Enter annual income"
                  class="mt-1 w-full"
                  :error="!!formErrors.annual_income"
                  :error-messages="formErrors.annual_income ? [formErrors.annual_income] : []"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">NIDA Number</label>
                <VaInput
                  v-model="formData.nida_number"
                  placeholder="Enter NIDA number"
                  class="mt-1 w-full"
                />
              </div>
            </div>
          </div>
          <div v-else>
            <p class="text-sm text-gray-700">Please select a template to fill out the form.</p>
            <VaSelect
              v-model="selectedTemplate"
              :options="templates"
              value-by="id"
              text-by="name"
              placeholder="Select a template"
              class="mt-1 w-full"
            />
          </div>
          <div class="flex justify-end space-x-2 mt-4">
            <VaButton color="secondary" @click="closeForm">Cancel</VaButton>
            <VaButton
              v-if="selectedTemplate"
              color="primary"
              :disabled="submitting"
              @click="handleSubmit"
            >
              <VaProgressCircle v-if="submitting" size="small" />
              <span v-else>Submit Form</span>
            </VaButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed } from 'vue';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';
import { VaDataTable, VaInput, VaTextarea, VaSelect, VaButton, VaProgressCircle } from 'vuestic-ui';
import makeRequest from '../../../../services/makeRequest';

interface Template {
  id: string;
  name: string;
  content: string;
}

interface TemplateFormData {
  title?: string;
  description?: string;
  features?: string;
  category_id?: number;
  location_id?: number;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  year_built?: number;
  status?: string;
  list_date?: string;
  sold_date?: string;
  energy_rating?: string;
  energy_score?: number;
  energy_rating_date?: string;
  smart_home_features?: string;
  user_id?: number;
  property_id?: number;
  employment_status?: string;
  annual_income?: number;
  nida_number?: string;
}

interface Errors {
  title?: string;
  category_id?: string;
  location_id?: string;
  price?: string;
  user_id?: string;
  property_id?: string;
  employment_status?: string;
  annual_income?: string;
}

export default defineComponent({
  name: 'TemplateList',
  components: {
    VaDataTable,
    VaInput,
    VaTextarea,
    VaSelect,
    VaButton,
    VaProgressCircle,
  },
  setup() {
    const templates = ref<Template[]>([]);
    const loadingTemplates = ref<boolean>(false);
    const pagination = reactive({
      total: 0,
      per_page: 10,
      current_page: 1,
      last_page: 1,
    });
    const searchQuery = ref<string>('');
    const showForm = ref<boolean>(false);
    const selectedTemplate = ref<Template | null>(null);
    const submitting = ref<boolean>(false);
    const generating = ref<Record<string, boolean>>({});

    const formData = reactive<TemplateFormData>({});
    const formErrors = reactive<Errors>({});

    const categories = ref<{ id: number; name: string }[]>([]);
    const locations = ref<{ id: number; name: string }[]>([]);
    const users = ref<{ id: number; name: string }[]>([]);
    const properties = ref<{ id: number; title: string }[]>([]);

    const debouncedSearch = debounce((value: string) => {
      searchQuery.value = value;
      getTemplates({ page: 1, per_page: pagination.per_page, search: value });
    }, 500);

    const resetForm = () => {
      Object.assign(formData, {});
      Object.keys(formErrors).forEach((key) => (formErrors[key as keyof Errors] = ''));
    };

    async function fetchCategories() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
          method: 'get',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        });
        categories.value = response.data.data.map((cat: any) => ({ id: cat.id, name: cat.name }));
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    }

    async function fetchLocations() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations`,
          method: 'get',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        });
        locations.value = response.data.data.map((loc: any) => ({ id: loc.id, name: loc.name }));
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      }
    }

    async function fetchUsers() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/users`,
          method: 'get',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        });
        users.value = response.data.data.map((user: any) => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
        }));
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    }

    async function fetchProperties() {
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/properties`,
          method: 'get',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        });
        properties.value = response.data.data.map((prop: any) => ({ id: prop.id, title: prop.title }));
      } catch (error) {
        console.error('Failed to fetch properties:', error);
      }
    }

    async function getTemplates(params: { page?: number; per_page?: number; search?: string } = {}) {
      loadingTemplates.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-templates`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
          params: {
            page: params.page || pagination.current_page,
            per_page: params.per_page || pagination.per_page,
            search: params.search || searchQuery.value,
          },
        });
        if (response.status === 200) {
          templates.value = response.data.data.map((template: any) => ({
            id: template.id,
            name: template.name || 'N/A',
            content: template.content || 'N/A',
          }));
          pagination.total = response.data.pagination?.total || response.data.data.length;
          pagination.per_page = response.data.pagination?.per_page || params.per_page || 10;
          pagination.current_page = response.data.pagination?.current_page || params.page || 1;
          pagination.last_page = response.data.pagination?.last_page || 1;
          searchQuery.value = params.search || searchQuery.value;
          if (response.data.data.length === 0) {
            Swal.fire({
              title: 'Info',
              text: 'No templates found.',
              icon: 'info',
              position: 'top-end',
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          }
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to fetch templates.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        loadingTemplates.value = false;
      }
    }

    async function generateBlankPdf(template: Template) {
      if (!template?.id) {
        Swal.fire({
          title: 'Error!',
          text: 'Invalid template selected.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      generating.value[template.id] = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-templates/${template.id}/pdf`,
          method: 'get',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 200) {
          const pdfWindow = window.open(response.data.data.url, '_blank');
          if (pdfWindow) {
            pdfWindow.onload = () => {
              pdfWindow.print();
              pdfWindow.close();
            };
          }
          Swal.fire({
            title: 'Success!',
            text: 'Blank PDF generated and printed successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 1500,
          });
        }
      } catch (error: any) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to generate blank PDF. Please try again.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        generating.value[template.id] = false;
      }
    }

    const openForm = (template: Template | null) => {
      resetForm();
      selectedTemplate.value = template;
      fetchCategories();
      fetchLocations();
      fetchUsers();
      fetchProperties();
      showForm.value = true;
    };

    const closeForm = () => {
      showForm.value = false;
      selectedTemplate.value = null;
      resetForm();
      getTemplates({
        page: pagination.current_page,
        per_page: pagination.per_page,
        search: searchQuery.value,
      });
    };

    const handleSubmit = async () => {
      Object.keys(formErrors).forEach((key) => (formErrors[key as keyof Errors] = ''));

      if (!selectedTemplate.value) {
        Swal.fire({
          title: 'Error!',
          text: 'Please select a template.',
          icon: 'error',
          position: 'top-end',
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      if (selectedTemplate.value?.name === 'Property Master') {
        if (!formData.title) formErrors.title = 'Title is required';
        if (!formData.category_id) formErrors.category_id = 'Category is required';
        if (!formData.location_id) formErrors.location_id = 'Location is required';
        if (!formData.price) formErrors.price = 'Price is required';
      } else if (selectedTemplate.value?.name === 'Rental Application Form') {
        if (!formData.user_id) formErrors.user_id = 'User is required';
        if (!formData.property_id) formErrors.property_id = 'Property is required';
        if (!formData.employment_status) formErrors.employment_status = 'Employment status is required';
        if (!formData.annual_income) formErrors.annual_income = 'Annual income is required';
      }

      if (Object.values(formErrors).some((error) => error)) return;

      submitting.value = true;
      try {
        const response = await makeRequest({
          url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/document-templates/${selectedTemplate.value!.id}/form-data`,
          method: 'post',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: { data: formData },
        });
        if ([200, 201].includes(response.status)) {
          Swal.fire({
            title: 'Success!',
            text: 'Form data submitted and PDF generated successfully.',
            icon: 'success',
            position: 'top-end',
            toast: true,
            showConfirmButton: false,
            timer: 1500,
          });
          const pdfWindow = window.open(response.data.data.url, '_blank');
          if (pdfWindow) {
            pdfWindow.onload = () => {
              pdfWindow.print();
              pdfWindow.close();
            };
          }
          showForm.value = false;
          resetForm();
          selectedTemplate.value = null;
        }
      } catch (error: any) {
        console.error('Form submission error:', error.response?.data);
        let errorMessage = error.response?.data?.message || 'Failed to submit form data.';
        if (error.response?.status === 422 && error.response?.data?.errors) {
          const errs = Object.fromEntries(
            Object.entries(error.response.data.errors).map(([key, value]) => [
              key.replace('data.', ''),
              Array.isArray(value) ? value[0] : value,
            ]),
          );
          errorMessage = Object.values(errs).filter(Boolean).join('; ');
          Object.assign(formErrors, errs);
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
        submitting.value = false;
      }
    };

    const changePage = async (page: number) => {
      await getTemplates({
        page,
        per_page: pagination.per_page,
        search: searchQuery.value,
      });
    };

    getTemplates({ page: 1, per_page: 10 });

    return {
      templates,
      loadingTemplates,
      pagination,
      searchQuery,
      showForm,
      selectedTemplate,
      submitting,
      generating,
      formData,
      formErrors,
      categories,
      locations,
      users,
      properties,
      debouncedSearch,
      getTemplates,
      generateBlankPdf,
      columns: computed(() => [
        { key: 'sn', sortable: false, label: 'SN' },
        { key: 'name', sortable: true, label: 'Name' },
        { key: 'actions', sortable: false, label: 'Actions' },
      ]),
      openForm,
      closeForm,
      handleSubmit,
      resetForm,
      // FIX: Expose 'changePage' to the template
      changePage,
    };
  },
});
</script>

<style scoped>
/* Tailwind CSS is used, so custom CSS is minimized */
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