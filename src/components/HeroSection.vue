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
        <div class="carousel-item" :class="{ active: isLoading }" v-if="isLoading">
          <div class="hero-slide loading-slide">
            <div class="carousel-container">
              <div class="hero-content">
                <div class="loading-animation">
                  <div class="spinner">
                    <div class="double-bounce1"></div>
                    <div class="double-bounce2"></div>
                  </div>
                </div>
                <p class="hero-subtitle animate-fade-in">Please wait while we load</p>
                <h1 class="hero-title animate-slide-up">
                  <span class="highlight">Amazing Properties</span>
                  <br>Coming Your Way
                </h1>
                <p class="hero-description animate-fade-in-delayed">
                  Discover your dream property with EagerSky Realty
                </p>
                <div class="loading-progress">
                  <div class="progress-bar"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div 
          class="carousel-item" 
          :class="{ active: !isLoading && index === 0 }" 
          v-for="(property, index) in sampleProperties" 
          :key="index"
        >
          <div 
            class="hero-slide" 
            :style="{ 
              '--bg-image-desktop': `url(${property.image})`, 
              '--bg-image-mobile': `url(${property.mobileImage || property.image})` 
            }"
          >
            <div class="carousel-container">
              <div class="hero-content">
                <p class="hero-subtitle animate-fade-in">{{ property.type }}</p>
                <h1 class="hero-title animate-slide-up">
                  <span class="highlight">{{ property.title }}</span>
                </h1>
                <p class="hero-description animate-fade-in-delayed">
                  {{ property.description }}
                </p>
                <div class="hero-actions animate-bounce-in">
                  <router-link :to="{ name: 'all-properties' }" class="btn btn-primary btn-get-started">
                    <i class="bi bi-search"></i>
                    Explore Properties
                  </router-link>
                  <router-link :to="{ name: 'contact' }" class="btn btn-outline-light btn-contact">
                    <i class="bi bi-telephone"></i>
                    Contact Us
                  </router-link>
                </div>
                <div class="hero-stats">
                  <div class="stat-item">
                    <span class="stat-number">{{ property.price }}</span>
                    <span class="stat-label">Starting Price</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-number">{{ property.bedrooms }}</span>
                    <span class="stat-label">Bedrooms</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-number">{{ property.location }}</span>
                    <span class="stat-label">Location</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button class="carousel-control-prev" type="button" data-bs-target="#hero-carousel" data-bs-slide="prev">
        <span class="carousel-control-prev-icon">
          <i class="bi bi-chevron-left"></i>
        </span>
        <span class="visually-hidden">Previous</span>
      </button>
      
      <button class="carousel-control-next" type="button" data-bs-target="#hero-carousel" data-bs-slide="next">
        <span class="carousel-control-next-icon">
          <i class="bi bi-chevron-right"></i>
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
        ></button>
      </div>
    </div>

    <div class="scroll-indicator">
      <div class="scroll-arrow">
        <i class="bi bi-chevron-down"></i>
      </div>
      <span>Scroll to explore</span>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import * as bootstrap from 'bootstrap';

// Type definition for Bootstrap Carousel
type BootstrapCarousel = {
  to(index: number): void;
  dispose(): void;
};

const isLoading = ref(true);
const currentSlide = ref(0);
let carouselInstance: BootstrapCarousel | null = null;

// Define the property interface for type safety
interface Property {
  image: string;
  mobileImage?: string;
  type: string;
  title: string;
  description: string;
  price: string;
  bedrooms: string;
  location: string;
}

// Sample properties data
const sampleProperties = ref<Property[]>([
  {
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    mobileImage: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=750&h=1334&q=80',
    type: 'Best Place',
    title: 'EagerSky Villa',
    description: 'Dear Customer, cozy home with big rooms with fordable price',
    price: 'TZS 50K',
    bedrooms: '4+',
    location: 'Morogoro'
  },
  {
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    mobileImage: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=750&h=1334&q=80',
    type: 'Family Home',
    title: 'Dream Family House',
    description: 'Perfect family home with spacious rooms and beautiful garden',
    price: '$280K',
    bedrooms: '3+',
    location: 'Mzumbe'
  },
  {
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    mobileImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=750&h=1334&q=80',
    type: 'Contemporary',
    title: 'Urban Elegance',
    description: 'Sleek contemporary design meets urban convenience',
    price: '$320K',
    bedrooms: '2+',
    location: 'City Center'
  }
]);

const totalSlides = computed(() => (isLoading.value ? 1 : sampleProperties.value.length));

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

const goToSlide = (index: number) => {
  if (carouselInstance) {
    carouselInstance.to(index);
    currentSlide.value = index;
  }
};

