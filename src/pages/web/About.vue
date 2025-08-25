<template>
  <div class="about-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="container">
        <div class="hero-content text-center" data-aos="fade-up">
          <span class="subtitle-badge">Discover Us</span>
          <h1 class="hero-title">About EagerSky</h1>
          <div class="title-underline"></div>
          <p class="hero-description">
            Eagersky is a digital housing management platform that simplifies the rental process for tenants, offering seamless online solutions for both private and public accommodations.
          </p>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section class="about-section">
      <div class="container">
        <div class="section-title text-center" data-aos="fade-up">
          <span class="subtitle-badge">Who We Are</span>
          <h2 class="main-title">Simplifying Your Housing Journey</h2>
          <div class="title-underline"></div>
          <p class="section-description">
            As an official partner of Proptno Global Limited, we combine innovative technology with global expertise to eliminate housing hassles and provide a smarter way to find the perfect home. We prioritize accessibility, functionality, and value to ensure smooth experiences for all users, regardless of budget or scale.
          </p>
        </div>
        <div class="about-grid">
        
          <div class="image-column" data-aos="fade-up" data-aos-delay="300">
            <div class="image-layout">
              <div class="image-primary">
                <img src="/public/img/about-company-2.jpg" alt="About EagerSky">
              </div>
              <div class="image-secondary">
                <img src="/public/img/about-company-3.jpg" alt="Our Team">
                <img src="/public/img/about-company-1.jpg" alt="Our Office">
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Process Section -->
    <section class="process-section">
      <div class="container">
        <div class="section-title text-center" data-aos="fade-up">
          <span class="subtitle-badge">Our Process</span>
          <h2 class="main-title">How It Works</h2>
          <div class="title-underline"></div>
          <p class="section-description">
            At Eagersky, we provide a comprehensive range of real estate solutions catering to both international and local clients. Our services encompass permanent and temporary residential accommodations, commercial office space rentals, professional property design services (both interior and exterior), and complete property management solutions. We take pride in offering access to Tanzania's most exceptional properties, making the process of finding and renting your ideal home or workspace simpler and more convenient than ever before. Our expertise and carefully curated portfolio ensure a seamless real estate experience tailored to your specific needs.
          </p>
        </div>
        <div class="process-grid">
          <div class="image-column" data-aos="fade-up" data-aos-delay="100">
            <div class="process-image">
              <img src="/public/img/about.webp" alt="How It Works">
            </div>
          </div>
          <div class="content-column" data-aos="fade-up" data-aos-delay="200">
            <div class="services-grid">
              <div 
                class="service-card" 
                v-for="(service, index) in services" 
                :key="index"
                :data-aos="'fade-up'" 
                :data-aos-delay="300 + (index * 100)"
                @mouseenter="handleCardHover" 
                @mouseleave="handleCardLeave"
              >
                <div class="icon-container">
                  <div class="icon-background"></div>
                  <i :class="service.icon" class="service-icon"></i>
                  <div class="icon-glow"></div>
                </div>
                <div class="service-content">
                  <h3 class="service-title">
                    <router-link :to="service.link">{{ service.title }}</router-link>
                  </h3>
                  <p class="service-description">{{ service.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Values Section -->
    <section class="values-section">
      <div class="container">
        <div class="section-title text-center" data-aos="fade-up">
          <span class="subtitle-badge">Our Principles</span>
          <h2 class="main-title">Our Core Values</h2>
          <div class="title-underline"></div>
          <p class="section-description">
            “Together, these values define who we are and how we serve you, making the journey of finding, renting, or managing property seamless, ethical, and empowering for all”.
          </p>
        </div>
        <div class="values-grid">
          <div 
            class="value-card" 
            v-for="(value, index) in coreValues" 
            :key="index"
            :data-aos="'fade-up'" 
            :data-aos-delay="100 + (index * 100)"
            @mouseenter="handleCardHover" 
            @mouseleave="handleCardLeave"
          >
            <div class="icon-container">
              <div class="icon-background"></div>
              <i class="bi bi-check-circle service-icon"></i>
              <div class="icon-glow"></div>
            </div>
            <div class="value-content">
              <p class="value-text">{{ value }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <!-- Call to Action -->
    <section class="cta-section text-center" data-aos="fade-up" data-aos-delay="800">
      <div class="container">
        <h3 class="cta-title">Ready to Simplify Your Housing Journey?</h3>
        <p class="cta-description">Contact our team for personalized real estate solutions tailored to your needs.</p>
        <router-link to="/contact" class="cta-button">
          <span>Get in Touch</span>
          <i class="bi bi-telephone"></i>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import AOS from 'aos';

const services = ref([
  {
    title: 'Property Management',
    description: 'Comprehensive management solutions for property owners.',
    icon: 'bi bi-gear',
    link: '/services/management'
  },
  {
    title: 'Permanent and Temporary Home Stay',
    description: 'Comfortable accommodations for short and long-term stays.',
    icon: 'bi bi-house',
    link: '/services/residential'
  },
  {
    title: 'Office and Commercial Renting',
    description: 'Prime locations for your business operations.',
    icon: 'bi bi-building',
    link: '/services/commercial'
  },
  {
    title: 'Property Marketing and Advertising',
    description: 'Effective strategies to showcase your properties.',
    icon: 'bi bi-megaphone',
    link: '/services/marketing'
  },
  {
    title: 'Property Interior and Exterior Design',
    description: 'Creative design solutions to enhance property value.',
    icon: 'bi bi-brush',
    link: '/services/design'
  },
  {
    title: 'Property Management Software Distribution',
    description: 'We deliver and maintain property management tools so landlords can focus on their business, not paperwork. “We are the bridge between cutting-edge property tech and the people who need it—making management effortless.”',
    icon: 'bi bi-laptop',
    link: '/services/software'
  }
]);

const coreValues = ref([
  'Ensuring every interaction is built on honesty and transparency.',
  'Fostering collaboration with partners, clients, and communities to achieve shared success.',
  'Prioritizing your unique needs with tailored, open solutions.',
  'Constantly evolving through technology and creative thinking to simplify real estate.',
  'Committing to sustainable practices and positive community impact.'
]);

const handleCardHover = (event: Event) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = 'translateY(-10px) scale(1.02)';
};

const handleCardLeave = (event: Event) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = 'translateY(0) scale(1)';
};

onMounted(() => {
  AOS.init({
    duration: 800,
    once: true,
    offset: 100
  });
  const cards = document.querySelectorAll('.service-card, .value-card, .stat-card');
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
.about-page {
  font-family: 'Poppins', sans-serif;
  background: $light-color;
}

// Section Styling
.hero-section,
.about-section,
.process-section,
.values-section,
.stats-section,
.cta-section {
  padding: 80px 0;
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
    opacity: 0.3;
  }

  .container {
    position: relative;
    z-index: 2;
    max-width: 1200px;
    width: 90%;
    margin: 0 auto;
    padding: 0 10px;
  }
}

// Hero Section
.hero-section {
  background: linear-gradient(135deg, $light-color 0%, #c3cfe2 100%);
  
  .hero-content {
    max-width: 800px;
    margin: 0 auto;
    
    .subtitle-badge {
      display: inline-block;
      background: linear-gradient(45deg, $primary-color, #667eea);
      color: $white;
      padding: 6px 20px;
      border-radius: 25px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 15px;
      box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
    }
    
    .hero-title {
      font-size: clamp(2rem, 4.5vw, 3rem);
      font-weight: 800;
      background: linear-gradient(45deg, $dark-color, $primary-color);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 15px;
      line-height: 1.2;
    }
    
    .hero-description {
      font-size: clamp(1rem, 2.5vw, 1.2rem);
      color: $secondary-color;
      line-height: 1.6;
    }
  }
}

// Section Title
.section-title {
  margin-bottom: 50px;
  
  .subtitle-badge {
    display: inline-block;
    background: linear-gradient(45deg, $primary-color, #667eea);
    color: $white;
    padding: 6px 20px;
    border-radius: 25px;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 15px;
    box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
  }
  
  .main-title {
    font-size: clamp(1.8rem, 3.5vw, 2.5rem);
    font-weight: 800;
    background: linear-gradient(45deg, $dark-color, $primary-color);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 15px;
    line-height: 1.2;
  }
  
  .title-underline {
    width: 70px;
    height: 4px;
    background: linear-gradient(45deg, $primary-color, #667eea);
    margin: 0 auto 15px;
    border-radius: 2px;
  }
  
  .section-description {
    font-size: clamp(0.9rem, 2.5vw, 1.1rem);
    color: $secondary-color;
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
  }
}

// About Section
.about-section {
  background: $white;
  
  .about-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 30px;
    align-items: center;
  }
  
  .features-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;
    
    .feature-icon {
      flex-shrink: 0;
      i {
        color: $success-color;
        font-size: 1.1rem;
      }
    }
    
    .feature-text {
      font-size: clamp(0.85rem, 2vw, 0.95rem);
      color: $dark-color;
      line-height: 1.5;
    }
  }
  
  .image-layout {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .image-primary img {
    width: 100%;
    height: auto;
    max-height: 250px;
    object-fit: cover;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
  
  .image-secondary {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 15px;
    
    img {
      width: calc(50% - 7.5px);
      height: auto;
      max-height: 150px;
      object-fit: cover;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
  }
}

// Process Section
.process-section {
  background: linear-gradient(135deg, $light-color 0%, #e2e8f0 100%);
  
  .process-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 30px;
    align-items: center;
  }
  
  .process-image img {
    width: 100%;
    height: auto;
    max-height: 300px;
    object-fit: cover;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
  
  .services-grid {
    display: grid;
    gap: 15px;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
  
  .service-card {
    background: $white;
    border-radius: 12px;
    padding: 25px;
    position: relative;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    opacity: 0;
    transform: translateY(50px);
    
    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .icon-container {
    position: relative;
    width: 50px;
    height: 50px;
    margin: 0 auto 15px;
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
      font-size: 1.8rem;
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
  
  .service-content {
    text-align: center;
    
    .service-title {
      font-size: clamp(0.9rem, 2.5vw, 1.2rem);
      font-weight: 700;
      margin-bottom: 8px;
      
      a {
        color: $dark-color;
        text-decoration: none;
        transition: color 0.3s ease;
        
        &:hover {
          color: $primary-color;
        }
      }
    }
    
    .service-description {
      font-size: clamp(0.75rem, 2vw, 0.9rem);
      color: $secondary-color;
      line-height: 1.5;
    }
  }
}

// Values Section
.values-section {
  background: $white;
  
  .values-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    max-width: 1000px;
    margin: 0 auto;
  }
  
  .value-card {
    background: $white;
    border-radius: 12px;
    padding: 25px;
    position: relative;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    opacity: 0;
    transform: translateY(50px);
    
    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }
    
    .value-content {
      text-align: center;
      
      .value-text {
        font-size: clamp(0.85rem, 2vw, 0.95rem);
        color: $dark-color;
        line-height: 1.5;
      }
    }
  }
}

// Statistics Section
.stats-section {
  background: linear-gradient(135deg, $light-color 0%, #e2e8f0 100%);
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }
  
  .stat-card {
    background: $white;
    border-radius: 12px;
    padding: 25px;
    position: relative;
    overflow: hidden;
    text-align: center;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    opacity: 0;
    transform: translateY(50px);
    
    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }
    
    .stat-content {
      .stat-number {
        font-size: clamp(1.5rem, 3.5vw, 1.8rem);
        font-weight: 700;
        color: $dark-color;
        margin-bottom: 8px;
      }
      
      .stat-label {
        font-size: clamp(0.85rem, 2vw, 0.95rem);
        color: $secondary-color;
        font-weight: 500;
      }
    }
  }
}

// CTA Section
.cta-section {
  background: $white;
  
  .cta-title {
    font-size: clamp(1.3rem, 3.5vw, 1.8rem);
    font-weight: 700;
    color: $dark-color;
    margin-bottom: 12px;
  }
  
  .cta-description {
    font-size: clamp(0.85rem, 2.5vw, 1rem);
    color: $secondary-color;
    margin-bottom: 25px;
    line-height: 1.5;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
  
  .cta-button {
    background: linear-gradient(45deg, $primary-color, #667eea);
    color: $white;
    border: none;
    padding: 12px 30px;
    border-radius: 25px;
    font-size: clamp(0.85rem, 2.5vw, 1rem);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.4s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 25px rgba(0, 123, 255, 0.4);
      
      i {
        transform: scale(1.2);
      }
    }
    
    i {
      transition: transform 0.3s ease;
    }
  }
}

// Hover Effects
.service-card:hover,
.value-card:hover,
.stat-card:hover {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  
  .icon-container {
    .service-icon {
      transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
      color: $white;
    }
    
    .icon-background {
      transform: scale(1.2);
      background: linear-gradient(45deg, $primary-color, #667eea);
    }
    
    .icon-glow {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.5);
    }
  }
}

// Responsive Design
@media (min-width: 768px) {
  .about-grid,
  .process-grid {
    grid-template-columns: repeat(2, minmax(300px, 1fr));
    gap: 40px;
  }
  
  .image-layout {
    display: grid;
    grid-template-columns: repeat(2, minmax(150px, 1fr));
    height: 350px;
  }
  
  .image-primary img {
    height: 100%;
  }
  
  .image-secondary {
    flex-direction: column;
    
    img {
      width: 100%;
      height: calc(50% - 7.5px);
    }
  }
  
  .services-grid {
    grid-template-columns: repeat(2, minmax(200px, 1fr));
  }
}

@media (max-width: 767px) {
  .hero-section,
  .about-section,
  .process-section,
  .values-section,
  .stats-section,
  .cta-section {
    padding: 50px 0;
  }
  
  .section-title {
    margin-bottom: 30px;
  }
  
  .values-grid,
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  
  .image-layout {
    flex-direction: column;
  }
  
  .image-primary img {
    max-height: 200px;
  }
  
  .image-secondary img {
    width: 100%;
    max-height: 120px;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 8px;
  }
  
  .service-card,
  .value-card,
  .stat-card {
    padding: 20px;
  }
  
  .section-title .main-title {
    font-size: clamp(1.6rem, 3.5vw, 2rem);
  }
  
  .hero-title {
    font-size: clamp(1.8rem, 4vw, 2.2rem);
  }
  
  .values-grid,
  .stats-grid,
  .services-grid {
    grid-template-columns: 1fr;
  }
  
  .service-content {
    .service-title {
      font-size: clamp(0.85rem, 2vw, 1rem);
    }
    
    .service-description {
      font-size: clamp(0.7rem, 1.8vw, 0.8rem);
    }
  }
}
</style>