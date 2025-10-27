<template>
  <section id="hero" class="hero section">
    <div class="hero-background">
      <div class="hero-overlay"></div>
      <div class="hero-animation">
        <div class="floating-elements">
          <div class="floating-element" v-for="n in 6" :key="n" :style="getFloatingStyle(n)"></div>
        </div>
      </div>
    </div>
    
    <div id="hero-carousel" class="carousel slide" data-bs-ride="carousel" data-bs-interval="5000">
      <div class="carousel-inner">
        <div class="carousel-item" :class="{ active: isLoading || isDataLoading }" v-if="isLoading || isDataLoading">
          <div class="hero-slide loading-slide">
            <div class="carousel-container">
              <div class="hero-content">
                <div class="loading-animation">
                  <div class="spinner">
                    <div class="double-bounce1"></div>
                    <div class="double-bounce2"></div>
                  </div>
                </div>
                <p class="hero-subtitle animate-fade-in">Finding your perfect match</p>
                <h1 class="hero-title animate-slide-up">
                  <span class="highlight">EagerSky Realty</span>
                  <br>Your Dream Home Awaits
                </h1>
                <p class="hero-description animate-fade-in-delayed">
                  Discover curated properties with ease and confidence.
                </p>
                <div class="loading-progress">
                  <div class="progress-bar"></div>
                </div>
                <div class="hero-filter-bar loading-bar animate-slide-up"></div>
              </div>
            </div>
          </div>
        </div>

        <div 
          class="carousel-item" 
          :class="{ active: !isLoading && !isDataLoading && index === 0 }" 
          v-for="(property, index) in sampleProperties" 
          :key="index"
        >
          <div 
            class="hero-slide" 
            :style="{ 
              '--bg-image-desktop': `url(${property.image})`, 
              '--bg-image-mobile': `url(${property.mobileImage || property.image})` 
            }"
            @click="goToNextSlide"
            style="cursor: pointer;"
          >
            <div class="carousel-container">
              <div class="hero-content image-only-content">
                
                <div class="hero-filter-bar animate-bounce-in">
                  
                  <div class="filter-group grok-search-group">
                    <label for="hero-grok-search" class="filter-label">Search</label>
                    <input 
                      id="hero-grok-search" 
                      type="text" 
                      v-model="filters.grokSearch" 
                      class="filter-input" 
                      placeholder="e.g., street, area, zip..."
                      aria-label="Search items by keyword" 
                      :disabled="isDataLoading"
                    >
                  </div>
                  
                  <div class="filter-group category-filter">
                    <label for="hero-category" class="filter-label">Category</label>
                    <select id="hero-category" v-model="filters.category" class="filter-select" aria-label="Select property category" :disabled="isDataLoading">
                      <option value="">Any Category</option>
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </select>
                  </div>
                  
                  <div class="filter-group location-filter">
                    <label for="hero-location" class="filter-label">Location</label>
                    <select id="hero-location" v-model="filters.location" class="filter-select" aria-label="Select property location" :disabled="isDataLoading">
                      <option value="">Any Location</option>
                      <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
                    </select>
                  </div>
                  
                  <div class="filter-group search-button-group">
                    <button class="btn btn-primary btn-search-hero p-4" @click.stop="applyFilters" aria-label="Search properties" :disabled="isDataLoading">
                      Explore
                    </button>
                  </div>
                </div>
                
                 <div class="hero-actions animate-bounce-in-delayed">
                   <router-link :to="{ name: 'contact' }" class="btn btn-outline-light btn-contact">
                     <i data-feather="phone"></i>
                     Contact Us
                   </router-link>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button class="carousel-control-prev" type="button" data-bs-target="#hero-carousel" data-bs-slide="prev" :disabled="isLoading || isDataLoading">
        <span class="carousel-control-prev-icon">
          <i data-feather="chevron-left"></i>
        </span>
        <span class="visually-hidden">Previous</span>
      </button>
      
      <button class="carousel-control-next" type="button" data-bs-target="#hero-carousel" data-bs-slide="next" :disabled="isLoading || isDataLoading">
        <span class="carousel-control-next-icon">
          <i data-feather="chevron-right"></i>
        </span>
        <span class="visually-hidden">Next</span>
      </button>

      <div class="carousel-indicators-custom">
        <button 
          v-for="(item, index) in totalSlides" 
          :key="index"
          type="button"
          :data-bs-target="'#hero-carousel'"
          :data-bs-slide-to="index"
          :class="{ active: currentSlide === index }"
          :aria-current="currentSlide === index ? 'true' : 'false'"
          @click="goToSlide(index)"
          :disabled="isLoading || isDataLoading"
        ></button>
      </div>
    </div>

    <div class="scroll-indicator">
      <div class="scroll-arrow">
        <i data-feather="chevron-down"></i>
      </div>
      <span>Scroll to explore</span>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'; 
