<template>
  <section id="room-details" class="section room-details">
    <div class="container" data-aos="fade-up">
      <!-- Section Title -->
      <div class="section-title text-center">
        <div class="title-wrapper">
          <span class="subtitle-badge">🏠 ROOM</span>
          <h2 class="main-title">Room Details</h2>
          <div class="title-underline"></div>
          <p class="section-description">Explore the details of your selected room.</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading text-center">
        <div class="spinner"></div>
        <p>Loading room details...</p>
      </div>

      <!-- Error Message -->
      <div v-else-if="showError" class="error-message text-center">
        <div class="error-content">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <h3>Oops! Something went wrong</h3>
          <p>Unable to load room details. Please try again later.</p>
          <button 
            class="cta-button" 
            @click="retryLoad" 
            aria-label="Retry loading room details"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- Room Details -->
      <div v-else-if="room" class="room-details-wrapper" data-aos="fade-up" data-aos-delay="100">
        <div class="room-details-content">
          <!-- Room Image -->
          <div class="image-gallery">
            <div class="main-image-container">
              <picture>
                <source :srcset="room.images[currentImageIndex] + '?w=800'" media="(min-width: 768px)" />
                <source :srcset="room.images[currentImageIndex] + '?w=400'" media="(min-width: 480px)" />
                <img 
                  :src="room.images[currentImageIndex] || fallbackImage" 
                  :alt="room.caption || `Image of room ${room.room_number}`"
                  class="main-image"
                  loading="lazy"
                  role="img"
                  @error="handleImageError($event, room.images[currentImageIndex])"
                >
              </picture>
              <div class="status-badge" :class="getRoomStatusBadgeClass(room)">
                {{ getRoomStatusText(room) }}
              </div>
              <div class="category-badge">{{ room.category_name || 'Standard' }}</div>
              <div class="image-counter">{{ currentImageIndex + 1 }} / {{ room.images.length }}</div>
              <button 
                v-if="room.images.length > 1"
                @click="prevImage"
                class="nav-button left"
                aria-label="Previous image"
              >
                ←
              </button>
              <button 
                v-if="room.images.length > 1"
                @click="nextImage"
                class="nav-button right"
                aria-label="Next image"
              >
                →
              </button>
            </div>
            <div v-if="room.images.length > 1" class="thumbnail-container">
              <img 
                v-for="(img, index) in room.images" 
                :key="index"
                :src="img"
                :alt="`Thumbnail ${index + 1} of room ${room.room_number}`"
                class="thumbnail"
                :class="{ 'active': index === currentImageIndex }"
                @click="currentImageIndex = index"
                @error="handleImageError($event, img)"
                loading="lazy"
              >
            </div>
          </div>

          <!-- Room Info -->
          <div class="room-info">
            <div class="room-header">
              <h1 class="room-title">Room {{ room.room_number }}</h1>
              <div class="room-status">
                <span class="status-dot" :class="getRoomStatusDotClass(room)"></span>
                <span :class="getRoomStatusTextClass(room)">{{ getRoomStatusText(room) }}</span>
              </div>
            </div>
            <div class="room-price" :aria-label="`Rent: ${room.currency} ${room.rent.toLocaleString('en-TZ')}`">
              {{ room.currency }} {{ room.rent.toLocaleString('en-TZ') }}<span>/month</span>
            </div>
            <div class="room-details-grid">
              <div class="detail-item">
                <i class="bi bi-arrows-fullscreen" aria-hidden="true"></i>
                <span>{{ room.size }} Size</span>
              </div>
              <div class="detail-item">
                <i class="bi bi-star" aria-hidden="true"></i>
                <span>{{ room.features ? room.features.length : 0 }} Features</span>
              </div>
            </div>
            <div class="room-description">
              <span class="section-label">Description:</span>
              <p>{{ room.description || 'No description available.' }}</p>
            </div>
            <div class="room-features">
              <span class="section-label">Features:</span>
              <div v-if="room.features && room.features.length > 0" class="features-grid">
                <div v-for="feature in room.features" :key="feature" class="feature-item">
                  <i class="bi bi-check-circle" aria-hidden="true"></i>
                  {{ feature }}
                </div>
              </div>
              <p v-else class="no-features">No features listed for this room.</p>
            </div>
            <div v-if="!isRoomAvailable(room)" class="status-message">
              <i class="bi bi-info-circle" aria-hidden="true"></i>
              <p>
                <span v-if="room.is_booked === '1'">
                  This room is currently booked and unavailable for new bookings.
                </span>
                <span v-else>
                  This room is currently unavailable for booking.
                </span>
              </p>
            </div>
            <div class="action-buttons">
              <button 
                v-if="isRoomAvailable(room)"
                class="cta-button book"
                @click="bookRoom"
                aria-label="Book this room"
              >
                <i class="bi bi-bookmark-check" aria-hidden="true"></i>
                Book Now
              </button>
              <button 
                v-else-if="room.is_booked === '1'"
                class="cta-button booked"
                disabled
                aria-label="This room is already booked"
              >
                <i class="bi bi-bookmark-fill" aria-hidden="true"></i>
                Already Booked
              </button>
              <button 
                v-else
                class="cta-button unavailable"
                disabled
                aria-label="This room is unavailable"
              >
                <i class="bi bi-x-circle" aria-hidden="true"></i>
                Unavailable
              </button>
              <router-link 
                :to="`/all-properties/${propertyId}`"
                class="cta-button back"
                aria-label="Back to property details"
              >
                <i class="bi bi-arrow-left" aria-hidden="true"></i>
                Back to Property
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- No Room Found -->
      <div v-else class="no-room" data-aos="fade-up" data-aos-delay="100">
        <i class="bi bi-house-x" aria-hidden="true"></i>
        <h3>Room Not Found</h3>
        <p>The requested room does not exist or may have been removed.</p>
        <router-link 
          :to="`/all-properties/${propertyId}`" 
          class="cta-button back"
          aria-label="Back to property details"
        >
          <i class="bi bi-arrow-left" aria-hidden="true"></i>
          Back to Property
        </router-link>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AOS from 'aos';
