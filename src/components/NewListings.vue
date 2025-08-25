<template>
  <section id="new-listings" class="section new-listings">
    <div class="container">
      <div class="section-title text-center">
        <div class="title-wrapper">
          <span class="subtitle-badge">🔥 HOT</span>
          <h2 class="main-title">New Listings</h2>
          <div class="title-underline"></div>
          <p class="section-description">Discover the most sought-after properties in prime locations.</p>
        </div>
      </div>

      <div v-if="isLoading" class="loading text-center">
        <div class="spinner"></div>
        <p>Loading properties...</p>
      </div>

      <div v-else-if="properties.length > 0" class="property-grid">
        <div 
          class="property-card-wrapper"
          v-for="(property, index) in properties" 
          :key="property.id"
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
            <div class="card-background">
              <div class="pattern-dots"></div>
              <div class="gradient-overlay"></div>
            </div>

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
                  @error="handleImageError"
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
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="!showError" class="no-data text-center">
        <h3>No Properties Available</h3>
        <p>Check back later for new listings!</p>
      </div>

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

      <div v-if="!isLoading && !showError && properties.length > 0" class="view-more text-center">
        <router-link 
          to="/all-properties" 
          class="cta-button" 
          aria-label="View all properties"
        >
          <span style="color: #ffffff;">View All Properties</span>
          <i class="bi bi-arrow-right" aria-hidden="true"></i>
        </router-link>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import makeRequest from '../services/makeRequest';

// Define the Property interface based on the API data structure
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
}

const router = useRouter();
const properties = ref<Property[]>([]);
const showError = ref(false);
const isLoading = ref(false);