import * as bootstrap from 'bootstrap';
import { useRouter } from 'vue-router';
import makeRequest from '../services/makeRequest'; 
// Assuming a global 'feather' function is available or imported separately
declare const feather: any;

// --- TYPES ---
type BootstrapCarousel = {
  to(index: number): void;
  dispose(): void;
};

interface Property {
  image: string;
  mobileImage?: string;
}

interface Location {
  id: number | string;
  name: string;
}

interface Category {
  id: number | string;
  name: string;
}

interface Filters {
  location: number | string;
  category: number | string;
  grokSearch: string; 
}

// --- STATE ---
const router = useRouter();
const isLoading = ref(true); 
const isDataLoading = ref(true); 
const currentSlide = ref(0);
let carouselInstance: BootstrapCarousel | null = null;

// Filter State and Data
const filters = ref<Filters>({
  location: '',
  category: '',
  grokSearch: ''
});

const locations = ref<Location[]>([]);
const categories = ref<Category[]>([]);

// Sample properties data
const sampleProperties = ref<Property[]>([
  { image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920', mobileImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=750&h=1334' },
  { image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920', mobileImage: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=750&h=1334' },
  { image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920', mobileImage: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=750&h=1334' },
  { image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3825e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920', mobileImage: 'https://images.unsplash.com/photo-1580587771525-78b9dba3825e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=750&h=1334' },
  { image: 'https://images.unsplash.com/photo-1494526585095-c4174638a2dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920', mobileImage: 'https://images.unsplash.com/photo-1494526585095-c4174638a2dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=750&h=1334' },
  { image: 'https://images.unsplash.com/photo-1554995207-c18c694d6e98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920', mobileImage: 'https://images.unsplash.com/photo-1554995207-c18c694d6e98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=750&h=1334' }
]);

const totalSlides = computed(() => (isLoading.value || isDataLoading.value ? 1 : sampleProperties.value.length));

// --- API FETCHING (Unchanged) ---
const fetchLocations = async () => {
  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/locations`,
      requiresAuth: false
    });

    if (response.data && Array.isArray(response.data.data)) {
      locations.value = response.data.data.map((loc: any) => ({
        id: loc.id,
        name: loc.name || 'Unknown Location'
      }));
    } else {
      locations.value = [];
    }
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    locations.value = [];
  }
};

const fetchCategories = async () => {
  try {
    const response = await makeRequest({
      method: 'GET',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/property-categories`,
      requiresAuth: false
    });

    if (response.data && Array.isArray(response.data.data)) {
      categories.value = response.data.data.map((cat: any) => ({
        id: cat.id,
        name: cat.name || 'Unknown Category'
      }));
    } else {
      categories.value = [];
    }
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    categories.value = [];
  }
};

const fetchApiData = async () => {
  isDataLoading.value = true;
  await Promise.all([fetchLocations(), fetchCategories()]);
  isDataLoading.value = false;
};

// --- METHODS ---
const getFloatingStyle = (n: number) => {
  const positions = [
    { top: '20%', left: '10%', animationDelay: '0s' },
    { top: '60%', left: '15%', animationDelay: '2s' },
    { top: '30%', right: '20%', animationDelay: '1s' },
    { top: '70%', right: '10%', animationDelay: '3s' },
    { top: '40%', left: '50%', animationDelay: '1.5s' },
    { top: '80%', left: '40%', animationDelay: '2.5s' }
  ];
  return positions[n - 1] || {};
};

const goToNextSlide = () => {
  if (carouselInstance && !isLoading.value && !isDataLoading.value) {
    const carouselElement = document.getElementById('hero-carousel');
    if (carouselElement) {
      (bootstrap as any).Carousel.getInstance(carouselElement)?.next();
    }
  }
};

