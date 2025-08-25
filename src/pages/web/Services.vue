<template>
  <div class="all-services-page">
    <section id="services" class="services section">
      <div class="container">
        <!-- Section Title -->
        <div class="section-title text-center" data-aos="fade-up">
          <div class="title-wrapper">
            <span class="subtitle-badge">What We Offer</span>
            <h2 class="main-title">Our Services</h2>
            <div class="title-underline"></div>
            <p class="section-description">
              Our core service is to bring you the joy of living in the better place you've always wished for.
              We provide comprehensive real estate solutions tailored to your needs.
            </p>
          </div>
        </div>

        <!-- Services Grid -->
        <div class="services-grid">
          <div 
            class="service-card-wrapper"
            v-for="(service, index) in services" 
            :key="service.id"
            :data-aos="'fade-up'" 
            :data-aos-delay="100 * (index + 1)"
          >
            <div class="service-card" @mouseenter="handleCardHover" @mouseleave="handleCardLeave">
              <!-- Background Pattern -->
              <div class="card-background">
                <div class="pattern-dots"></div>
                <div class="gradient-overlay"></div>
              </div>

              <!-- Icon Container -->
              <div class="icon-container">
                <div class="icon-background"></div>
                <i :class="service.icon" class="service-icon"></i>
                <div class="icon-glow"></div>
              </div>

              <!-- Service Content -->
              <div class="service-content">
                <h3 class="service-title">{{ service.title }}</h3>
                <p class="service-description">{{ service.description }}</p>
                
                <!-- Features List -->
                <ul class="service-features" v-if="service.features">
                  <li v-for="feature in service.features" :key="feature">
                    <i class="bi bi-check-circle"></i>
                    {{ feature }}
                  </li>
                </ul>

                <!-- Learn More Button -->
                <div class="service-footer">
                  <router-link :to="`/service-details?service_id=${service.id}`" class="learn-more-btn">
                    <span>Learn More</span>
                    <i class="bi bi-arrow-right"></i>
                  </router-link>
                </div>
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

        <!-- Call to Action -->
        <div class="services-cta text-center" data-aos="fade-up" data-aos-delay="800">
          <h3>Need a Custom Solution?</h3>
          <p>Our team is ready to create a personalized service package just for you.</p>
        <router-link to="/about" class="cta-button">
          <span>Get Custom Quote</span>
          <i class="bi bi-telephone"></i>
        </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';

const services = ref([
  {
    id: 1,
    title: "Property Management",
    description: "Comprehensive management solutions for property owners with 24/7 support and maintenance.",
    icon: "bi bi-building",
    features: ["24/7 Support", "Maintenance Services", "Tenant Screening"]
  },
  {
    id: 2,
    title: "Permanent and Temporary Home Stay",
    description: "Comfortable accommodations for short and long-term stays with flexible booking options.",
    icon: "bi bi-house-heart",
    features: ["Flexible Booking", "Furnished Options", "Concierge Service"]
  },
  {
    id: 3,
    title: "Office and Commercial Renting",
    description: "Professional commercial spaces designed to help your business thrive and grow.",
    icon: "bi bi-briefcase",
    features: ["Prime Locations", "Modern Amenities", "Flexible Terms"]
  },
  {
    id: 4,
    title: "Property Management Software",
    description: "We deliver and maintain property management tools so landlords can focus on their business.",
    icon: "bi bi-laptop",
    features: ["Cloud-Based", "Mobile App", "Analytics Dashboard"]
  },
  {
    id: 5,
    title: "Property Marketing and Advertising",
    description: "Effective strategies to showcase your properties and attract quality tenants.",
    icon: "bi bi-megaphone",
    features: ["Digital Marketing", "Professional Photos", "Social Media"]
  },
  {
    id: 6,
    title: "Interior and Exterior Design",
    description: "Creative design solutions to enhance property value and create stunning living spaces.",
    icon: "bi bi-palette",
    features: ["3D Visualization", "Custom Designs", "Project Management"]
  }
]);

const handleCardHover = (event: Event) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = 'translateY(-15px) scale(1.02)';
};

