<template>
  <section id="property-details" class="section property-details">
    <div class="container" data-aos="fade-up">
      <!-- Section Title -->
      <div class="section-title text-center">
        <div class="title-wrapper">
          <span class="subtitle-badge mt-5">🏠 PROPERTY</span>
          <h2 class="main-title">Property Details</h2>
          <div class="title-underline"></div>
          <p class="section-description">Discover the details of this exceptional property.</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading text-center">
        <div class="spinner"></div>
        <p>Loading property details...</p>
      </div>

      <!-- Error Message -->
      <div v-else-if="showError" class="error-message text-center">
        <div class="error-content">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <h3>Oops! Something went wrong</h3>
          <p>Unable to load property details. Please try again later.</p>
          <button 
            class="cta-button" 
            @click="retryLoad" 
            aria-label="Retry loading property details"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- Property Details -->
      <div v-else-if="property" class="property-details-wrapper" data-aos="fade-up" data-aos-delay="100">
        <div class="property-details-content">
          <!-- Image Gallery -->
          <div class="image-gallery">
            <div class="main-image-container">
              <picture>
                <source :srcset="property.images[currentImageIndex] + '?w=800'" media="(min-width: 768px)" />
                <source :srcset="property.images[currentImageIndex] + '?w=400'" media="(min-width: 480px)" />
                <img 
                  :src="property.images[currentImageIndex]" 
                  :alt="property.alt || `Image of ${property.title}`"
                  class="main-image" 
                  loading="lazy"
                  role="img"
                  @error="handleImageError($event, property.images[currentImageIndex])"
                >
              </picture>
              <div class="status-badge">{{ getPropertyStatusText(property.status) }}</div>
              <div class="image-counter">{{ currentImageIndex + 1 }} / {{ property.images.length }}</div>
              <button 
                @click="prevImage"
                class="nav-button left"
                aria-label="Previous image"
              >
                ←
              </button>
              <button 
                @click="nextImage"
                class="nav-button right"
                aria-label="Next image"
              >
                →
              </button>
            </div>
            <div class="thumbnail-container">
              <img 
                v-for="(img, index) in property.images" 
                :key="index"
                :src="img"
                :alt="`Thumbnail ${index + 1} of ${property.title}`"
                class="thumbnail"
                :class="{ 'active': index === currentImageIndex }"
                @click="currentImageIndex = index"
                @error="handleImageError($event, img)"
                loading="lazy"
              >
            </div>
          </div>

          <!-- Property Info -->
          <div class="property-info">
            <h1 class="property-title">{{ property.title }}</h1>
            <div class="property-location">
              <i class="bi bi-geo-alt" aria-hidden="true"></i>
              <span>{{ property.location }}</span>
            </div>
            <div class="property-price" :aria-label="`Price: ${property.currency} ${property.price.toLocaleString('en-TZ')}`">
              {{ property.currency }} {{ property.price.toLocaleString('en-TZ') }}<span>/month</span>
            </div>
            <p class="property-description">{{ property.description }}</p>
            <!-- Property Features -->
            <div class="property-features">
              <div class="feature">
                <i class="bi bi-house" aria-hidden="true"></i>
                <span>{{ property.available_rooms || property.bedrooms }} Available Rooms</span>
              </div>
              <div class="feature">
                <i class="bi bi-droplet" aria-hidden="true"></i>
                <span>{{ property.bathrooms }} Bathrooms</span>
              </div>
              <div class="feature">
                <i class="bi bi-arrows-fullscreen" aria-hidden="true"></i>
                <span>{{ property.area }} {{ property.areaUnit }}</span>
              </div>
              <div class="feature">
                <i class="bi bi-calendar" aria-hidden="true"></i>
                <span>{{ property.year_built }}</span>
              </div>
            </div>
            <!-- Additional Details -->
            <div class="additional-details">
              <p><strong>Category:</strong> {{ property.category }}</p>
              <p><strong>Total Rooms:</strong> {{ property.total_rooms || property.rooms.length }}</p>
              <p><strong>Available Rooms:</strong> {{ getAvailableRoomsCount() }}</p>
              <p><strong>Booked Rooms:</strong> {{ getBookedRoomsCount() }}</p>
              <p v-if="property.map_url">
                <div class="action-buttons">
                  <button 
                    class="cta-button text-light"
                    aria-label="Book this property"
                  >
                    <a :href="property.map_url" target="_blank" class="map-link text-light" aria-label="View property location on map">
                      <i class="bi bi-geo-alt-fill" aria-hidden="true"></i> View on Map
                    </a>
                  </button>
                </div>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Rooms Section -->
      <div v-if="property && property.rooms && property.rooms.length > 0" class="rooms-section" data-aos="fade-up" data-aos-delay="200">
        <h2 class="rooms-title">
          <i class="bi bi-house" aria-hidden="true"></i>
          All Rooms ({{ property.rooms.length }})
        </h2>
        <!-- Room Status Summary -->
        <div class="room-status-summary">
          <div class="status-item">
            <span class="status-count available">{{ getAvailableRoomsCount() }}</span>
            <span class="status-label">Available</span>
          </div>
          <div class="status-item">
            <span class="status-count booked">{{ getBookedRoomsCount() }}</span>
            <span class="status-label">Booked</span>
          </div>
          <div class="status-item">
            <span class="status-count sold-out">{{ getUnavailableRoomsCount() }}</span>
            <span class="status-label">Sold Out</span>
          </div>
        </div>
        <!-- Rooms Grid -->
        <div class="rooms-grid">
          <div 
            v-for="room in sortedRooms" 
            :key="room.room_number"
            class="room-card"
            :class="{ 'unavailable': !room.is_available || room.is_booked === '1' }"
            data-aos="fade-up"
            data-aos-delay="300"
          >
            <div class="room-image-container">
              <img 
                :src="room.images[0] || fallbackImage" 
                :alt="room.caption || `Image of room ${room.room_number}`"
                class="room-image"
                @error="handleImageError($event, room.images[0])"
                loading="lazy"
              >
              <div class="room-status-badge" :class="getRoomStatusBadgeClass(room)">
                {{ getRoomStatusText(room) }}
              </div>
              <div class="room-category-badge">{{ room.category_name || 'Standard' }}</div>
              <div class="room-number-badge">Room {{ room.room_number }}</div>
            </div>
            <div class="room-content">
              <div class="room-header">
                <h3 class="room-title" :class="{ 'small-text': room.room_number.length > 10 }">Room {{ room.room_number }}</h3>
                <div class="room-price">
                  <span>{{ room.rent }}</span>
                  <span>/month</span>
                </div>
              </div>
              <div class="room-size">
                <i class="bi bi-arrows-fullscreen" aria-hidden="true"></i>
                <span>{{ room.size }}</span>
              </div>
              <p class="room-description">{{ room.description }}</p>
              <div v-if="room.features && room.features.length > 0" class="room-features">
                <span v-for="feature in room.features.slice(0, 3)" :key="feature" class="feature-tag">
                  {{ feature }}
                </span>
                <span v-if="room.features.length > 3" class="feature-tag more">
                  +{{ room.features.length - 3 }} more
                </span>
              </div>
              <div class="room-actions">
                <button 
                  v-if="isRoomAvailable(room)"
                  class="action-button book"
                  @click="bookRoom(room.room_number)"
                  :aria-label="`Book room ${room.room_number} for ${property.title}`"
                >
                  Book Now
                </button>
                <button 
                  v-else-if="room.is_booked === '1'"
                  class="action-button booked"
                  disabled
                  :aria-label="`Room ${room.room_number} is already booked`"
                >
                  Booked
                </button>
                <button 
                  v-else
                  class="action-button sold-out"
                  disabled
                  :aria-label="`Room ${room.room_number} is sold out`"
                >
                  Sold Out
                </button>
                <button 
                  class="action-button view-details"
                  @click="viewRoomDetails(room)"
                  :aria-label="`View details for room ${room.room_number}`"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Rooms Available -->
      <div v-else-if="property" class="no-rooms" data-aos="fade-up" data-aos-delay="200">
        <p>No rooms available for this property.</p>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AOS from 'aos';