const goToSlide = (index: number) => {
  if (carouselInstance && !isLoading.value && !isDataLoading.value) {
    carouselInstance.to(index);
    currentSlide.value = index;
  }
};

const applyFilters = () => {
  if (isDataLoading.value) return;

  const query: Record<string, string | number> = {};
  
  if (filters.value.grokSearch) query.search = filters.value.grokSearch;
  if (filters.value.category) query.category = filters.value.category;
  if (filters.value.location) query.location = filters.value.location;

  router.push({ name: 'all-properties', query });
};

// --- FIX: WATCH FOR LOADING COMPLETE (Unchanged) ---
watch([isLoading, isDataLoading], ([newLoading, newDataLoading]) => {
  if (!newLoading && !newDataLoading) {
    if (sampleProperties.value.length > 0) {
      setTimeout(() => {
        const carouselElement = document.getElementById('hero-carousel');
        if (carouselElement) {
            const currentCarousel = (bootstrap as any).Carousel.getInstance(carouselElement);
            if (currentCarousel) {
                currentCarousel.to(0); 
                currentSlide.value = 0;
            }
        }
      }, 50); 
    }
  }
});

// --- LIFECYCLE HOOKS (Modified to include Feather Icons rendering) ---
onMounted(async () => {
  // 1. Initialize Carousel First
  const carouselElement = document.getElementById('hero-carousel');
  if (carouselElement) {
    carouselInstance = new (bootstrap as any).Carousel(carouselElement, {
      interval: 5000,
      ride: 'carousel',
      pause: 'hover',
      wrap: true
    }) as BootstrapCarousel;

    carouselElement.addEventListener('slide.bs.carousel', (event) => {
      const bootstrapEvent = event as Event & { to: number };
      currentSlide.value = bootstrapEvent.to;
    });
  }

  // 2. Fetch data from APIs
  await fetchApiData();

  // 3. Mark initial component loading complete
  setTimeout(() => {
    isLoading.value = false;
    
    // 💡 NEW: Render Feather Icons AFTER the DOM has updated
    // This is crucial for Feather Icons to turn the <i> tags into SVGs
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
  }, 500); 
});

onUnmounted(() => {
  if (carouselInstance) {
    carouselInstance.dispose();
    carouselInstance = null;
  }
});
</script>

<style lang="scss" scoped>
/* Color Variables (aligned with all-listings) */
$primary-color: #007bff;
$accent-color: #f4a261;
$dark-color: #2c3e50;
$white: #ffffff;
$secondary-color: #6c757d;
$light-color: #e9ecef;

