<template>
  <section id="testimonials" class="testimonials section">
    <div class="container">
      <!-- Enhanced Section Title -->
      <div class="section-title text-center" data-aos="fade-up">
        <div class="title-wrapper">
          <span class="subtitle-badge">Client Stories</span>
          <h2 class="main-title">What Our Clients Say</h2>
          <div class="title-underline"></div>
          <p class="section-description">
            Hear from our satisfied clients about their experiences with EagerSky.
            Their trust and satisfaction drive us to deliver excellence every day.
          </p>
        </div>
      </div>

      <!-- Testimonials Carousel -->
      <div class="testimonials-carousel" data-aos="fade-up" data-aos-delay="200">
        <div class="carousel-container">
          <div 
            class="testimonials-track" 
            :style="carouselTransformStyle"
          >
            <div 
              class="testimonial-slide"
              v-for="(testimonial, index) in testimonials" 
              :key="testimonial.id"
              :class="{ 
                'center-slide': isDesktop && Math.abs(index - currentSlide) === 1,
                'side-slide': isDesktop && (Math.abs(index - currentSlide) === 0 || Math.abs(index - currentSlide) === 2)
              }"
            >
              <div class="testimonial-card" @mouseenter="handleCardHover" @mouseleave="handleCardLeave">
                <!-- Background Pattern -->
                <div class="card-background">
                  <div class="pattern-dots"></div>
                  <div class="gradient-overlay"></div>
                </div>

                <!-- Quote Icon -->
                <div class="quote-icon">
                  <div class="icon-background"></div>
                  <i class="bi bi-quote"></i>
                  <div class="icon-glow"></div>
                </div>

                <!-- Star Rating -->
                <div class="star-rating">
                  <div class="stars-container">
                    <span 
                      v-for="star in 5" 
                      :key="star" 
                      class="star"
                      :class="{ filled: star <= testimonial.rating }"
                    >
                      <i class="bi bi-star-fill"></i>
                    </span>
                  </div>
                  <span class="rating-text">{{ testimonial.rating }}.0 / 5.0</span>
                </div>

                <!-- Testimonial Content -->
                <div class="testimonial-content">
                  <p class="testimonial-text">{{ testimonial.text }}</p>
                </div>

                <!-- Client Profile -->
                <div class="client-profile">
                  <div class="profile-image-container">
                    <img 
                      :src="testimonial.image" 
                      :alt="testimonial.name"
                      class="profile-image"
                    >
                    <div class="image-border"></div>
                  </div>
                  <div class="profile-info">
                    <h3 class="client-name">{{ testimonial.name }}</h3>
                    <p class="client-title">{{ testimonial.title }}</p>
                    <p class="client-location">{{ testimonial.location }}</p>
                  </div>
                </div>

                <!-- Service Badge -->
                <div class="service-badge">
                  <i :class="testimonial.serviceIcon"></i>
                  <span>{{ testimonial.service }}</span>
                </div>

                <!-- Hover Effects -->
                <div class="hover-effects">
                  <div class="sparkle sparkle-1">✨</div>
                  <div class="sparkle sparkle-2">⭐</div>
                  <div class="sparkle sparkle-3">💫</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Controls -->
        <div class="carousel-controls">
          <button 
            class="nav-btn prev-btn" 
            @click="prevSlide"
            :disabled="currentSlide === 0"
          >
            <i class="bi bi-chevron-left"></i>
          </button>
          
          <div class="pagination-dots">
            <button
              v-for="(testimonial, index) in testimonials"
              :key="index"
              class="dot"
              :class="{ active: currentSlide === index }"
              @click="goToSlide(index)"
            ></button>
          </div>
          
          <button 
            class="nav-btn next-btn" 
            @click="nextSlide"
            :disabled="currentSlide >= testimonials.length - (isDesktop ? 3 : 1)"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- Statistics Section -->
      <div class="testimonials-stats" data-aos="fade-up" data-aos-delay="400">
        <div class="stats-grid">
          <div class="stat-item" v-for="(stat, index) in stats" :key="index" :data-aos-delay="100 * (index + 1)">
            <div class="stat-number">{{ stat.number }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>

      <!-- Call to Action -->
      <div class="testimonials-cta text-center" data-aos="fade-up" data-aos-delay="600">
        <h3>Ready to Join Our Happy Clients?</h3>
        <p>Experience the EagerSky difference and let us help you find your perfect property.</p>
        <div class="cta-buttons">
         <router-link to="/all-properties" class="cta-button primary">
            <span>Start Your Journey</span>
            <i class="bi bi-arrow-right"></i>
         </router-link>
          <router-link to="/all-properties" class="cta-button primary">
            <span>View Properties</span>
            <i class="bi bi-house"></i>
          </router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

interface Testimonial {
  id: number;
  name: string;
  title: string;
  location: string;
  text: string;
  rating: number;
  image: string;
  service: string;
  serviceIcon: string;
}

interface Statistic {
  number: string;
  label: string;
}

// Reactive data
const currentSlide = ref(0);
const isDesktop = ref(window.innerWidth > 768);
let autoSlideInterval: number | null = null;

const testimonials = ref<Testimonial[]>([
  {
    id: 1,
    name: "James Mwangi",
    title: "Mwanafunzi wa Shahada ya Uzamili",
    location: "Mzumbe University",
    text: "EagerSky ilitoa huduma ya kipekee katika kunisaidia kupata nyumba yangu mpya huko Mzumbe. Timu yao ilikuwa ya kitaalamu, makini, na ilifanya mchakato mzima kuwa rahisi. Sijawahi kufurahi zaidi na mahali pangu papya!",
    rating: 5,
    image: "/testimony/test1.jpeg", 
    service: "Uajiri wa Nyumba",
    serviceIcon: "bi bi-house-heart"
  },
  {
    id: 2,
    name: "Amina Juma",
    title: "Mjasiriamali",
    location: "Dar es Salaam",
    text: "Huduma zao ni bora sana. Walinisaidia kupata nyumba nzuri kwa bei nafuu. Nimefurahishwa sana na jinsi walivyonihudumia.",
    rating: 5,
    image: "/testimony/test3.jpeg", 
    service: "Uajiri wa Nyumba",
    serviceIcon: "bi bi-house-door"
  },
  {
    id: 3,
    name: "John Mwakalinga",
    title: "Mwanafunzi",
    location: "Morogoro",
    text: "EagerSky imenisaidia kupata chumba karibu na chuo. Huduma ni ya haraka na rahisi kuelewa. Nawashukuru sana kwa msaada wao.",
    rating: 4,
    image: "/testimony/test2.jpeg", // Corrected to a valid URL string
    service: "Kupanga Chumba",
    serviceIcon: "bi bi-building"
  }
]);

const stats = ref<Statistic[]>([
  { number: "200+", label: "Happy Clients" },
  { number: "4.9", label: "Average Rating" },
  { number: "99.9%", label: "Satisfaction Rate" },
  { number: "2", label: "Years Experience" }
]);

// Computed properties
const carouselTransformStyle = computed(() => {
  const slideWidth = isDesktop.value ? 100 / 3 : 100;
  return { transform: `translateX(-${currentSlide.value * slideWidth}%)` };
});

// Methods
const updateIsDesktop = () => {
  isDesktop.value = window.innerWidth > 768;
};

const nextSlide = () => {
  const maxSlides = isDesktop.value ? testimonials.value.length - 3 : testimonials.value.length - 1;
  currentSlide.value = currentSlide.value < maxSlides ? currentSlide.value + 1 : 0;
};

const prevSlide = () => {
  const maxSlides = isDesktop.value ? testimonials.value.length - 3 : testimonials.value.length - 1;
  currentSlide.value = currentSlide.value > 0 ? currentSlide.value - 1 : maxSlides;
};

const goToSlide = (index: number) => {
  const maxSlides = isDesktop.value ? testimonials.value.length - 3 : testimonials.value.length - 1;
  if (index <= maxSlides) {
    currentSlide.value = index;
  }
};

const handleCardHover = (event: Event) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = card.parentElement?.classList.contains('center-slide') 
    ? 'translateY(-20px) scale(1.1)' 
    : 'translateY(-15px) scale(1.02)';
};