import makeRequest from '../../services/makeRequest';

// Define the Room interface
interface Room {
  room_number: string;
  size: string;
  rent: number;
  currency: string;
  is_available: boolean;
  is_booked: string;
  description?: string;
  features: string[];
  images: string[];
  caption?: string;
  category_name?: string;
}

const router = useRouter();
const route = useRoute();
const isLoading = ref(false);
const showError = ref(false);
const room = ref<Room | null>(null);
const propertyId = ref(route.params.propertyId as string);
const currentImageIndex = ref(0);
const failedImages = ref<Set<string>>(new Set());
const fallbackImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==';

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

const getRoomStatusTextClass = (room: Room): string => {
  if (!room.is_available) return 'text-red-600';
  if (room.is_booked === '1') return 'text-orange-600';
  return 'text-green-600';
};

const getRoomStatusDotClass = (room: Room): string => {
  if (!room.is_available) return 'bg-red-500';
  if (room.is_booked === '1') return 'bg-orange-500';
  return 'bg-green-500';
};

const fetchRoomDetails = async () => {
  isLoading.value = true;
  showError.value = false;

  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/${import.meta.env.VITE_APP_PROPERTY_DETAILS_URL}/${route.params.propertyId}`,
      requiresAuth: false
    });

    if (response.data?.success && response.data.data) {
      const prop = response.data.data;
      const selectedRoom = prop.rooms.find((r: any) => r.room_number === route.params.roomNumber);
      if (selectedRoom) {
        room.value = {
          room_number: String(selectedRoom.room_number),
          size: selectedRoom.size || 'N/A',
          rent: parseInt(selectedRoom.rent?.replace(/[^0-9]/g, '') || '0'),
          currency: selectedRoom.rent?.includes('TZS') ? 'TZS' : 'USD',
          is_available: selectedRoom.is_available ?? true,
          is_booked: String(selectedRoom.is_booked || '0'),
          description: selectedRoom.description || 'No description available.',
          features: selectedRoom.features || [],
          images: selectedRoom.images && selectedRoom.images.length > 0 ? selectedRoom.images : [fallbackImage],
          caption: selectedRoom.caption || `Image of room ${selectedRoom.room_number}`,
          category_name: selectedRoom.category_name || 'Standard'
        };
      } else {
        console.warn('Room not found in API response');
        room.value = null;
        showError.value = true;
      }
    } else {
      console.warn('Invalid API response');
      room.value = null;
      showError.value = true;
    }
  } catch (error) {
    console.error('Error fetching room details:', error);
    room.value = null;
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
  if (room.value && room.value.images.length > 0) {
    currentImageIndex.value = currentImageIndex.value === 0 ? room.value.images.length - 1 : currentImageIndex.value - 1;
  }
};

const nextImage = () => {
  if (room.value && room.value.images.length > 0) {
    currentImageIndex.value = currentImageIndex.value === room.value.images.length - 1 ? 0 : currentImageIndex.value + 1;
  }
};

const bookRoom = () => {
  if (room.value && isRoomAvailable(room.value)) {
    router.push(`/book/room/${propertyId.value}/${room.value.room_number}`);
  }
};

const retryLoad = () => {
  fetchRoomDetails();
};

onMounted(() => {
  AOS.init({
    duration: 800,
    once: true,
    offset: 100
  });
  fetchRoomDetails();
});
</script>

<style lang="scss" scoped>
/* Fallbacks for older browsers */
@supports not (display: grid) {
  .room-details-content {
    display: flex;
    flex-wrap: wrap;
  }
  .image-gallery, .room-info {
    flex: 1 1 100%;
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

.section.room-details {
  padding: clamp(60px, 10vw, 100px) 0;
  background: linear-gradient(135deg, $blue-50 0%, $light-color 100%);
}

.container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 clamp(0.75rem, 2vw, 1rem);
  box-sizing: border-box;
}

.section-title {
  margin-bottom: clamp(40px, 6vw, 60px);
  
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
      margin-bottom: clamp(10px, 2vw, 15px);
    }
    
    .main-title {
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 800;
      color: $dark-color;
      margin-bottom: clamp(10px, 2vw, 15px);
    }
    
    .title-underline {
      width: 100px;
      height: 4px;
      background: linear-gradient(45deg, $primary-color, #667eea);
      margin: 0 auto clamp(15px, 3vw, 20px);
      border-radius: 2px;
    }
    
    .section-description {
      font-size: clamp(0.9rem, 2vw, 1.1rem);
      color: $gray-600;
      line-height: 1.8;
    }
  }
}

.loading {
  margin: clamp(40px, 6vw, 60px) auto;
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid $primary-color;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto clamp(15px, 3vw, 20px);
  }
  p {
    color: $gray-600;
    font-size: clamp(0.9rem, 2vw, 1rem);
  }
}

.error-message {
  margin: clamp(40px, 6vw, 60px) auto;
  .error-content {
    background: $white;
    padding: clamp(20px, 4vw, 30px);
    border-radius: 20px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    max-width: 500px;
    text-align: center;
    
    i {
      font-size: clamp(2rem, 5vw, 2.5rem);
      color: $warning-color;
      margin-bottom: clamp(10px, 2vw, 15px);
    }
    
    h3 {
      font-size: clamp(1.5rem, 3.5vw, 1.8rem);
      font-weight: 700;
      color: $dark-color;
      margin-bottom: clamp(10px, 2vw, 15px);
    }
    
    p {
      color: $gray-600;
      font-size: clamp(0.9rem, 2vw, 1rem);
      margin-bottom: clamp(15px, 3vw, 20px);
    }
    
    .cta-button {
      background: linear-gradient(45deg, $primary-color, $blue-700);
      color: $white;
      border: none;
      padding: clamp(10px, 2vw, 12px) clamp(20px, 4vw, 30px);
      border-radius: 25px;
      font-size: clamp(0.9rem, 2vw, 1rem);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 10px rgba(0, 123, 255, 0.3);
      }
      
      &:focus {
        outline: 2px solid $primary-color;
        outline-offset: 2px;
      }
    }
  }
}

.room-details-wrapper {
  background: $white;
  border-radius: 20px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  padding: clamp(20px, 4vw, 30px);
}

.room-details-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(20px, 4vw, 30px);
}

.image-gallery {
  .main-image-container {
    position: relative;
    height: 0;
    padding-bottom: 75%; /* 4:3 aspect ratio */
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    
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
      top: clamp(10px, 2vw, 15px);
      left: clamp(10px, 2vw, 15px);
      padding: clamp(5px, 1vw, 6px) clamp(10px, 2vw, 12px);
      border-radius: 15px;
      font-size: clamp(0.8rem, 2vw, 0.9rem);
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .category-badge {
      position: absolute;
      top: clamp(10px, 2vw, 15px);
      right: clamp(10px, 2vw, 15px);
      background: $primary-color;
      color: $white;
      padding: clamp(5px, 1vw, 6px) clamp(10px, 2vw, 12px);
      border-radius: 15px;
      font-size: clamp(0.8rem, 2vw, 0.9rem);
      font-weight: 600;
    }
    
    .image-counter {
      position: absolute;
      top: clamp(10px, 2vw, 15px);
      right: clamp(10px, 2vw, 15px);
      background: rgba(0, 0, 0, 0.7);
      color: $white;
      padding: clamp(5px, 1vw, 6px) clamp(10px, 2vw, 12px);
      border-radius: 15px;
      font-size: clamp(0.8rem, 2vw, 0.9rem);
    }
    
    .nav-button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.8);
      color: $gray-800;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 1.2rem;
      cursor: pointer;
      transition: background 0.3s ease;
      
      &.left { left: clamp(10px, 2vw, 15px); }
      &.right { right: clamp(10px, 2vw, 15px); }
      
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
    gap: clamp(8px, 2vw, 12px);
    margin-top: clamp(10px, 2vw, 15px);
    overflow-x: auto;
    padding-bottom: 5px;
    
    .thumbnail {
      width: clamp(60px, 15vw, 80px);
      height: clamp(60px, 15vw, 80px);
      object-fit: cover;
      border-radius: 10px;
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

.room-info {
  display: flex;
  flex-direction: column;
  gap: clamp(15px, 3vw, 20px);
  
  .room-header {
    display: flex;
    flex-direction: column;
    gap: clamp(8px, 2vw, 12px);
    
    .room-title {
      font-size: clamp(1.8rem, 4vw, 2.2rem);
      font-weight: 700;
      color: $dark-color;
    }
    
    .room-status {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      
      span {
        font-size: clamp(0.9rem, 2vw, 1rem);
        font-weight: 600;
      }
    }
  }
  
  .room-price {
    font-size: clamp(1.5rem, 3.5vw, 1.8rem);
    font-weight: 700;
    color: $primary-color;
    
    span {
      font-size: clamp(0.9rem, 2vw, 1rem);
      font-weight: 400;
      color: $gray-500;
      margin-left: 8px;
    }
  }
  
  .room-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(8px, 2vw, 12px);
    padding: clamp(10px, 2vw, 15px);
    background: $blue-50;
    border-radius: 10px;
    
    .detail-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      font-size: clamp(0.8rem, 2vw, 0.9rem);
      
      i {
        color: $primary-color;
        font-size: clamp(1.2rem, 2.5vw, 1.4rem);
      }
      
      span {
        font-weight: 600;
        color: $dark-color;
        text-align: center;
      }
    }
  }
  
  .room-description {
    display: flex;
    flex-direction: column;
    gap: clamp(8px, 2vw, 12px);
    
    .section-label {
      font-size: clamp(0.9rem, 2vw, 1rem);
      font-weight: 600;
      color: $dark-color;
    }
    
    p {
      font-size: clamp(0.9rem, 2vw, 1rem);
      color: $gray-600;
      line-height: 1.6;
    }
  }
  
  .room-features {
    display: flex;
    flex-direction: column;
    gap: clamp(8px, 2vw, 12px);
    
    .section-label {
      font-size: clamp(0.9rem, 2vw, 1rem);
      font-weight: 600;
      color: $dark-color;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: clamp(8px, 2vw, 12px);
      
      .feature-item {
        display: flex;
        align-items: center;
        gap: 8px;
        background: $gray-100;
        padding: clamp(6px, 1.5vw, 8px);
        border-radius: 8px;
        font-size: clamp(0.8rem, 2vw, 0.9rem);
        color: $gray-700;
        
        i {
          color: $green-500;
          font-size: 1rem;
        }
      }
    }
    
    .no-features {
      font-size: clamp(0.8rem, 2vw, 0.9rem);
      color: $gray-500;
      font-style: italic;
    }
  }
  
  .status-message {
    display: flex;
    align-items: center;
    gap: 8px;
    background: $orange-50;
    border-left: 4px solid $orange-500;
    padding: clamp(10px, 2vw, 15px);
    border-radius: 8px;
    
    i {
      color: $orange-500;
      font-size: 1.2rem;
    }
    
    p {
      font-size: clamp(0.8rem, 2vw, 0.9rem);
      color: $gray-700;
      margin: 0;
    }
  }
  
  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: clamp(8px, 2vw, 12px);
    
    .cta-button {
      padding: clamp(10px, 2vw, 12px) clamp(20px, 4vw, 30px);
      border-radius: 25px;
      font-size: clamp(0.9rem, 2vw, 1rem);
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.3s ease;
      
      &.book {
        background: linear-gradient(45deg, $primary-color, $blue-700);
        color: $white;
        border: none;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 10px rgba(0, 123, 255, 0.3);
        }
        
        &:focus {
          outline: 2px solid $primary-color;
          outline-offset: 2px;
        }
      }
      
      &.booked {
        background: $orange-500;
        color: $white;
        border: none;
        cursor: not-allowed;
      }
      
      &.unavailable {
        background: $red-500;
        color: $white;
        border: none;
        cursor: not-allowed;
      }
      
      &.back {
        background: $gray-600;
        color: $white;
        text-decoration: none;
        
        &:hover {
          background: $gray-700;
          transform: translateY(-2px);
          box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
        }
        
        &:focus {
          outline: 2px solid $gray-600;
          outline-offset: 2px;
        }
      }
      
      i {
        font-size: 1.2rem;
      }
    }
  }
}

.no-room {
  background: $white;
  border-radius: 20px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  padding: clamp(20px, 4vw, 30px);
  text-align: center;
  max-width: 500px;
  margin: clamp(40px, 6vw, 60px) auto;
  
  i {
    font-size: clamp(2rem, 5vw, 2.5rem);
    color: $gray-500;
    margin-bottom: clamp(10px, 2vw, 15px);
  }
  
  h3 {
    font-size: clamp(1.5rem, 3.5vw, 1.8rem);
    font-weight: 700;
    color: $dark-color;
    margin-bottom: clamp(10px, 2vw, 15px);
  }
  
  p {
    font-size: clamp(0.9rem, 2vw, 1rem);
    color: $gray-600;
    margin-bottom: clamp(15px, 3vw, 20px);
  }
  
  .cta-button {
    background: linear-gradient(45deg, $primary-color, $blue-700);
    color: $white;
    padding: clamp(10px, 2vw, 12px) clamp(20px, 4vw, 30px);
    border-radius: 25px;
    font-size: clamp(0.9rem, 2vw, 1rem);
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 10px rgba(0, 123, 255, 0.3);
    }
    
    &:focus {
      outline: 2px solid $primary-color;
      outline-offset: 2px;
    }
    
    i {
      font-size: 1.2rem;
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  .room-details-content {
    grid-template-columns: 1fr;
  }
  
  .image-gallery {
    .main-image-container {
      padding-bottom: 66.67%; /* 3:2 aspect ratio */
    }
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 clamp(0.5rem, 1.5vw, 0.75rem);
  }
  
  .section-title {
    margin-bottom: clamp(30px, 5vw, 40px);
    
    .title-wrapper {
      .main-title {
        font-size: clamp(1.8rem, 4.5vw, 2.2rem);
      }
      
      .section-description {
        font-size: clamp(0.8rem, 2vw, 0.9rem);
      }
    }
  }
  
  .room-details-wrapper {
    padding: clamp(15px, 3vw, 20px);
  }
  
  .room-info {
    .room-title {
      font-size: clamp(1.5rem, 3.5vw, 1.8rem);
    }
    
    .room-price {
      font-size: clamp(1.3rem, 3vw, 1.5rem);
    }
    
    .room-details-grid {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 480px) {
  .room-info {
    .room-header {
      gap: 10px;
    }
    
    .room-features {
      .features-grid {
        grid-template-columns: 1fr;
      }
    }
  }
}
</style>