.hero {
  position: relative;
  min-height: 60vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  
  .hero-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    z-index: 1;
  }
  
  .hero-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 2;
  }
  
  .hero-animation {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
    
    .floating-elements {
      position: relative;
      width: 100%;
      height: 100%;
      
      .floating-element {
        position: absolute;
        width: clamp(40px, 8vw, 60px);
        height: clamp(40px, 8vw, 60px);
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        backdrop-filter: blur(10px);
        animation: float 6s ease-in-out infinite;
        
        &:nth-child(odd) {
          animation-direction: reverse;
        }
        
        &:nth-child(3n) {
          width: clamp(30px, 6vw, 40px);
          height: clamp(30px, 6vw, 40px);
          background: rgba(0, 123, 255, 0.2);
        }
      }
    }
  }
  
  .carousel {
    position: relative;
    width: 100%;
    height: 100vh;
    z-index: 3;
  }
  
  .carousel-inner {
    height: 100%;
  }
  
  .carousel-item {
    height: 100%;
    transition: transform 0.6s ease-in-out;
  }
  
  .hero-slide {
    position: relative;
    width: 100%;
    height: 100%;
    background-image: var(--bg-image-desktop);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &.loading-slide {
      background: linear-gradient(135deg, #1a2b49 0%, #0f1a2e 100%);
    }
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 1;
    }
  }
  
  .carousel-container {
    position: relative;
    z-index: 2;
    text-align: center;
    max-width: clamp(600px, 90vw, 1200px);
    padding: 0 clamp(15px, 5vw, 20px);
    margin: 0 auto;
  }
  
  .hero-content {
    color: $white;
    padding: clamp(20px, 5vw, 30px);
    border-radius: 15px;
    
    &.image-only-content {
      background: none;
      backdrop-filter: none;
      padding: 0;
    }

    .loading-animation {
      margin-bottom: clamp(1.5rem, 4vw, 2rem);
      
      .spinner {
        width: clamp(60px, 15vw, 80px);
        height: clamp(60px, 15vw, 80px);
        position: relative;
        margin: 0 auto clamp(0.8rem, 2vw, 1rem);
        
        .double-bounce1, .double-bounce2 {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: $primary-color;
          opacity: 0.6;
          position: absolute;
          top: 0;
          left: 0;
          animation: sk-bounce 2.0s infinite ease-in-out;
        }
        
        .double-bounce2 {
          animation-delay: -1.0s;
        }
      }
    }
    
    .hero-subtitle {
      font-size: clamp(1rem, 3vw, 1.2rem);
      margin-bottom: clamp(0.8rem, 2vw, 1rem);
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 300;
    }
    
    .hero-title {
      font-size: clamp(2rem, 6vw, 4rem);
      font-weight: 700;
      margin-bottom: clamp(1rem, 3vw, 1.5rem);
      line-height: 1.2;
      
      .highlight {
        background: linear-gradient(45deg, $primary-color, #00d4ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }
    
    .hero-description {
      font-size: clamp(1rem, 3vw, 1.3rem);
      margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
      opacity: 0.9;
      line-height: 1.6;
      max-width: clamp(400px, 60vw, 600px);
      margin-left: auto;
      margin-right: auto;
    }
    
    /* MODIFIED: Filter Bar Styles for wider and shorter look */
    .hero-filter-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 50px;
      padding: 8px; /* Reduced vertical padding for shorter height */
      margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      max-width: 1200px; /* Increased max width for wider look */
      width: 100%;
      color: $dark-color;

      &.loading-bar {
        height: 60px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        box-shadow: none;
        animation: pulse 1.5s infinite alternate;
      }

      .filter-group {
        padding: 0; /* Removed default padding */
        border-right: 1px solid $light-color;
        flex: 1; 
        
        /* Grok search input gets more space */
        &.grok-search-group {
            flex: 2; /* Give grok search twice the space */
            padding: 0 clamp(10px, 2vw, 15px);
        }
        
        /* Category and Location groups get smaller fixed space on desktop */
        &.category-filter, &.location-filter {
            flex: 0 0 200px;
            min-width: 0;
            padding: 0 clamp(10px, 2vw, 15px);
        }
        
        &:last-child {
          border-right: none;
        }

        .filter-label {
          display: block;
          font-size: clamp(0.8rem, 2vw, 0.9rem);
          font-weight: 600;
          color: $secondary-color;
          margin-bottom: 3px; /* Slightly reduced margin */
          text-align: left;
        }
        
        /* Style for the text input */
        .filter-input {
            width: 100%;
            padding: 5px 0; /* Reduced vertical padding */
            border: none;
            background: transparent;
            font-size: clamp(0.9rem, 2vw, 1rem);
            font-weight: 500;
            color: $dark-color;
            
            &:focus {
                outline: none;
            }
            &::placeholder {
                color: $secondary-color;
                opacity: 0.7;
            }
        }

        .filter-select {
          width: 100%;
          padding: 5px 0; /* Reduced vertical padding */
          border: none;
          background: transparent;
          font-size: clamp(0.9rem, 2vw, 1rem);
          font-weight: 500;
          cursor: pointer;
          color: $dark-color;
          appearance: none;
          /* Default dropdown arrow for consistency */
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23333' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.5rem center;
          background-size: 10px;
          
          &:focus {
            outline: none;
          }
        }
      }
      
      /* Search button group (icon-only, square look) */
      .search-button-group {
        flex: 0 0 auto;
        padding: 0;
        border-right: none; 
        
        .btn-search-hero {
          background: linear-gradient(45deg, $primary-color, #667eea);
          border: none;
          color: $white;
          /* Adjusted padding for a compact icon-only button */
          padding: clamp(10px, 2vw, 14px) clamp(15px, 3vw, 18px); 
          border-radius: 50px; /* Circular look */
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 10px rgba(0, 123, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          width: clamp(40px, 8vw, 50px);
          height: clamp(40px, 8vw, 50px);
          
          /* Style for the icon inside the button */
          i, svg {
            width: clamp(1.2rem, 2.5vw, 1.4rem);
            height: clamp(1.2rem, 2.5vw, 1.4rem);
            stroke: $white;
            stroke-width: 2.5; /* Feather Icons use stroke for styling */
            margin: 0;
          }
          
          &:hover {
            background: linear-gradient(45deg, darken($primary-color, 10%), darken(#667eea, 10%));
            transform: translateY(0);
          }
        }
      }
    }
    
    .hero-actions {
      display: flex;
      gap: clamp(0.8rem, 2vw, 1rem);
      justify-content: center;
      flex-wrap: wrap;
      margin-top: clamp(1rem, 2vw, 1.5rem);
      
      .btn {
        padding: clamp(10px, 2.5vw, 12px) clamp(20px, 5vw, 30px);
        font-size: clamp(0.9rem, 2.5vw, 1.1rem);
        font-weight: 600;
        border-radius: 50px;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        
        i, svg {
          width: clamp(1rem, 2.5vw, 1.1rem);
          height: clamp(1rem, 2.5vw, 1.1rem);
          stroke: $white;
          stroke-width: 2.5;
        }
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        &.btn-outline-light {
          border: 2px solid rgba(255, 255, 255, 0.8);
          color: $white;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          
          &:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: $white;
          }
        }
      }
    }
    
    .loading-progress {
      margin-top: clamp(1.5rem, 4vw, 2rem);
      width: clamp(150px, 40vw, 200px);
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
      margin-left: auto;
      margin-right: auto;
      
      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, $primary-color, #00d4ff);
        border-radius: 2px;
        animation: loading 2s ease-in-out infinite;
      }
    }
  }
  
  .carousel-control-prev,
  .carousel-control-next {
    width: clamp(40px, 10vw, 60px);
    height: clamp(40px, 10vw, 60px);
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 50%;
    border: none;
    top: 50%;
    transform: translateY(-50%);
    transition: all 0.3s ease;
    z-index: 10;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-50%) scale(1.1);
    }
    
    .carousel-control-prev-icon,
    .carousel-control-next-icon {
      background: none;
      
      i, svg {
        width: clamp(1.5rem, 3vw, 1.8rem);
        height: clamp(1.5rem, 3vw, 1.8rem);
        stroke: $white;
        stroke-width: 2.5;
        margin: 0;
      }
    }
  }
  
  .carousel-control-prev {
    left: clamp(10px, 3vw, 30px);
  }
  
  .carousel-control-next {
    right: clamp(10px, 3vw, 30px);
  }
  
  .carousel-indicators-custom {
    position: absolute;
    bottom: clamp(20px, 5vw, 30px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    z-index: 10;
    
    button {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.5);
      background: transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: rgba(255, 255, 255, 0.8);
        transform: scale(1.2);
      }
      
      &.active {
        background: $white;
        border-color: $white;
      }
    }
  }
  
  .scroll-indicator {
    position: absolute;
    bottom: clamp(15px, 4vw, 20px);
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    color: $white;
    z-index: 10;
    opacity: 0.8;
    
    .scroll-arrow {
      margin-bottom: 5px;
      animation: bounce 2s infinite;
      
      i, svg {
        width: clamp(1.5rem, 3vw, 1.8rem);
        height: clamp(1.5rem, 3vw, 1.8rem);
        stroke: $white;
        stroke-width: 2;
        margin: 0;
      }
    }
    
    span {
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }
  }
}

