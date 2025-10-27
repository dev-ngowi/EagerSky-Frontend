<template>
  <section id="all-listings" class="section all-listings">
    <div class="container" data-aos="fade-up">
      <!-- Section Title -->
      <div class="section-title text-center">
        <div class="title-wrapper">
          <span class="subtitle-badge">🏠 ALL</span>
          <h2 class="main-title">All Properties</h2>
          <div class="title-underline"></div>
          <p class="section-description">Explore our complete collection of properties in prime locations.</p>
        </div>
      </div>

      <!-- Filter Section -->
      <div class="filter-section" data-aos="fade-up" data-aos-delay="100">
        <div class="filter-grid">
          <!-- Price Range -->
          <div class="filter-item">
            <label for="min-price" class="filter-label">Min Price (TZS)</label>
            <input
              id="min-price"
              type="number"
              v-model.number="filters.minPrice"
              placeholder="Min Price"
              class="filter-input"
              aria-label="Minimum price in TZS"
              min="0"
            />
          </div>
          <div class="filter-item">
            <label for="max-price" class="filter-label">Max Price (TZS)</label>
            <input
              id="max-price"
              type="number"
              v-model.number="filters.maxPrice"
              placeholder="Max Price"
              class="filter-input"
              aria-label="Maximum price in TZS"
              min="0"
            />
          </div>
          <!-- Bedrooms -->
          <div class="filter-item">
            <label for="bedrooms" class="filter-label">Bedrooms</label>
            <select
              id="bedrooms"
              v-model="filters.bedrooms"
              class="filter-select"
              aria-label="Number of bedrooms"
            >
              <option value="">Any</option>
              <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <!-- Bathrooms -->
          <div class="filter-item">
            <label for="bathrooms" class="filter-label">Bathrooms</label>
            <select
              id="bathrooms"
              v-model="filters.bathrooms"
              class="filter-select"
              aria-label="Number of bathrooms"
            >
              <option value="">Any</option>
              <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <!-- Location -->
          <div class="filter-item">
            <label for="location" class="filter-label">Location</label>
            <select
              id="location"
              v-model="filters.location"
              class="filter-select"
              aria-label="Filter by location"
            >
              <option value="">All Locations</option>
              <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
            </select>
          </div>
          <!-- Category -->
          <div class="filter-item">
            <label for="category" class="filter-label">Category</label>
            <select
              id="category"
              v-model="filters.category"
              class="filter-select"
              aria-label="Property category"
            >
              <option value="">All Categories</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <!-- Status -->
          <div class="filter-item">
            <label for="status" class="filter-label">Status</label>
            <select
              id="status"
              v-model="filters.status"
              class="filter-select"
              aria-label="Property status"
            >
              <option value="">All Statuses</option>
              <option value="for_rent">For Rent</option>
              <option value="for_sale">For Sale</option>
            </select>
          </div>
          <!-- Clear Filters Button -->
          <div class="filter-item filter-button">
            <button
              class="cta-button"
              @click="clearFilters"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading text-center">
        <div class="spinner"></div>
        <p>Loading properties...</p>
      </div>

      <!-- Property Grid or No Data Message -->
      <div v-else-if="displayedProperties.length > 0" class="property-grid">
        <div 
          class="property-card-wrapper"
          v-for="(property, index) in displayedProperties" 
          :key="property.id"
          :data-aos="'fade-up'" 
          :data-aos-delay="100 * (index + 1)"
        >
          <div 
            class="property-card" 
            @click="goToPropertyDetails(property.id)"
            @mouseenter="handleCardHover" 
            @mouseleave="handleCardLeave"
            role="button"
            tabindex="0"
            @keydown.enter="goToPropertyDetails(property.id)"
            @keydown.space.prevent="goToPropertyDetails(property.id)"
            :aria-label="`View details for ${property.title}`"
          >
            <!-- Background Pattern -->
            <div class="card-background">
              <div class="pattern-dots"></div>
              <div class="gradient-overlay"></div>
            </div>

            <!-- Image Container -->
            <div class="image-container">
              <picture>
                <source :srcset="property.image + '?w=800'" media="(min-width: 768px)" />
                <source :srcset="property.image + '?w=400'" media="(min-width: 480px)" />
                <img 
                  :src="property.image" 
                  :alt="property.alt || `Image of ${property.title}`" 
                  class="property-image" 
                  loading="lazy"
                  role="img"
                  @error="handleImageError($event, property.image)"
                >
              </picture>
              <div class="property-badge" aria-hidden="true">{{ property.badge }}</div>
              <div 
                class="price-tag" 
                :aria-label="`Price: ${property.currency} ${property.price.toLocaleString('en-TZ')}`"
              >
                {{ property.currency }} {{ property.price.toLocaleString('en-TZ') }}
              </div>
            </div>

            <!-- Card Content -->
            <div class="card-content">
              <div class="property-header">
                <h3 class="property-title">{{ property.title }}</h3>
                <div class="property-rating" role="img" :aria-label="`Rating: ${property.rating} out of 5 stars`">
                  <span v-for="star in 5" :key="star" class="star" :class="{ filled: star <= property.rating }">
                    ⭐
                  </span>
                </div>
              </div>
              
              <p class="property-location">
                <i class="bi bi-geo-alt" aria-hidden="true"></i>
                {{ property.location }}
              </p>
              
              <div class="property-features">
                <div class="feature">
                  <i class="bi bi-house" aria-hidden="true"></i>
                  <span>{{ property.bedrooms }} Beds</span>
                </div>
                <div class="feature">
                  <i class="bi bi-droplet" aria-hidden="true"></i>
                  <span>{{ property.bathrooms }} Baths</span>
                </div>
                <div class="feature">
                  <i class="bi bi-arrows-fullscreen" aria-hidden="true"></i>
                  <span>{{ property.area }} {{ property.areaUnit }}</span>
                </div>
                <div class="feature">
                  <i class="bi bi-door-open" aria-hidden="true"></i>
                  <span>{{ property.available_rooms }} Available</span>
                </div>
              </div>

              <div class="property-actions">
                <a 
                  :href="property.map_url" 
                  class="map-link" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  :aria-label="`View ${property.title} on map`"
                >
                  View on Map
                  <i class="bi bi-geo-alt-fill" aria-hidden="true"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="!showError" class="no-data text-center">
        <h3>No Properties Available</h3>
        <p>{{ hasFilters ? 'No properties match your current filters. Try adjusting your search criteria.' : 'Check back later for new listings!' }}</p>
      </div>

      <!-- Error Message -->
      <div v-if="showError" class="error-message text-center">
        <div class="error-content">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <h3>Oops! Something went wrong</h3>
          <p>Unable to load properties. Please try again later.</p>
          <button 
            class="cta-button" 
            @click="retryLoad" 
            aria-label="Retry loading properties"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- Load More Button -->
      <div class="view-more text-center" v-if="!showAll && properties.length > initialDisplayCount">
        <button 
          class="cta-button" 
          @click="toggleShowAll" 
          aria-label="View all properties"
        >
          <span>View {{ showAll ? 'Fewer' : 'All' }} Properties</span>
          <i class="bi" :class="showAll ? 'bi-arrow-up' : 'bi-arrow-right'" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import makeRequest from '../../services/makeRequest';