import makeRequest from '../../services/makeRequest';

// Define the Room interface
interface Room {
  room_number: string;
  size: string;
  rent: string;
  is_available: boolean;
  is_booked: string;
  description?: string;
  features: string[];
  images: string[];
  caption?: string;
  category_name?: string;
}

// Define the Property interface
interface Property {
  id: string;
  title: string;
  description: string;
  status: string;
  price: number;
  currency: string;
  combined_price: string;
  image: string;
  images: string[];
  alt: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  living_rooms: number;
  kitchens: number;
  area: string;
  areaUnit: string;
  category: string;
  year_built: string;
  energy_rating: string;
  map_url: string;
  rooms: Room[];
  available_rooms?: number;
  total_rooms?: number;
}

const router = useRouter();
const route = useRoute();
const isLoading = ref(false);
const showError = ref(false);
const property = ref<Property | null>(null);
const currentImageIndex = ref(0);
const failedImages = ref<Set<string>>(new Set());
const fallbackImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==';

// Computed property to sort rooms: available first, then unavailable
const sortedRooms = computed(() => {
  if (!property.value?.rooms) return [];
  return [...property.value.rooms].sort((a, b) => {
    const aIsAvailable = a.is_available && a.is_booked !== '1';
    const bIsAvailable = b.is_available && b.is_booked !== '1';
    return aIsAvailable === bIsAvailable ? 0 : aIsAvailable ? -1 : 1;
  });
});