const handleCardLeave = (event: Event) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = card.parentElement?.classList.contains('center-slide') 
    ? 'scale(1.05)' 
    : 'scale(0.9)';
};

const startAutoSlide = () => {
  stopAutoSlide(); // Clear any existing interval
  autoSlideInterval = window.setInterval(() => {
    nextSlide();
  }, 5000);
};

const stopAutoSlide = () => {
  if (autoSlideInterval !== null) {
    clearInterval(autoSlideInterval);
    autoSlideInterval = null;
  }
};

// Lifecycle hooks
onMounted(() => {
  startAutoSlide();
  window.addEventListener('resize', updateIsDesktop);
  
  // Animate cards in
  const cards = document.querySelectorAll('.testimonial-card');
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.add('animate-in');
    }, index * 150);
  });
});

onUnmounted(() => {
  stopAutoSlide();
  window.removeEventListener('resize', updateIsDesktop);
});
</script>

<style lang="scss" scoped>
// Color Variables
$primary-color: #007bff;
$secondary-color: #6c757d;
$success-color: #28a745;
$warning-color: #ffc107;
$light-color: #f8f9fa;
$dark-color: #212529;
$white: #ffffff;

// Section Styling
.testimonials.section {
  padding: 100px 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="1" fill="%23007bff" opacity="0.1"/></svg>') repeat;
    background-size: 50px 50px;
    z-index: 1;
  }

  .container {
    position: relative;
    z-index: 2;
    max-width: 1200px;
    width: 90%;
    margin: 0 auto;
    padding: 0 15px;
  }
}