import AOS from 'aos';

// Define interfaces
interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  image: string;
  alt: string;
  badge: string;
  rating: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  areaUnit: string;
  category: string;
  energy_rating: string;
  total_rooms: number;
  available_rooms: number;
  booked_rooms: number;
  map_url: string;
  status: string;
}

interface Filters {
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | string;
  bathrooms: number | string;
  location: number | string;
  category: number | string;
  status: string;
  search?: string; // Added to support grokSearch from hero
}

interface Location {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

const router = useRouter();
const route = useRoute(); // Add useRoute to access query parameters
const initialDisplayCount = 6;
const showAll = ref(false);
const showError = ref(false);
const isLoading = ref(false);
const failedImages = ref<Set<string>>(new Set());
const properties = ref<Property[]>([]);
const locations = ref<Location[]>([]);
const categories = ref<Category[]>([]);

const filters = ref<Filters>({
  minPrice: null,
  maxPrice: null,
  bedrooms: '',
  bathrooms: '',
  location: '',
  category: '',
  status: '',
  search: '' // Added to support grokSearch
});

const hasFilters = computed(() => {
  return filters.value.minPrice !== null ||
         filters.value.maxPrice !== null ||
         filters.value.bedrooms !== '' ||
         filters.value.bathrooms !== '' ||
         filters.value.location !== '' ||
         filters.value.category !== '' ||
         filters.value.status !== '' ||
         filters.value.search !== ''; // Include search in hasFilters
});

const fetchLocations = async () => {
  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations`,
      requiresAuth: false
    });

    console.log('Locations response:', response);
    if (response.data && Array.isArray(response.data.data)) {
      locations.value = response.data.data.map((loc: any) => ({
        id: loc.id,
        name: loc.name || 'Unknown Location'
      }));
      console.log('Mapped locations:', locations.value);
    } else {
      console.warn('Unexpected locations response structure:', response);
    }
  } catch (error) {
    console.error('Failed to fetch locations:', error);
  }
};

const fetchCategories = async () => {
  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
      requiresAuth: false
    });

    console.log('Categories response:', response);
    if (response.data && Array.isArray(response.data.data)) {
      categories.value = response.data.data.map((cat: any) => ({
        id: cat.id,
        name: cat.name || 'Unknown Category'
      }));
      console.log('Mapped categories:', categories.value);
    } else {
      console.warn('Unexpected categories response structure:', response);
    }
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }
};

const fetchProperties = async () => {
  isLoading.value = true;
  showError.value = false;

  try {
    const queryParams = new URLSearchParams();
    if (filters.value.minPrice) queryParams.append('min_price', filters.value.minPrice.toString());
    if (filters.value.maxPrice) queryParams.append('max_price', filters.value.maxPrice.toString());
    if (filters.value.bedrooms) queryParams.append('bedrooms', filters.value.bedrooms.toString());
    if (filters.value.bathrooms) queryParams.append('bathrooms', filters.value.bathrooms.toString());
    if (filters.value.location) queryParams.append('location_id', filters.value.location.toString());
    if (filters.value.category) queryParams.append('category_id', filters.value.category.toString());
    if (filters.value.status) queryParams.append('status', filters.value.status);
    if (filters.value.search) queryParams.append('search', filters.value.search); // Add search parameter

    console.log('Fetching properties with params:', queryParams.toString());

    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_ALL_PROPERTIES_URL}?${queryParams.toString()}`,
      requiresAuth: false
    });

    console.log('Properties response:', response);

    if (response.data?.success && Array.isArray(response.data.data)) {
      properties.value = response.data.data.map((property: any) => {
        const cleanPrice = property.combined_price
          ? parseInt(property.combined_price.replace(/[^0-9]/g, '')) || 0
          : property.price || 0;
        const cleanArea = property.area
          ? parseInt(property.area.replace(/[^0-9]/g, '')) || 0
          : 0;

        return {
          id: property.id?.toString() || `property-${Math.random().toString(36).substr(2, 9)}`,
          title: property.title || 'Untitled Property',
          location: property.location || 'Unknown Location',
          price: cleanPrice,
          currency: property.combined_price?.includes('TZS') ? 'TZS' : 'USD',
          image: property.image || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
          alt: property.alt || `Image of ${property.title || 'Untitled Property'}`,
          badge: property.badge || 'New',
          rating: Math.min(Math.max(parseInt(property.rating) || 4, 1), 5),
          bedrooms: parseInt(property.bedrooms) || 0,
          bathrooms: parseInt(property.bathrooms) || 0,
          area: cleanArea,
          areaUnit: property.area?.includes('m²') ? 'm²' : 'sqft',
          category: property.category || 'Unknown',
          energy_rating: property.energy_rating || 'N/A',
          total_rooms: parseInt(property.total_rooms) || 0,
          available_rooms: parseInt(property.available_rooms) || 0,
          booked_rooms: parseInt(property.booked_rooms) || 0,
          map_url: property.map_url || 'https://maps.google.com',
          status: property.status || 'unknown'
        };
      });
      console.log('Mapped properties:', properties.value);
    } else {
      console.warn('Unexpected properties response structure:', response.data);
      showError.value = true;
    }
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    showError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const displayedProperties = computed((): Property[] => {
  return showAll.value ? properties.value : properties.value.slice(0, initialDisplayCount);
});

