import { ref } from 'vue'

interface FormData {
  title: string
  description: string | null
  category_id: number | null
  location_id: number | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  year_built: number | null
  status: string | null
  list_date: string
  team_id: number | null
  is_featured: boolean
}

export function usePropertyValidation(form: FormData) {
  const errors = ref({
    title: '',
    description: '',
    category_id: '',
    location_id: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    area_sqft: '',
    year_built: '',
    status: '',
    list_date: '',
    team_id: '',
    is_featured: '',
  })

  const isValidDate = (dateString: string): boolean => {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }

  const validate = () => {
    errors.value = {
      title: '',
      description: '',
      category_id: '',
      location_id: '',
      price: '',
      bedrooms: '',
      bathrooms: '',
      area_sqft: '',
      year_built: '',
      status: '',
      list_date: '',
      team_id: '',
      is_featured: '',
    }

    if (!form.title) errors.value.title = 'Title is required'
    if (!form.category_id) errors.value.category_id = 'Category is required'
    if (!form.location_id) errors.value.location_id = 'Location is required'
    if (form.price && form.price < 0) errors.value.price = 'Price cannot be negative'
    if (form.bedrooms && form.bedrooms < 0) errors.value.bedrooms = 'Bedrooms cannot be negative'
    if (form.bathrooms && form.bathrooms < 0) errors.value.bathrooms = 'Bathrooms cannot be negative'
    if (form.area_sqft && form.area_sqft < 0) errors.value.area_sqft = 'Area cannot be negative'
    if (form.year_built && (form.year_built < 1900 || form.year_built > new Date().getFullYear())) {
      errors.value.year_built = `Year built must be between 1900 and ${new Date().getFullYear()}`
    }
    if (form.list_date && !isValidDate(form.list_date)) {
      errors.value.list_date = 'Please enter a valid date'
    }
    if (form.status && !['available', 'sold', 'pending', 'rented'].includes(form.status)) {
      errors.value.status = 'Invalid status selected'
    }

    return !Object.values(errors.value).some((error) => error)
  }

  return { errors, validate }
}