// Enhanced Section Title
.section-title {
  margin-bottom: 80px;
  
  .title-wrapper {
    max-width: 800px;
    margin: 0 auto;
    
    .subtitle-badge {
      display: inline-block;
      background: linear-gradient(45deg, $primary-color, #667eea);
      color: white;
      padding: 8px 24px;
      border-radius: 25px;
      font-size: clamp(0.8rem, 2.5vw, 0.9rem);
      font-weight: 600;
      margin-bottom: 20px;
      box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
    }
    
    .main-title {
      font-size: clamp(2.5rem, 5vw, 3.5rem);
      font-weight: 800;
      background: linear-gradient(45deg, $dark-color, $primary-color);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 20px;
      line-height: 1.2;
    }
    
    .title-underline {
      width: 100px;
      height: 4px;
      background: linear-gradient(45deg, $primary-color, #667eea);
      margin: 0 auto 30px;
      border-radius: 2px;
    }
    
    .section-description {
      font-size: clamp(1rem, 3vw, 1.2rem);
      color: $secondary-color;
      line-height: 1.8;
      margin: 0;
    }
  }
}

// Testimonials Carousel
.testimonials-carousel {
  margin-bottom: 80px;
  
  .carousel-container {
    position: relative;
    overflow: hidden;
    border-radius: 20px;
  }
  
  .testimonials-track {
    display: flex;
    transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    width: 100%;
  }
  
  .testimonial-slide {
    min-width: calc(100% / 3);
    padding: 0 15px;
    display: flex;
    justify-content: center;
    transition: all 0.3s ease;
    
    &.center-slide {
      .testimonial-card {
        transform: scale(1.05);
        z-index: 3;
        opacity: 1;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
      }
    }
    
    &.side-slide {
      .testimonial-card {
        transform: scale(0.9);
        opacity: 0.7;
        z-index: 2;
      }
    }
  }
}

// Testimonial Card
.testimonial-card {
  background: $white;
  border-radius: 20px;
  padding: 40px 30px;
  position: relative;
  min-height: 500px;
  max-width: 400px;
  width: 100%;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  opacity: 0;
  transform: translateY(50px);
  
  &.animate-in {
    opacity: 1;
    transform: translateY(0);
  }
  
  &:hover {
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
    
    .quote-icon {
      .icon-background {
        transform: scale(1.2);
        background: linear-gradient(45deg, $primary-color, #667eea);
      }
      
      i {
        transform: scale(1.1) rotate(5deg);
        color: $white;
      }
      
      .icon-glow {
        opacity: 1;
        transform: scale(1.5);
      }
    }
    
    .card-background {
      .gradient-overlay {
        opacity: 0.1;
      }
      
      .pattern-dots {
        opacity: 1;
        transform: scale(1.1);
      }
    }
    
    .hover-effects {
      .sparkle {
        opacity: 1;
        animation-play-state: running;
      }
    }
  }
}

// Card Background
.card-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  
  .pattern-dots {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 2px 2px, rgba(0, 123, 255, 0.1) 1px, transparent 0);
    background-size: 20px 20px;
    opacity: 0;
    transition: all 0.4s ease;
  }
  
  .gradient-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(0, 123, 255, 0.02), rgba(102, 126, 234, 0.02));
    opacity: 0;
    transition: opacity 0.4s ease;
  }
}