const clearFilters = () => {
  filters.value = {
    minPrice: null,
    maxPrice: null,
    bedrooms: '',
    bathrooms: '',
    location: '',
    category: '',
    status: '',
    search: ''
  };
  // Update the URL to remove query parameters
  router.replace({ name: 'all-properties', query: {} });
};

watch(filters, () => {
  // Update the URL with current filters
  const query: Record<string, string | number> = {};
  if (filters.value.minPrice) query.min_price = filters.value.minPrice;
  if (filters.value.maxPrice) query.max_price = filters.value.maxPrice;
  if (filters.value.bedrooms) query.bedrooms = filters.value.bedrooms;
  if (filters.value.bathrooms) query.bathrooms = filters.value.bathrooms;
  if (filters.value.location) query.location_id = filters.value.location;
  if (filters.value.category) query.category_id = filters.value.category;
  if (filters.value.status) query.status = filters.value.status;
  if (filters.value.search) query.search = filters.value.search;

  router.replace({ name: 'all-properties', query });
  fetchProperties();
}, { deep: true });

const handleCardHover = (event: Event) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = 'translateY(-10px) scale(1.02)';
};

const handleCardLeave = (event: Event) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = 'translateY(0) scale(1)';
};

const handleImageError = (event: Event, originalSrc: string) => {
  if (!failedImages.value.has(originalSrc)) {
    failedImages.value.add(originalSrc);
    console.warn(`Image failed to load: ${originalSrc}`);
  }
  const img = event.target as HTMLImageElement;
  if (img.src !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==') {
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==';
  }
};