// Initialize Bootstrap Carousel
onMounted(() => {
  const carouselElement = document.getElementById('hero-carousel');
  if (carouselElement) {
    // Create carousel instance using any type to bypass TypeScript issues
    carouselInstance = new (bootstrap as any).Carousel(carouselElement, {
      interval: 5000,
      ride: 'carousel',
      pause: 'hover',
      wrap: true
    }) as BootstrapCarousel;

    // Update current slide on slide change
    carouselElement.addEventListener('slide.bs.carousel', (event) => {
      const bootstrapEvent = event as Event & { to: number };
      currentSlide.value = bootstrapEvent.to;
    });
  }

  // Simulate loading
  setTimeout(() => {
    isLoading.value = false;
    // Ensure first slide is active after loading
    if (carouselInstance) {
      carouselInstance.to(0);
      currentSlide.value = 0;
    }
  }, 3000);
});

onUnmounted(() => {
  if (carouselInstance) {
    carouselInstance.dispose();
    carouselInstance = null;
  }
});
</script>

<style lang="scss" scoped>
.hero {
  position: relative;
  min-height: 100vh;
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
    background: rgba(0, 0, 0, 0.4);
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
    max-width: clamp(600px, 80vw, 800px);
    padding: 0 clamp(15px, 5vw, 20px);
    margin: 0 auto;
  }
  
  .hero-content {
    color: white;
    background: rgba(0, 0, 0, 0.6);
    padding: clamp(20px, 5vw, 30px);
    border-radius: 15px;
    backdrop-filter: blur(5px);
    
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
          background-color: #007bff;
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
        background: linear-gradient(45deg, #007bff, #00d4ff);
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
    
    .hero-actions {
      display: flex;
      gap: clamp(0.8rem, 2vw, 1rem);
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: clamp(2rem, 5vw, 3rem);
      
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
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        &.btn-primary {
          background: linear-gradient(45deg, #007bff, #0056b3);
          border: none;
          color: white;
          
          &:hover {
            background: linear-gradient(45deg, #0056b3, #004085);
          }
        }
        
        &.btn-outline-light {
          border: 2px solid rgba(255, 255, 255, 0.8);
          color: white;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          
          &:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: white;
          }
        }
      }
    }
    
    .hero-stats {
      display: flex;
      justify-content: center;
      gap: clamp(1rem, 3vw, 2rem);
      flex-wrap: wrap;
      
      .stat-item {
        text-align: center;
        
        .stat-number {
          display: block;
          font-size: clamp(1.2rem, 3vw, 1.5rem);
          font-weight: 700;
          color: #007bff;
          margin-bottom: 0.25rem;
        }
        
        .stat-label {
          font-size: clamp(0.7rem, 2vw, 0.9rem);
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 1px;
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
        background: linear-gradient(90deg, #007bff, #00d4ff);
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
      
      i {
        font-size: clamp(1.2rem, 3vw, 1.5rem);
        color: white;
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
        background: white;
        border-color: white;
      }
    }
  }
  
  .scroll-indicator {
    position: absolute;
    bottom: clamp(15px, 4vw, 20px);
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    color: white;
    z-index: 10;
    opacity: 0.8;
    
    .scroll-arrow {
      margin-bottom: 5px;
      animation: bounce 2s infinite;
      
      i {
        font-size: clamp(1.2rem, 3vw, 1.5rem);
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
  0%, 100% { 
    transform: scale(0.0);
  } 50% { 
    transform: scale(1.0);
  }
}

@keyframes loading {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0%); }
  100% { transform: translateX(100%); }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(30px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounceIn {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// Responsive Design
@media (max-width: 768px) {
  .hero {
    .hero-slide {
      background-image: var(--bg-image-mobile);
    }

    .carousel-container {
      padding: 0 clamp(10px, 3vw, 15px);
    }
    
    .hero-content {
      padding: clamp(15px, 3vw, 20px);
      
      .hero-actions {
        flex-direction: column;
        align-items: center;
        
        .btn {
          width: clamp(180px, 50vw, 200px);
          justify-content: center;
          padding: clamp(8px, 2vw, 10px) clamp(15px, 4vw, 20px);
        }
      }
      
      .hero-stats {
        gap: clamp(0.8rem, 2vw, 1rem);
        flex-direction: column;
        
        .stat-item {
          .stat-number {
            font-size: clamp(1rem, 2.5vw, 1.2rem);
          }
          
          .stat-label {
            font-size: clamp(0.6rem, 1.8vw, 0.8rem);
          }
        }
      }
    }
    
    .carousel-control-prev,
    .carousel-control-next {
      width: clamp(35px, 8vw, 50px);
      height: clamp(35px, 8vw, 50px);
      
      i {
        font-size: clamp(1rem, 2.5vw, 1.2rem);
      }
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
    .carousel-container {
      padding: 0 clamp(8px, 2vw, 12px);
    }
    
    .hero-content {
      padding: clamp(12px, 2.5vw, 15px);
      
      .hero-title {
        font-size: clamp(1.8rem, 5vw, 2rem);
      }
      
      .hero-description {
        font-size: clamp(0.9rem, 2.5vw, 1.1rem);
      }
      
      .hero-subtitle {
        font-size: clamp(0.8rem, 2.2vw, 1rem);
      }
    }
  }
}
</style>