// Quote Icon
.quote-icon {
  position: relative;
  width: 60px;
  height: 60px;
  margin: 0 auto 30px;
  z-index: 3;
  
  .icon-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, rgba(0, 123, 255, 0.1), rgba(102, 126, 234, 0.1));
    border-radius: 50%;
    transition: all 0.4s ease;
  }
  
  i {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: clamp(1.8rem, 4vw, 2rem);
    color: $primary-color;
    transition: all 0.4s ease;
    z-index: 2;
  }
  
  .icon-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(0, 123, 255, 0.3), transparent 70%);
    border-radius: 50%;
    opacity: 0;
    transition: all 0.4s ease;
  }
}

// Star Rating
.star-rating {
  margin: 20px 0;
  
  .stars-container {
    display: flex;
    justify-content: center;
    gap: 5px;
    margin-bottom: 10px;
    
    .star {
      font-size: clamp(1rem, 3vw, 1.2rem);
      color: #ddd;
      transition: all 0.3s ease;
      
      &.filled {
        color: $warning-color;
        transform: scale(1.1);
      }
      
      i {
        filter: drop-shadow(0 2px 4px rgba(255, 193, 7, 0.3));
      }
    }
  }
  
  .rating-text {
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    color: $secondary-color;
    font-weight: 600;
  }
}

// Testimonial Content
.testimonial-content {
  flex: 1;
  margin: 20px 0;
  
  .testimonial-text {
    font-size: clamp(1rem, 3vw, 1.1rem);
    line-height: 1.6;
    color: $dark-color;
    font-style: italic;
    margin: 0;
    position: relative;
    
    &::before,
    &::after {
      content: '"';
      font-size: clamp(1.5rem, 4vw, 2rem);
      color: rgba($primary-color, 0.3);
      font-family: Georgia, serif;
      position: absolute;
      line-height: 1;
    }
    
    &::before {
      top: -10px;
      left: -15px;
    }
    
    &::after {
      bottom: -20px;
      right: -10px;
    }
  }
}

// Client Profile
.client-profile {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
  
  .profile-image-container {
    position: relative;
    width: 70px; // Increased size for better visibility
    height: 70px;
    flex-shrink: 0;
    
    .profile-image {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      object-position: center;
      position: relative;
      z-index: 2;
      transition: transform 0.3s ease;
      display: block; // Ensure proper rendering
      background-color: $light-color; // Fallback background for broken images
      
      // Handle broken or missing images
      &[src=""],
      &:not([src]) {
        background: $secondary-color url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffffff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z"/></svg>') no-repeat center;
        background-size: 50%;
      }
    }
    
    .image-border {
      position: absolute;
      top: -4px;
      left: -4px;
      right: -4px;
      bottom: -4px;
      border: 2px solid transparent;
      border-radius: 50%;
      background: linear-gradient(45deg, $primary-color, #667eea);
      z-index: 1;
      
      &::before {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        right: 2px;
        bottom: 2px;
        background: $white;
        border-radius: 50%;
      }
    }
    
    // Hover effect for image
    .testimonial-card:hover & {
      .profile-image {
        transform: scale(1.05);
      }
    }
  }
  
  .profile-info {
    text-align: left;
    
    .client-name {
      font-size: clamp(1.2rem, 3.5vw, 1.3rem);
      font-weight: 700;
      color: $dark-color;
      margin: 0 0 5px 0;
    }
    
    .client-title {
      font-size: clamp(0.85rem, 2.5vw, 0.9rem);
      color: $primary-color;
      font-weight: 600;
      margin: 0 0 5px 0;
    }
    
    .client-location {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
      color: $secondary-color;
      margin: 0;
    }
  }
}

// Service Badge
.service-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba($success-color, 0.1);
  color: $success-color;
  padding: 8px 15px;
  border-radius: 20px;
  font-size: clamp(0.75rem, 2vw, 0.8rem);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
  
  i {
    font-size: clamp(0.8rem, 2vw, 0.9rem);
  }
}

// Hover Effects
.hover-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 4;
  
  .sparkle {
    position: absolute;
    opacity: 0;
    font-size: clamp(1rem, 3vw, 1.2rem);
    animation-play-state: paused;
    
    &.sparkle-1 {
      top: 20%;
      left: 15%;
      animation: sparkle1 3s ease-in-out infinite;
    }
    
    &.sparkle-2 {
      top: 30%;
      right: 20%;
      animation: sparkle2 2.5s ease-in-out infinite;
    }
    
    &.sparkle-3 {
      bottom: 25%;
      left: 25%;
      animation: sparkle3 3.5s ease-in-out infinite;
    }
  }
}