const fetchProperties = async () => {
  isLoading.value = true;
  showError.value = false;

  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_LIST_PROPERTIES_URL}`,
      requiresAuth: false
    });

    if (response.data?.success && Array.isArray(response.data.data)) {
      properties.value = response.data.data.map((property: any) => {
        const cleanPrice = property.combined_price
          ? parseInt(property.combined_price.replace(/[^0-9]/g, '')) || 0
          : 0;
        const currency = property.combined_price?.includes('TZS') ? 'TZS' : 'USD';
        const cleanArea = property.area
          ? parseInt(property.area.replace(/[^0-9]/g, '')) || 0
          : 0;

        return {
          id: property.id?.toString() || `property-${Math.random().toString(36).substr(2, 9)}`,
          title: property.title || 'Untitled Property',
          location: property.location || 'Unknown Location',
          price: cleanPrice,
          currency: currency,
          image: property.image || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
          alt: property.alt || `Image of ${property.title || 'Untitled Property'}`,
          badge: property.badge || 'New',
          rating: Math.min(Math.max(parseInt(property.rating) || 4, 1), 5),
          bedrooms: parseInt(property.bedrooms) || 0,
          bathrooms: parseInt(property.bathrooms) || 0,
          area: cleanArea,
          areaUnit: property.area?.includes('m²') ? 'm²' : 'sqft'
        };
      });
    } else {
      console.warn('Unexpected response structure:', response.data);
      showError.value = true;
    }
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    showError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const retryLoad = () => {
  fetchProperties();
};

const goToPropertyDetails = (propertyId: string) => {
  router.push({ name: 'my-property-details', params: { id: propertyId } });
};

const handleCardHover = (event: Event) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = 'translateY(-5px)';
};

const handleCardLeave = (event: Event) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = 'translateY(0)';
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==';
};

onMounted(() => {
  fetchProperties();
});
</script>

<style lang="scss">
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
  padding: 0 1rem;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
  min-height: 100px;
}

.new-listings.section {
  padding: 60px 0;
  background: #e9ecef; /* Fallback */
  background: linear-gradient(135deg, $light-color 0%, #c3cfe2 100%);
  position: relative;
  overflow: visible;
}

.section-title {
  margin-bottom: 50px;
  
  .title-wrapper {
    max-width: 800px;
    margin: 0 auto;
    
    .subtitle-badge {
      display: inline-block;
      background: $accent-color; /* Fallback */
      background: linear-gradient(45deg, $accent-color, #ee5a24);
      color: $white;
      padding: 6px 16px;
      border-radius: 25px;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 15px;
    }
    
    .main-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: $dark-color;
      margin-bottom: 15px;
      line-height: 1.2;
    }
    
    .title-underline {
      width: 100px;
      height: 4px;
      background: $primary-color; /* Fallback */
      background: linear-gradient(45deg, $primary-color, #667eea);
      margin: 0 auto 20px;
      border-radius: 2px;
    }
    
    .section-description {
      font-size: 1rem;
      color: $secondary-color;
      line-height: 1.8;
      margin: 0;
      padding: 0 10px;
    }
  }
}

.property-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
  justify-content: center;
  min-height: 300px;
}

.property-card-wrapper {
  display: flex;
  justify-content: center;
  min-height: 400px;
}

.property-card {
  background: $white;
  border-radius: 15px;
  overflow: hidden;
  position: relative;
  transition: transform 0.3s ease;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-height: 400px;
  max-width: 380px;
  width: 100%;
  cursor: pointer;
  will-change: transform;
  
  &:hover {
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
    .property-image {
      transform: scale(1.03);
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
    background: #007bff; /* Fallback */
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
    top: 10px;
    left: 10px;
    background: $success-color;
    color: $white;
    padding: 5px 8px;
    border-radius: 15px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .price-tag {
    position: absolute;
    top: 10px;
    right: 10px;
    background: $dark-color;
    color: $white;
    padding: 6px 10px;
    border-radius: 15px;
    font-weight: 600;
    font-size: 0.9rem;
  }
}

.card-content {
  padding: 20px;
  position: relative;
  z-index: 3;
  
  .property-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    
    .property-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: $dark-color;
      margin: 0;
      flex: 1;
    }
    
    .property-rating {
      display: flex;
      gap: 4px;
      
      .star {
        font-size: 0.9rem;
        opacity: 0.3;
        
        &.filled {
          opacity: 1;
        }
      }
    }
  }
  
  .property-location {
    color: $secondary-color;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
  }
  
  .property-features {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
    padding: 8px;
    background: rgba(0, 123, 255, 0.1);
    border-radius: 8px;
    
    .feature {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      
      i {
        color: $primary-color;
        font-size: 1rem;
      }
      
      span {
        font-weight: 600;
        color: $dark-color;
      }
    }
  }
}

.no-data, .error-message {
  margin: 40px auto;
  padding: 20px;
  background: $white;
  border-radius: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  text-align: center;
  
  h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: $dark-color;
    margin-bottom: 10px;
  }
  
  p {
    font-size: 0.9rem;
    color: $secondary-color;
  }
}

.loading {
  margin: 40px auto;
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid $primary-color;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }
  p {
    color: $secondary-color;
    font-size: 0.9rem;
  }
}

.cta-button {
  background: $primary-color; /* Fallback */
  background: linear-gradient(45deg, $primary-color, #667eea);
  color: $white;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 10px rgba(0, 123, 255, 0.3);
  }
  
  &:focus {
    outline: 2px solid $primary-color;
    outline-offset: 2px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .container {
    padding: 0 0.75rem;
  }
  
  .new-listings.section {
    padding: 40px 0;
  }
  
  .section-title {
    margin-bottom: 30px;
    
    .title-wrapper {
      .main-title {
        font-size: 2rem;
      }
      
      .section-description {
        font-size: 0.9rem;
      }
    }
  }
  
  .property-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .property-card {
    min-height: 350px;
  }
  
  .image-container {
    padding-bottom: 66.67%; /* 3:2 aspect ratio for smaller screens */
  }
}

@media (max-width: 480px) {
  .section-title {
    .title-wrapper {
      .main-title {
        font-size: 1.8rem;
      }
    }
  }
  
  .property-card {
    padding: 10px;
    min-height: 320px;
  }
  
  .property-title {
    font-size: 1.2rem;
  }
  
  .property-features {
    flex-direction: column;
    gap: 8px;
    
    .feature {
      flex-direction: row;
      justify-content: center;
    }
  }
}
</style>