const goToPropertyDetails = (propertyId: string) => {
  console.log('Navigating to property ID:', propertyId);
  router.push({ name: 'my-property-details', params: { id: propertyId } });
};

const toggleShowAll = () => {
  showAll.value = !showAll.value;
};

const retryLoad = () => {
  fetchProperties();
};

onMounted(async () => {
  // Initialize AOS
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      once: true,
      offset: 100
    });
  }

  // Read query parameters and update filters
  const query = route.query;
  if (query.search) filters.value.search = query.search.toString();
  if (query.category) filters.value.category = query.category.toString();
  if (query.location) filters.value.location = query.location.toString();

  // Fetch data
  await Promise.all([fetchLocations(), fetchCategories(), fetchProperties()]);
});
</script>

<style lang="scss" scoped>
/* Fallbacks for older browsers */
@supports not (display: grid) {
  .property-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }
  .property-card-wrapper {
    flex: 1 1 280px;
    max-width: 380px;
    margin: 10px;
  }
}

/* Color Variables */
$primary-color: #007bff;
$accent-color: #f4a261;
$dark-color: #2c3e50;
$white: #ffffff;
$secondary-color: #6c757d;
$light-color: #e9ecef;
$success-color: #fd0100;
$warning-color: #ffc107;

.container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 clamp(0.75rem, 2vw, 1rem);
  box-sizing: border-box;
}