// Carousel Controls
.carousel-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
  margin-top: 40px;
  
  .nav-btn {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: none;
    background: $white;
    color: $primary-color;
    font-size: clamp(1rem, 3vw, 1.2rem);
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    
    &:hover:not(:disabled) {
      background: linear-gradient(45deg, $primary-color, #667eea);
      color: $white;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 123, 255, 0.3);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  .pagination-dots {
    display: flex;
    gap: 10px;
    
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: none;
      background: rgba($primary-color, 0.3);
      cursor: pointer;
      transition: all 0.3s ease;
      
      &.active {
        background: $primary-color;
        transform: scale(1.2);
      }
      
      &:hover {
        background: $primary-color;
        transform: scale(1.1);
      }
    }
  }
}

// Statistics Section
.testimonials-stats {
  margin-bottom: 60px;
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 30px;
    
    .stat-item {
      background: $white;
      padding: 30px 20px;
      border-radius: 15px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      
      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
      }
      
      .stat-number {
        font-size: clamp(1.8rem, 4vw, 2.2rem);
        font-weight: 800;
        background: linear-gradient(45deg, $primary-color, #667eea);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 10px;
        padding: 12px;
      }
      
      .stat-label {
        color: $secondary-color;
        font-weight: 600;
        font-size: clamp(0.8rem, 2.5vw, 0.9rem);
      }
    }
  }
}

// Call to Action
.testimonials-cta {
  background: $white;
  padding: 50px 40px;
  border-radius: 20px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
  max-width: 700px;
  margin: 0 auto;
  
  h3 {
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 700;
    color: $dark-color;
    margin-bottom: 15px;
  }
  
  p {
    color: $secondary-color;
    font-size: clamp(0.9rem, 3vw, 1.1rem);
    margin-bottom: 30px;
    line-height: 1.6;
  }
  
  .cta-buttons {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: wrap;
    
    .cta-button {
      padding: 15px 35px;
      border-radius: 30px;
      font-size: clamp(0.9rem, 3vw, 1.1rem);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.4s ease;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      
      &.primary {
        background: linear-gradient(45deg, $primary-color, #667eea);
        color: $white;
        border: none;
        
        &:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 30px rgba(0, 123, 255, 0.4);
          
          i {
            transform: translateX(5px);
          }
        }
      }
      
      &.secondary {
        background: transparent;
        color: $primary-color;
        border: 2px solid $primary-color;
        
        &:hover {
          background: linear-gradient(45deg, $primary-color, #667eea);
          color: $white;
          transform: translateY(-3px);
          
          i {
            transform: translateX(5px);
          }
        }
      }
      
      i {
        transition: transform 0.3s ease;
      }
    }
  }
}

// Animations
@keyframes sparkle1 {
  0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1) rotate(180deg); opacity: 1; }
}

@keyframes sparkle2 {
  0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1) rotate(-180deg); opacity: 1; }
}

@keyframes sparkle3 {
  0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1) rotate(90deg); opacity: 1; }
}

// Mobile Responsive Design
@media (max-width: 768px) {
  .testimonials.section {
    padding: 60px 0;
  }
  
  .section-title {
    margin-bottom: 50px;
    
    .title-wrapper {
      .section-description {
        padding: 0 15px;
      }
    }
  }
  
  .testimonials-carousel {
    .testimonial-slide {
      min-width: 100%;
      
      &.center-slide, &.side-slide {
        .testimonial-card {
          transform: scale(1);
          opacity: 1;
        }
      }
    }
  }
  
  .testimonial-card {
    padding: 30px 20px;
    min-height: auto;
    max-width: 100%;
    
    .quote-icon {
      width: 50px;
      height: 50px;
    }
    
    .client-profile {
      flex-direction: column;
      gap: 15px;
      
      .profile-info {
        text-align: center;
      }
      
      .profile-image-container {
        width: 60px;
        height: 60px;
      }
    }
  }
  
  .carousel-controls {
    gap: 20px;
    
    .nav-btn {
      width: 45px;
      height: 45px;
    }
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    
    .stat-item {
      padding: 20px 15px;
    }
  }
  
  .testimonials-cta {
    padding: 30px 20px;
    margin: 0 15px;
    
    .cta-buttons {
      flex-direction: column;
      
      .cta-button {
        width: 100%;
        padding: 12px 25px;
      }
    }
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .client-profile {
    .profile-image-container {
      width: 50px;
      height: 50px;
    }
  }
}
</style>