const handleCardLeave = (event: Event) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = 'translateY(0) scale(1)';
};

onMounted(() => {
  // Add staggered animations
  const cards = document.querySelectorAll('.service-card');
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.add('animate-in');
    }, index * 150);
  });
});
</script>

<style lang="scss" scoped>
// Color Variables
$primary-color: #007bff;
$secondary-color: #6c757d;
$success-color: #28a745;
$light-color: #f8f9fa;
$dark-color: #212529;
$white: #ffffff;

// Page Wrapper
.all-services-page {
  font-family: 'Poppins', sans-serif;
}

// Section Styling
.services.section {
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

// Section Title
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
      font-size: 0.9rem;
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

// Services Grid
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 60px;
}

// Service Card Wrapper
.service-card-wrapper {
  display: flex;
  justify-content: center;
}

// Service Card
.service-card {
  background: $white;
  border-radius: 20px;
  padding: 40px 30px;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  height: 100%;
  max-width: 380px;
  width: 100%;
  opacity: 0;
  transform: translateY(50px);
  
  &.animate-in {
    opacity: 1;
    transform: translateY(0);
  }
  
  &:hover {
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
    
    .icon-container {
      .service-icon {
        transform: scale(1.1) rotate(5deg);
        color: $white;
      }
      
      .icon-background {
        transform: scale(1.2);
        background: linear-gradient(45deg, $primary-color, #667eea);
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
    
    .learn-more-btn {
      background: linear-gradient(45deg, $primary-color, #667eea);
      color: $white;
      transform: translateY(-2px);
      
      i {
        transform: translateX(5px);
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

// Icon Container
.icon-container {
  position: relative;
  width: 80px;
  height: 80px;
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
  
  .service-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2.5rem;
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

// Service Content
.service-content {
  position: relative;
  z-index: 3;
  text-align: center;
  
  .service-title {
    font-size: clamp(1.3rem, 4vw, 1.5rem);
    font-weight: 700;
    color: $dark-color;
    margin-bottom: 15px;
    line-height: 1.3;
  }
  
  .service-description {
    color: $secondary-color;
    font-size: clamp(0.9rem, 3vw, 1rem);
    line-height: 1.6;
    margin-bottom: 25px;
  }
  
  .service-features {
    list-style: none;
    padding: 0;
    margin: 0 0 30px 0;
    
    li {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 5px 0;
      font-size: clamp(0.8rem, 2.5vw, 0.9rem);
      color: $secondary-color;
      
      i {
        color: $success-color;
        font-size: clamp(0.7rem, 2vw, 0.8rem);
      }
    }
  }
  
  .service-footer {
    margin-top: auto;
    
    .learn-more-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 123, 255, 0.1);
      color: $primary-color;
      text-decoration: none;
      padding: 12px 25px;
      border-radius: 25px;
      font-weight: 600;
      font-size: clamp(0.85rem, 2.5vw, 0.9rem);
      transition: all 0.3s ease;
      border: 2px solid transparent;
      
      i {
        transition: transform 0.3s ease;
      }
      
      &:hover {
        border-color: $primary-color;
      }
    }
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

// Services CTA
.services-cta {
  background: $white;
  padding: 50px 40px;
  border-radius: 20px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
  max-width: 600px;
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
  
  .cta-button {
    background: linear-gradient(45deg, $primary-color, #667eea);
    color: $white;
    border: none;
    padding: 15px 35px;
    border-radius: 30px;
    font-size: clamp(0.9rem, 3vw, 1.1rem);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.4s ease;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 30px rgba(0, 123, 255, 0.4);
      
      i {
        transform: scale(1.2);
      }
    }
    
    i {
      transition: transform 0.3s ease;
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
  .services.section {
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
  
  .services-grid {
    grid-template-columns: 1fr;
    gap: 20px;
    margin-bottom: 40px;
  }
  
  .service-card {
    padding: 30px 20px;
    max-width: 100%;
  }
  
  .services-cta {
    padding: 30px 20px;
    margin: 0 15px;
  }
}

@media (max-width: 480px) {
  .services-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .service-card {
    padding: 25px 15px;
  }
}
</style>