.all-listings.section {
  padding: clamp(60px, 10vw, 100px) 0;
  background: linear-gradient(135deg, $light-color 0%, #c3cfe2 100%);
}

.section-title {
  margin-bottom: clamp(50px, 8vw, 80px);
  
  .title-wrapper {
    max-width: 800px;
    margin: 0 auto;
    
    .subtitle-badge {
      display: inline-block;
      background: linear-gradient(45deg, $accent-color, #ee5a24);
      color: $white;
      padding: clamp(6px, 1.5vw, 8px) clamp(16px, 3vw, 24px);
      border-radius: 25px;
      font-size: clamp(0.8rem, 2vw, 0.9rem);
      font-weight: 600;
      margin-bottom: clamp(15px, 3vw, 20px);
      box-shadow: 0 4px 15px rgba(244, 162, 97, 0.3);
    }
    
    .main-title {
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      font-weight: 800;
      color: $dark-color;
      margin-bottom: clamp(15px, 3vw, 20px);
      line-height: 1.2;
    }
    
    .title-underline {
      width: 100px;
      height: 4px;
      background: linear-gradient(45deg, $primary-color, #667eea);
      margin: 0 auto clamp(20px, 4vw, 30px);
      border-radius: 2px;
    }
    
    .section-description {
      font-size: clamp(1rem, 2.5vw, 1.2rem);
      color: $secondary-color;
      line-height: 1.8;
      margin: 0;
      padding: 0 clamp(10px, 2vw, 15px);
    }
  }
}

.property-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: clamp(20px, 4vw, 30px);
  margin-bottom: clamp(40px, 6vw, 60px);
}

.property-card-wrapper {
  display: flex;
  justify-content: center;
}

.property-card {
  background: $white;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-height: 500px;
  max-width: 380px;
  width: 100%;
  cursor: pointer;
  will-change: transform;
  
  &:hover {
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
    .property-image {
      transform: scale(1.03);
    }
    .card-background .gradient-overlay {
      opacity: 0.1;
    }
    .card-background .pattern-dots {
      opacity: 0.5;
    }
  }
  
  &:focus {
    outline: 2px solid $primary-color;
    outline-offset: 2px;
  }
}

.card-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  
  .pattern-dots {
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="2" cy="2" r="1" fill="rgba(0,123,255,0.1)"/></svg>');
    background-size: 20px 20px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .gradient-overlay {
    background: linear-gradient(135deg, rgba(0, 123, 255, 0.02), rgba(102, 126, 234, 0.02));
    opacity: 0;
    transition: opacity 0.3s ease;
  }
}

.image-container {
  position: relative;
  height: 0;
  padding-bottom: 75%; /* 4:3 aspect ratio */
  width: 100%;
  overflow: hidden;
  z-index: 3;
  
  picture, img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  .property-badge {
    position: absolute;
    top: clamp(10px, 2vw, 15px);
    left: clamp(10px, 2vw, 15px);
    background: $success-color;
    color: $white;
    padding: clamp(5px, 1vw, 6px) clamp(8px, 2vw, 12px);
    border-radius: 15px;
    font-size: clamp(0.7rem, 1.8vw, 0.8rem);
    font-weight: 600;
    text-transform: uppercase;
    z-index: 4;
  }
  
  .price-tag {
    position: absolute;
    top: clamp(10px, 2vw, 15px);
    right: clamp(10px, 2vw, 15px);
    background: $dark-color;
    color: $white;
    padding: clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 15px);
    border-radius: 15px;
    font-weight: 600;
    font-size: clamp(0.9rem, 2vw, 1rem);
    z-index: 4;
  }
}

.card-content {
  padding: clamp(20px, 4vw, 25px);
  position: relative;
  z-index: 3;
  
  .property-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: clamp(10px, 2vw, 15px);
    
    .property-title {
      font-size: clamp(1.3rem, 3vw, 1.5rem);
      font-weight: 700;
      color: $dark-color;
      margin: 0;
      flex: 1;
    }
    
        .property-rating {
      display: flex;
      gap: clamp(2px, 0.5vw, 4px);
      font-size: clamp(0.9rem, 2vw, 1rem);
      
      .star {
        color: $secondary-color;
        transition: color 0.3s ease;
        
        &.filled {
          color: $accent-color;
        }
      }
    }
  }
  
  .property-location {
    font-size: clamp(0.9rem, 2vw, 1rem);
    color: $secondary-color;
    margin-bottom: clamp(15px, 3vw, 20px);
    display: flex;
    align-items: center;
    gap: clamp(5px, 1vw, 8px);
    
    i {
      color: $primary-color;
      font-size: clamp(1rem, 2.5vw, 1.1rem);
    }
  }
  
  .property-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: clamp(10px, 2vw, 15px);
    margin-bottom: clamp(15px, 3vw, 20px);
    
    .feature {
      display: flex;
      align-items: center;
      gap: clamp(5px, 1vw, 8px);
      font-size: clamp(0.85rem, 2vw, 0.95rem);
      color: $dark-color;
      
      i {
        color: $primary-color;
        font-size: clamp(1rem, 2.5vw, 1.1rem);
      }
      
      span {
        font-weight: 500;
      }
    }
  }
  
  .property-actions {
    display: flex;
    justify-content: flex-end;
    
    .map-link {
      display: flex;
      align-items: center;
      gap: clamp(5px, 1vw, 8px);
      color: $primary-color;
      font-size: clamp(0.9rem, 2vw, 1rem);
      font-weight: 600;
      text-decoration: none;
      transition: color 0.3s ease;
      
      &:hover {
        color: darken($primary-color, 10%);
      }
      
      i {
        font-size: clamp(1rem, 2.5vw, 1.1rem);
      }
    }
  }
}