// Helper function to normalize and validate property status
const getPropertyStatusText = (status: string): string => {
  if (!status) return 'N/A';
  const statusMap: { [key: string]: string } = {
    rent: 'Rent',
    for_rent: 'Rent',
    sale: 'Sale',
    for_sale: 'Sale',
    sold: 'Sold',
    pending: 'Pending',
    rented: 'Rented',
    available: 'Available'
  };
  return statusMap[status.toLowerCase()] || status.toUpperCase();
};

// Helper functions for room status
const isRoomAvailable = (room: Room): boolean => {
  return room.is_available && room.is_booked !== '1';
};

const getRoomStatusText = (room: Room): string => {
  if (!room.is_available) return 'Sold Out';
  if (room.is_booked === '1') return 'Booked';
  return 'Available';
};

const getRoomStatusBadgeClass = (room: Room): string => {
  if (!room.is_available) return 'bg-red-500 text-white';
  if (room.is_booked === '1') return 'bg-orange-500 text-white';
  return 'bg-green-500 text-white';
};

const getAvailableRoomsCount = (): number => {
  if (!property.value?.rooms) return 0;
  return property.value.rooms.filter(room => isRoomAvailable(room)).length;
};

const getBookedRoomsCount = (): number => {
  if (!property.value?.rooms) return 0;
  return property.value.rooms.filter(room => room.is_booked === '1').length;
};

const getUnavailableRoomsCount = (): number => {
  if (!property.value?.rooms) return 0;
  return property.value.rooms.filter(room => !room.is_available && room.is_booked !== '1').length;
};