// Animations 
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(120deg); }
  66% { transform: translateY(-10px) rotate(240deg); }
}

@keyframes sk-bounce {
  0%, 100% { transform: scale(0.0); }
  50% { transform: scale(1.0); }
}

@keyframes loading {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0%); }
  100% { transform: translateX(100%); }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

@keyframes bounceInDelayed {
  0%, 60% { opacity: 0; transform: scale(0.3); }
  75% { opacity: 1; transform: scale(1.05); }
  85% { transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes pulse {
  0% { opacity: 0.5; }
  100% { opacity: 0.8; }
}

.animate-bounce-in-delayed {
  animation: bounceInDelayed 1.5s ease-out forwards;
}

// Responsive Design
@media (max-width: 992px) {
  .hero {
    .hero-filter-bar {
      max-width: clamp(400px, 90vw, 800px); 
      padding: clamp(8px, 2vw, 12px);
      
      .filter-group {
        padding: 0 clamp(8px, 1.5vw, 12px);
        
        &.grok-search-group {
            flex: 2;
        }

        &.category-filter, &.location-filter {
            flex: 1;
            min-width: 0;
            padding: 0 clamp(8px, 1.5vw, 12px);
        }
        
        .filter-select, .filter-input {
          font-size: clamp(0.85rem, 1.8vw, 0.95rem);
        }
      }
      
      .search-button-group {
        padding: 0;
        
        .btn-search-hero {
          width: clamp(35px, 7vw, 45px);
          height: clamp(35px, 7vw, 45px);
          padding: clamp(8px, 1.5vw, 10px); 
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .hero {
    min-height: 80vh;
    
    .hero-slide {
      background-image: var(--bg-image-mobile);
    }

    .carousel-container {
      padding: 0 clamp(10px, 3vw, 15px);
    }

    .hero-content {
      padding: clamp(15px, 3vw, 20px);

      &.image-only-content {
        padding: 0;
      }

      .hero-filter-bar {
        flex-direction: column;
        align-items: stretch;
        max-width: 100%;
        border-radius: 15px;
        padding: clamp(15px, 3vw, 20px);

        .filter-group {
          padding: clamp(8px, 2vw, 12px) 0;
          border-right: none;
          border-bottom: 1px solid $light-color;
          flex: 1 !important; 

          &.grok-search-group, &.category-filter, &.location-filter {
            flex: 1 !important; 
            padding: clamp(8px, 2vw, 12px) 0;
          }

          &:last-child {
            border-bottom: none;
          }

          .filter-label {
            font-size: clamp(0.85rem, 2vw, 0.95rem);
          }

          .filter-select, .filter-input {
            font-size: clamp(0.85rem, 2vw, 0.95rem);
            padding: clamp(8px, 2vw, 10px) 0;
          }
        }

        .search-button-group {
          padding: clamp(10px, 2vw, 15px) 0 0 0;

          .btn-search-hero {
            width: 100%;
            height: auto;
            border-radius: 8px;
            justify-content: center;
            padding: clamp(10px, 2vw, 12px);
            font-size: clamp(0.9rem, 2vw, 1rem);
            gap: 8px;
          }
        }
      }

      .hero-actions {
        flex-direction: column;
        align-items: center;

        .btn {
          width: clamp(180px, 50vw, 200px);
          justify-content: center;
          padding: clamp(8px, 2vw, 10px) clamp(15px, 4vw, 20px);
          font-size: clamp(0.85rem, 2vw, 0.95rem);
        }
      }
    }

    .carousel-control-prev,
    .carousel-control-next {
      width: clamp(35px, 8vw, 50px);
      height: clamp(35px, 8vw, 50px);
    }

    .carousel-control-prev {
      left: clamp(8px, 2vw, 15px);
    }

    .carousel-control-next {
      right: clamp(8px, 2vw, 15px);
    }

    .carousel-indicators-custom {
      bottom: clamp(15px, 4vw, 20px);

      button {
        width: 10px;
        height: 10px;
      }
    }

    .scroll-indicator {
      bottom: clamp(10px, 3vw, 15px);
    }
  }
}

@media (max-width: 480px) {
  .hero {
    min-height: 100vh;

    .carousel-container {
      padding: 0 clamp(8px, 2vw, 12px);
    }

    .hero-content {
      .hero-title {
        font-size: clamp(1.8rem, 5vw, 3rem);
      }

      .hero-description {
        font-size: clamp(0.9rem, 2.5vw, 1.1rem);
      }

      .hero-filter-bar {
        padding: clamp(10px, 2.5vw, 15px);

        .filter-group {
          .filter-label {
            font-size: clamp(0.8rem, 2vw, 0.9rem);
          }

          .filter-select, .filter-input {
            font-size: clamp(0.8rem, 2vw, 0.9rem);
          }
        }
      }
    }
  }
}
</style>