.filter-section {
  margin-bottom: clamp(40px, 6vw, 60px);
  background: $white;
  padding: clamp(20px, 4vw, 30px);
  border-radius: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  
  .filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: clamp(15px, 3vw, 20px);
    align-items: end;
  }
  
  .filter-item {
    display: flex;
    flex-direction: column;
    gap: clamp(5px, 1vw, 8px);
    
    .filter-label {
      font-size: clamp(0.9rem, 2vw, 1rem);
      font-weight: 600;
      color: $dark-color;
    }
    
    .filter-input,
    .filter-select {
      padding: clamp(8px, 2vw, 10px);
      border: 1px solid $light-color;
      border-radius: 8px;
      font-size: clamp(0.9rem, 2vw, 1rem);
      color: $dark-color;
      background: $white;
      transition: border-color 0.3s ease;
      
      &:focus {
        outline: none;
        border-color: $primary-color;
        box-shadow: 0 0 5px rgba($primary-color, 0.3);
      }
    }
    
    .filter-select {
      appearance: none;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path fill="%236c757d" d="M2 4l4 4 4-4z"/></svg>');
      background-repeat: no-repeat;
      background-position: right 10px center;
      padding-right: clamp(25px, 5vw, 30px);
    }
    
    &.filter-button {
      display: flex;
      justify-content: flex-end;
    }
  }
  
  .filter-results {
    margin-top: clamp(15px, 3vw, 20px);
    text-align: center;
    
    p {
      font-size: clamp(0.9rem, 2vw, 1rem);
      color: $secondary-color;
      font-weight: 500;
    }
  }
}

.loading {
  padding: clamp(40px, 8vw, 60px);
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid $light-color;
    border-top: 4px solid $primary-color;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto clamp(15px, 3vw, 20px);
  }
  
  p {
    font-size: clamp(1rem, 2.5vw, 1.2rem);
    color: $secondary-color;
  }
}

.no-data {
  padding: clamp(40px, 8vw, 60px);
  
  h3 {
    font-size: clamp(1.5rem, 4vw, 2rem);
    color: $dark-color;
    margin-bottom: clamp(10px, 2vw, 15px);
  }
  
  p {
    font-size: clamp(1rem, 2.5vw, 1.2rem);
    color: $secondary-color;
    max-width: 600px;
    margin: 0 auto;
  }
}

.error-message {
  padding: clamp(40px, 8vw, 60px);
  
  .error-content {
    max-width: 600px;
    margin: 0 auto;
    
    i {
      font-size: clamp(2rem, 5vw, 2.5rem);
      color: $warning-color;
      margin-bottom: clamp(15px, 3vw, 20px);
    }
    
    h3 {
      font-size: clamp(1.5rem, 4vw, 2rem);
      color: $dark-color;
      margin-bottom: clamp(10px, 2vw, 15px);
    }
    
    p {
      font-size: clamp(1rem, 2.5vw, 1.2rem);
      color: $secondary-color;
      margin-bottom: clamp(20px, 4vw, 30px);
    }
  }
}

.view-more {
  margin-top: clamp(20px, 4vw, 30px);
  
  .cta-button {
    display: flex;
    align-items: center;
    gap: clamp(5px, 1vw, 8px);
    padding: clamp(10px, 2.5vw, 12px) clamp(20px, 5vw, 25px);
    font-size: clamp(0.9rem, 2vw, 1rem);
    font-weight: 600;
    color: $white;
    background: linear-gradient(45deg, $primary-color, #667eea);
    border: none;
    border-radius: 25px;
    cursor: pointer;
    transition: background 0.3s ease, transform 0.3s ease;
    
    &:hover {
      background: linear-gradient(45deg, darken($primary-color, 10%), darken(#667eea, 10%));
      transform: translateY(-2px);
    }
    
    &:focus {
      outline: 2px solid $primary-color;
      outline-offset: 2px;
    }
    
    i {
      font-size: clamp(1rem, 2.5vw, 1.1rem);
    }
  }
}

.cta-button {
  padding: clamp(10px, 2.5vw, 12px) clamp(20px, 5vw, 25px);
  font-size: clamp(0.9rem, 2vw, 1rem);
  font-weight: 600;
  color: $white;
  background: linear-gradient(45deg, $primary-color, #667eea);
  border: none;
  border-radius: 25px;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.3s ease;
  
  &:hover {
    background: linear-gradient(45deg, darken($primary-color, 10%), darken(#667eea, 10%));
    transform: translateY(-2px);
  }
  
  &:focus {
    outline: 2px solid $primary-color;
    outline-offset: 2px;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .filter-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }
  
  .property-card {
    min-height: 450px;
  }
  
  .section-title .title-wrapper {
    padding: 0 clamp(10px, 2vw, 15px);
    
    .main-title {
      font-size: clamp(2rem, 5vw, 2.5rem);
    }
  }
}

@media (max-width: 480px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
  
  .property-card {
    min-height: 400px;
  }
  
  .image-container {
    padding-bottom: 60%; /* Adjust aspect ratio for smaller screens */
  }
  
  .card-content {
    padding: clamp(15px, 3vw, 20px);
  }
}
</style>