const fetchPropertyDetails = async () => {
  isLoading.value = true;
  showError.value = false;

  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_PROPERTY_DETAILS_URL}/${route.params.id}`,
      requiresAuth: false
    });

    if (response.data?.success && response.data.data) {
      const prop = response.data.data;
      property.value = {
        id: prop.id?.toString() || `property-${Math.random().toString(36).substr(2, 9)}`,
        title: prop.title || 'Untitled Property',
        description: prop.description || 'No description available',
        status: prop.status || 'N/A',
        price: prop.combined_price
          ? parseInt(prop.combined_price.replace(/[^0-9]/g, '')) || 0
          : 0,
        currency: prop.combined_price?.includes('TZS') ? 'TZS' : 'USD',
        combined_price: prop.combined_price || 'N/A',
        image: prop.images?.[0] || fallbackImage,
        images: prop.images && prop.images.length > 0 ? prop.images : [fallbackImage],
        alt: prop.alt || `Image of ${prop.title || 'Untitled Property'}`,
        location: prop.location || 'Unknown Location',
        bedrooms: parseInt(prop.bedrooms) || 0,
        bathrooms: parseInt(prop.bathrooms) || 0,
        living_rooms: parseInt(prop.living_rooms) || 0,
        kitchens: parseInt(prop.kitchens) || 0,
        area: prop.area ? prop.area.replace(/[^0-9.]/g, '') : '0',
        areaUnit: prop.area?.includes('m²') ? 'm²' : 'sqft',
        category: prop.category || 'Unknown',
        year_built: prop.year_built || 'N/A',
        energy_rating: prop.energy_rating || 'N/A',
        map_url: prop.map_url || 'https://maps.google.com',
        available_rooms: parseInt(prop.available_rooms) || 0,
        total_rooms: parseInt(prop.total_rooms) || (prop.rooms?.length || 0),
        rooms: (prop.rooms || []).map((room: any) => ({
          room_number: String(room.room_number),
          size: room.size || 'N/A',
          rent: room.rent || 'N/A',
          is_available: room.is_available ?? true,
          is_booked: String(room.is_booked || '0'),
          description: room.description || 'No description available.',
          features: room.features || [],
          images: room.images && room.images.length > 0 ? room.images : [fallbackImage],
          caption: room.caption || `Image of room ${room.room_number}`,
          category_name: room.category_name || 'Standard'
        }))
      };
    } else {
      console.warn('Invalid API response structure:', response.data);
      showError.value = true;
    }
  } catch (error) {
    console.error('Error fetching property details:', error);
    showError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const handleImageError = (event: Event, originalSrc: string) => {
  if (!failedImages.value.has(originalSrc)) {
    failedImages.value.add(originalSrc);
    console.warn(`Image failed to load: ${originalSrc}`);
  }
  const img = event.target as HTMLImageElement;
  if (img.src !== fallbackImage) {
    img.src = fallbackImage;
  }
};

const prevImage = () => {
  if (property.value && property.value.images.length > 0) {
    currentImageIndex.value = currentImageIndex.value === 0 ? property.value.images.length - 1 : currentImageIndex.value - 1;
  }
};

const nextImage = () => {
  if (property.value && property.value.images.length > 0) {
    currentImageIndex.value = currentImageIndex.value === property.value.images.length - 1 ? 0 : currentImageIndex.value + 1;
  }
};

const bookProperty = () => {
  if (property.value) {
    router.push(`/book/property/${property.value.id}`);
  }
};

const bookRoom = (roomNumber: string) => {
  if (property.value) {
    router.push(`/book/room/${property.value.id}/${roomNumber}`);
  }
};

const viewRoomDetails = (room: Room) => {
  if (property.value) {
    router.push(`/all-properties/${property.value.id}/room/${room.room_number}`);
  }
};

const retryLoad = () => {
  fetchPropertyDetails();
};

onMounted(() => {
  AOS.init({
    duration: 800,
    once: true,
    offset: 100
  });
  fetchPropertyDetails();
});
</script>

<style lang="scss" scoped>
/* Fallbacks for older browsers */
@supports not (display: grid) {
  .property-details-content {
    display: flex;
    flex-wrap: wrap;
  }
  .image-gallery, .property-info {
    flex: 1 1 100%;
  }
  .rooms-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }
  .room-card {
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
$blue-50: #eff6ff;
$blue-600: #2563eb;
$blue-700: #1d4ed8;
$gray-100: #f3f4f6;
$gray-200: #e5e7eb;
$gray-500: #6b7280;
$gray-600: #4b5563;
$gray-700: #374151;
$gray-800: #1f2937;
$gray-900: #111827;
$green-50: #f0fdf4;
$green-500: #22c55e;
$orange-50: #fff7ed;
$orange-500: #f97316;
$red-50: #fef2f2;
$red-500: #ef4444;

.section.property-details {
  padding: clamp(20px, 5vw, 60px) 0;
  background: linear-gradient(135deg, $blue-50 0%, $light-color 100%);
}

.container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 clamp(0.5rem, 2vw, 1rem);
  box-sizing: border-box;
}

.section-title {
  margin-bottom: clamp(20px, 5vw, 40px);
  
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
      font-size: clamp(1.5rem, 5vw, 2.5rem);
      font-weight: 800;
      color: $dark-color;
      margin-bottom: clamp(8px, 2vw, 15px);
    }
    
    .title-underline {
      width: 80px;
      height: 3px;
      background: linear-gradient(45deg, $primary-color, #667eea);
      margin: 0 auto clamp(10px, 3vw, 20px);
      border-radius: 2px;
    }
    
    .section-description {
      font-size: clamp(0.8rem, 2vw, 1rem);
      color: $gray-600;
      line-height: 1.6;
    }
  }
}

.loading {
  margin: clamp(20px, 5vw, 40px) auto;
  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid $primary-color;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto clamp(10px, 2vw, 15px);
  }
  p {
    color: $gray-600;
    font-size: clamp(0.8rem, 2vw, 0.9rem);
  }
}

.error-message {
  margin: clamp(20px, 5vw, 40px) auto;
  .error-content {
    background: $white;
    padding: clamp(15px, 3vw, 25px);
    border-radius: 15px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    text-align: center;
    
    i {
      font-size: clamp(1.5rem, 4vw, 2rem);
      color: $warning-color;
      margin-bottom: clamp(8px, 1.5vw, 12px);
    }
    
    h3 {
      font-size: clamp(1.2rem, 3vw, 1.5rem);
      font-weight: 700;
      color: $dark-color;
      margin-bottom: clamp(8px, 1.5vw, 12px);
    }
    
    p {
      color: $gray-600;
      font-size: clamp(0.7rem, 1.5vw, 0.9rem);
      margin-bottom: clamp(10px, 2vw, 15px);
    }
    
    .cta-button {
      background: linear-gradient(45deg, $primary-color, $blue-700);
      color: $white;
      border: none;
      padding: clamp(6px, 1.5vw, 10px) clamp(15px, 3vw, 25px);
      border-radius: 20px;
      font-size: clamp(0.7rem, 1.5vw, 0.9rem);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 3px 8px rgba(0, 123, 255, 0.3);
      }
      
      &:focus {
        outline: 2px solid $primary-color;
        outline-offset: 2px;
      }
    }
  }
}

.property-details-wrapper {
  background: $white;
  border-radius: 15px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  padding: clamp(15px, 3vw, 25px);
}

.property-details-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(15px, 3vw, 25px);
}

.image-gallery {
  .main-image-container {
    position: relative;
    height: 0;
    padding-bottom: 60%; /* Adjusted aspect ratio */
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
    
    picture, img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    .status-badge {
      position: absolute;
      top: clamp(8px, 1.5vw, 12px);
      left: clamp(8px, 1.5vw, 12px);
      background: $success-color;
      color: $white;
      padding: clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 10px);
      border-radius: 12px;
      font-size: clamp(0.6rem, 1.5vw, 0.8rem);
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .image-counter {
      position: absolute;
      top: clamp(8px, 1.5vw, 12px);
      right: clamp(8px, 1.5vw, 12px);
      background: rgba(0, 0, 0, 0.6);
      color: $white;
      padding: clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 10px);
      border-radius: 12px;
      font-size: clamp(0.6rem, 1.5vw, 0.8rem);
    }
    
    .nav-button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.8);
      color: $gray-800;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.3s ease;
      
      &.left { left: clamp(8px, 1.5vw, 12px); }
      &.right { right: clamp(8px, 1.5vw, 12px); }
      
      &:hover {
        background: $white;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }
      
      &:focus {
        outline: 2px solid $primary-color;
        outline-offset: 2px;
      }
    }
  }
  
  .thumbnail-container {
    display: flex;
    gap: clamp(6px, 1.5vw, 10px);
    margin-top: clamp(8px, 1.5vw, 12px);
    overflow-x: auto;
    padding-bottom: 5px;
    
    .thumbnail {
      width: clamp(50px, 12vw, 70px);
      height: clamp(50px, 12vw, 70px);
      object-fit: cover;
      border-radius: 8px;
      cursor: pointer;
      transition: opacity 0.3s ease, transform 0.3s ease;
      
      &.active {
        border: 2px solid $primary-color;
        transform: scale(1.05);
      }
      
      &:hover:not(.active) {
        opacity: 0.8;
        transform: scale(1.03);
      }
    }
  }
}

.property-info {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 2vw, 15px);
  
  .property-title {
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 700;
    color: $dark-color;
  }
  
  .property-location {
    display: flex;
    align-items: center;
    gap: 6px;
    color: $gray-600;
    font-size: clamp(0.7rem, 1.5vw, 0.9rem);
    
    i {
      font-size: 1rem;
    }
  }
  
  .property-price {
    font-size: clamp(1.2rem, 3vw, 1.6rem);
    font-weight: 700;
    color: $primary-color;
    
    span {
      font-size: clamp(0.7rem, 1.5vw, 0.9rem);
      font-weight: 400;
      color: $gray-500;
      margin-left: 6px;
    }
  }
  
  .property-description {
    color: $gray-700;
    font-size: clamp(0.7rem, 1.5vw, 0.9rem);
    line-height: 1.5;
  }
  
  .property-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
    gap: clamp(6px, 1.5vw, 10px);
    padding: clamp(8px, 1.5vw, 12px);
    background: $blue-50;
    border-radius: 8px;
    
    .feature {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: clamp(0.6rem, 1.5vw, 0.8rem);
      
      i {
        color: $primary-color;
        font-size: clamp(1rem, 2vw, 1.2rem);
      }
      
      span {
        font-weight: 600;
        color: $dark-color;
        text-align: center;
      }
    }
  }
  
  .additional-details {
    display: flex;
    flex-direction: column;
    gap: clamp(6px, 1.5vw, 10px);
    font-size: clamp(0.7rem, 1.5vw, 0.9rem);
    color: $gray-600;
    
    p {
      margin: 0;
      
      strong {
        color: $dark-color;
        font-weight: 600;
      }
    }
    
    .map-link {
      color: $primary-color;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      
      &:hover {
        text-decoration: underline;
      }
      
      &:focus {
        outline: 2px solid $primary-color;
        outline-offset: 2px;
      }
      
      i {
        font-size: 1rem;
      }
    }
  }
  
  .action-buttons {
    .cta-button {
      background: linear-gradient(45deg, $primary-color, $blue-700);
      color: $white;
      border: none;
      padding: clamp(6px, 1.5vw, 10px) clamp(12px, 2vw, 18px);
      border-radius: 15px;
      font-size: clamp(0.6rem, 1.5vw, 0.8rem);
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      justify-content: center;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 3px 8px rgba(0, 123, 255, 0.3);
      }
      
      &:focus {
        outline: 2px solid $primary-color;
        outline-offset: 2px;
      }
      
      i {
        font-size: 0.9rem;
      }
      
      .map-link {
        color: $white;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        
        &:hover {
          text-decoration: underline;
        }
        
        &:focus {
          outline: 2px solid $primary-color;
          outline-offset: 2px;
        }
        
        i {
          font-size: 0.9rem;
        }
      }
    }
  }
}

.rooms-section {
  background: $white;
  border-radius: 15px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  padding: clamp(15px, 3vw, 25px);
  margin-top: clamp(15px, 3vw, 25px);
  
  .rooms-title {
    font-size: clamp(1.2rem, 3vw, 1.5rem);
    font-weight: 700;
    color: $dark-color;
    margin-bottom: clamp(10px, 2vw, 15px);
    display: flex;
    align-items: center;
    gap: 6px;
    
    i {
      color: $primary-color;
      font-size: 1.2rem;
    }
  }
  
  .room-status-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(8px, 1.5vw, 12px);
    margin-bottom: clamp(15px, 3vw, 20px);
    
    .status-item {
      background: $gray-100;
      padding: clamp(8px, 1.5vw, 12px);
      border-radius: 8px;
      text-align: center;
      
      .status-count {
        font-size: clamp(1.2rem, 3vw, 1.5rem);
        font-weight: 700;
        
        &.available { color: $green-500; }
        &.booked { color: $orange-500; }
        &.sold-out { color: $red-500; }
      }
      
      .status-label {
        font-size: clamp(0.6rem, 1.5vw, 0.8rem);
        color: $gray-600;
      }
    }
  }
  
  .rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: clamp(10px, 2vw, 15px);
  }
  
  .room-card {
    border: 1px solid $gray-200;
    border-radius: 12px;
    overflow: hidden;
    transition: box-shadow 0.3s ease;
    
    &:hover:not(.unavailable) {
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
    }
    
    &.unavailable {
      opacity: 0.6;
    }
    
    .room-image-container {
      position: relative;
      height: 0;
      padding-bottom: 60%; /* Adjusted aspect ratio */
      overflow: hidden;
      
      .room-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }
      
      .room-status-badge {
        position: absolute;
        top: clamp(8px, 1.5vw, 12px);
        left: clamp(8px, 1.5vw, 12px);
        padding: clamp(3px, 1vw, 5px) clamp(6px, 1.5vw, 8px);
        border-radius: 8px;
        font-size: clamp(0.5rem, 1.2vw, 0.7rem);
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .room-category-badge {
        position: absolute;
        top: clamp(8px, 1.5vw, 12px);
        right: clamp(8px, 1.5vw, 12px);
        background: $primary-color;
        color: $white;
        padding: clamp(3px, 1vw, 5px) clamp(6px, 1.5vw, 8px);
        border-radius: 8px;
        font-size: clamp(0.5rem, 1.2vw, 0.7rem);
        font-weight: 600;
      }
      
      .room-number-badge {
        position: absolute;
        bottom: clamp(8px, 1.5vw, 12px);
        left: clamp(8px, 1.5vw, 12px);
        background: $gray-800;
        color: $white;
        padding: clamp(3px, 1vw, 5px) clamp(6px, 1.5vw, 8px);
        border-radius: 8px;
        font-size: clamp(0.5rem, 1.2vw, 0.7rem);
        font-weight: 600;
      }
    }
    
    .room-content {
      padding: clamp(10px, 2vw, 15px);
      
      .room-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: clamp(8px, 1.5vw, 12px);
        
        .room-title {
          font-size: clamp(0.9rem, 2vw, 1.1rem);
          font-weight: 600;
          color: $dark-color;
          
          &.small-text {
            font-size: clamp(0.7rem, 1.5vw, 0.9rem);
          }
        }
        
        .room-price {
          text-align: right;
          
          span:first-child {
            font-size: clamp(0.8rem, 2vw, 1rem);
            font-weight: 700;
            color: $primary-color;
          }
          
          span:last-child {
            font-size: clamp(0.6rem, 1.5vw, 0.8rem);
            color: $gray-500;
          }
        }
      }
      
      .room-size {
        display: flex;
        align-items: center;
        gap: 6px;
        color: $gray-600;
        font-size: clamp(0.6rem, 1.5vw, 0.8rem);
        margin-bottom: clamp(6px, 1.5vw, 10px);
        
        i {
          font-size: 0.9rem;
        }
      }
      
      .room-description {
        font-size: clamp(0.6rem, 1.5vw, 0.8rem);
        color: $gray-600;
        line-height: 1.5;
        margin-bottom: clamp(6px, 1.5vw, 10px);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .room-features {
        display: flex;
        flex-wrap: wrap;
        gap: clamp(4px, 1vw, 6px);
        margin-bottom: clamp(6px, 1.5vw, 10px);
        
        .feature-tag {
          background: $gray-100;
          color: $gray-700;
          padding: clamp(3px, 0.8vw, 5px) clamp(6px, 1.5vw, 8px);
          border-radius: 6px;
          font-size: clamp(0.5rem, 1.2vw, 0.7rem);
          font-weight: 500;
          
          &.more {
            background: $gray-200;
            color: $gray-600;
          }
        }
      }
      
      .room-actions {
        display: flex;
        gap: clamp(6px, 1.5vw, 10px);
        
        .action-button {
          flex: 1;
          padding: clamp(6px, 1.5vw, 10px);
          border-radius: 10px;
          font-size: clamp(0.6rem, 1.5vw, 0.8rem);
          font-weight: 600;
          text-align: center;
          transition: all 0.3s ease;
          
          &.book {
            background: linear-gradient(45deg, $primary-color, $blue-700);
            color: $white;
            
            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 2px 5px rgba(0, 123, 255, 0.2);
            }
            
            &:focus {
              outline: 2px solid $primary-color;
              outline-offset: 2px;
            }
          }
          
          &.booked {
            background: $orange-500;
            color: $white;
            cursor: not-allowed;
          }
          
          &.sold-out {
            background: $red-500;
            color: $white;
            cursor: not-allowed;
          }
          
          &.view-details {
            background: $gray-600;
            color: $white;
            
            &:hover {
              background: $gray-700;
              transform: translateY(-2px);
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            }
            
            &:focus {
              outline: 2px solid $gray-600;
              outline-offset: 2px;
            }
          }
        }
      }
    }
  }
}

.no-rooms {
  background: $white;
  border-radius: 15px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  padding: clamp(15px, 3vw, 25px);
  text-align: center;
  margin-top: clamp(15px, 3vw, 25px);
  
  p {
    font-size: clamp(0.7rem, 1.5vw, 0.9rem);
    color: $gray-600;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  .property-details-content {
    grid-template-columns: 1fr;
  }
  
  .image-gallery .main-image-container {
    padding-bottom: 66.67%; /* 3:2 aspect ratio */
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 clamp(0.3rem, 1.5vw, 0.75rem);
  }
  
  .section-title {
    margin-bottom: clamp(15px, 4vw, 30px);
    
    .title-wrapper {
      .main-title {
        font-size: clamp(1.2rem, 4vw, 1.8rem);
      }
      
      .section-description {
        font-size: clamp(0.6rem, 1.5vw, 0.8rem);
      }
    }
  }
  
  .property-details-wrapper {
    padding: clamp(10px, 2vw, 15px);
  }
  
  .property-info {
    .property-title {
      font-size: clamp(1.2rem, 3vw, 1.5rem);
    }
    
    .property-price {
      font-size: clamp(1rem, 2.5vw, 1.3rem);
    }
    
    .property-features {
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    }
  }
  
  .rooms-section {
    .room-status-summary {
      grid-template-columns: 1fr;
      gap: clamp(6px, 1.5vw, 10px);
    }
    
    .rooms-grid {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 480px) {
  .property-info {
    .property-features {
      grid-template-columns: 1fr;
      
      .feature {
        flex-direction: row;
        justify-content: center;
        gap: 6px;
      }
    }
    
    .additional-details {
      font-size: clamp(0.6rem, 1.5vw, 0.7rem);
    }
  }
  
  .rooms-section {
    .rooms-title {
      font-size: clamp(1rem, 2.5vw, 1.2rem);
    }
    
    .room-card {
      .room-content {
        padding: clamp(8px, 1.5vw, 12px);
        
        .room-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }
        
        .room-price {
          text-align: left;
        }
      }
    }
  }
}
</style>