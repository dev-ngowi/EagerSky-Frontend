<template>
  <div class="contact-page">
    <!-- Page Title Section -->
    <section class="page-title section">
      <div class="container">
        <div class="section-title text-center" data-aos="fade-up">
          <span class="subtitle-badge">Get In Touch</span>
          <h1 class="main-title">Contact Us</h1>
          <div class="title-underline"></div>
          <p class="section-description">
            Reach out to EagerSky for all your real estate needs in Tanzania. Our team is here to provide expert guidance and personalized service.
          </p>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="contact section">
      <div class="container">
        <!-- Map -->
        <div class="map-wrapper" data-aos="fade-up" data-aos-delay="100">
          <iframe
            style="border: 0; width: 100%; height: 100%;"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3961.0718339933177!2d37.56761431477085!3d-6.917928695052723!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x185814a4b7c3c4b7%3A0x7c3f1c8b2f2b2c2e!2sMzumbe%20University%2C%20Morogoro%2C%20Tanzania!5e0!3m2!1sen!2sus!4v1697054321098!5m2!1sen!2sus"
            frameborder="0"
            allowfullscreen
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>

        <!-- Contact Info and Form Grid -->
        <div class="contact-grid">
          <!-- Contact Form -->
          <div class="form-column" data-aos="fade-up" data-aos-delay="200">
            <div class="form-header">
              <h2 class="form-title">Send us a Message</h2>
              <p class="form-subtitle">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
            </div>
            <form ref="contactForm" class="contact-form" @submit.prevent="handleSubmit">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Your Name</label>
                  <input
                    v-model="form.name"
                    type="text"
                    name="name"
                    class="form-control"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Your Email</label>
                  <input
                    v-model="form.email"
                    type="email"
                    name="email"
                    class="form-control"
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <div class="form-group form-group-full">
                  <label class="form-label">Subject</label>
                  <input
                    v-model="form.subject"
                    type="text"
                    name="subject"
                    class="form-control"
                    placeholder="What's this about?"
                    required
                  />
                </div>
                <div class="form-group form-group-full">
                  <label class="form-label">Message</label>
                  <textarea
                    v-model="form.message"
                    name="message"
                    class="form-control"
                    rows="6"
                    placeholder="Tell us more about your inquiry..."
                    required
                  ></textarea>
                </div>
                <div class="form-group form-group-full">
                  <div class="status-messages">
                    <div class="loading" v-show="isLoading">
                      <div class="loading-spinner"></div>
                      Sending your message...
                    </div>
                    <div class="error-message" v-show="errorMessage" v-html="errorMessage"></div>
                    <div class="sent-message" v-show="sentMessage">
                      <i class="bi bi-check-circle"></i>
                      Your message has been sent. Thank you!
                    </div>
                  </div>
                  <button type="submit" :disabled="isLoading" class="cta-button">
                    <span v-if="!isLoading">Send Message</span>
                    <span v-else>Sending...</span>
                    <i class="bi bi-send" v-if="!isLoading"></i>
                    <div class="btn-loading-spinner" v-else></div>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <!-- Contact Info -->
          <div class="info-column" data-aos="fade-up" data-aos-delay="300">
            <div class="info-header">
              <h2 class="info-title">Contact Information</h2>
              <p class="info-subtitle">Get in touch with us through any of these channels</p>
            </div>
            
            <div class="info-cards-container">
              <div 
                class="info-card" 
                v-for="(info, index) in contactInfo" 
                :key="index"
                :data-aos="'fade-up'" 
                :data-aos-delay="400 + (index * 100)"
                @mouseenter="handleCardHover" 
                @mouseleave="handleCardLeave"
              >
                <!-- Background Pattern -->
                <div class="card-background">
                  <div class="pattern-dots"></div>
                  <div class="gradient-overlay"></div>
                </div>
                <div class="icon-container">
                  <div class="icon-background"></div>
                  <i :class="info.icon" class="service-icon"></i>
                  <div class="icon-glow"></div>
                </div>
                <div class="info-content">
                  <h3 class="info-title">{{ info.title }}</h3>
                  <p class="info-text" v-html="info.content"></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import AOS from 'aos';
import makeRequest from '../../services/makeRequest';

const contactInfo = ref([
  { title: 'Address', content: 'S.L.P 20950, <br>Dar es Saalam, Tanzania', icon: 'bi bi-geo-alt' },
  { title: 'Call Us', content: '<a href="tel:+255741681178">+255 741-681178</a>', icon: 'bi bi-telephone' },
  { title: 'Email Us', content: '<a href="mailto:info@eagerskyreality.com">info@eagerskyreality.com</a>', icon: 'bi bi-envelope' },
]);

const form = ref({
  name: '',
  email: '',
  subject: '',
  message: ''
});

const isLoading = ref(false);
const errorMessage = ref('');
const sentMessage = ref(false);
const contactForm = ref<HTMLFormElement | null>(null);

const validateForm = () => {
  const errors = [];
  
  if (!form.value.name.trim()) {
    errors.push('Name is required.');
  }
  
  if (!form.value.email.trim()) {
    errors.push('Email is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.push('Please enter a valid email address.');
  }
  
  if (!form.value.subject.trim()) {
    errors.push('Subject is required.');
  }
  
  if (!form.value.message.trim()) {
    errors.push('Message is required.');
  }
  
  if (errors.length > 0) {
    errorMessage.value = errors.join('<br>');
    return false;
  }
  
  return true;
};

const handleSubmit = async () => {
  errorMessage.value = '';
  sentMessage.value = false;
  
  if (!validateForm()) {
    setTimeout(() => { errorMessage.value = ''; }, 8000);
    return;
  }
  
  isLoading.value = true;

  try {
    const response = await makeRequest({
      method: 'POST',
      url: `${import.meta.env.VITE_APP_API_BASE_URL}/v1/client-message`,
      data: form.value,
      headers: {
        'Content-Type': 'application/json'
      },
      requiresAuth: false
    });

    if (response.data?.status === 'success') {
      sentMessage.value = true;
      form.value = { name: '', email: '', subject: '', message: '' };
      if (contactForm.value) {
        contactForm.value.reset();
      }
      setTimeout(() => { sentMessage.value = false; }, 5000);
    } else {
      errorMessage.value = response.data?.message || 'An error occurred. Please try again.';
      throw new Error('Form submission failed');
    }
  } catch (error: any) {
    console.error('Submission Error:', error);
    if (error.response?.status === 422 && error.response?.data?.errors) {
      errorMessage.value = Object.values(error.response.data.errors).flat().join('<br>');
    } else {
      errorMessage.value = error.response?.data?.message || 'An error occurred. Please try again.';
    }
    setTimeout(() => { errorMessage.value = ''; }, 8000);
  } finally {
    isLoading.value = false;
  }
};

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
  const cards = document.querySelectorAll('.info-card');
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
$danger-color: #dc3545;
$light-color: #f8f9fa;
$dark-color: #212529;
$white: #ffffff;
$accent-color: #f4a261;

// Base Reset and Typography
* {
  box-sizing: border-box;
}

// Page Wrapper
.contact-page {
  font-family: 'Poppins', sans-serif;
  background: $light-color;
  min-height: 100vh;
  overflow-x: hidden;
}

// Container
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 clamp(15px, 3vw, 30px);
  width: 100%;
}

// Section Styling
.section {
  padding: clamp(60px, 10vw, 120px) 0;
  position: relative;
  overflow: hidden;
}

// Page Title
.page-title {
  background: linear-gradient(135deg, $light-color 0%, #e3f2fd 100%);
  
  .section-title {
    max-width: 900px;
    margin: 0 auto;
    
    .subtitle-badge {
      display: inline-block;
      background: linear-gradient(45deg, $accent-color, #ee5a24);
      color: $white;
      padding: clamp(6px, 2vw, 10px) clamp(18px, 4vw, 28px);
      border-radius: 25px;
      font-size: clamp(0.75rem, 2vw, 0.95rem);
      font-weight: 600;
      margin-bottom: clamp(15px, 3vw, 25px);
      box-shadow: 0 4px 15px rgba(244, 162, 97, 0.3);
      animation: pulse 2s infinite;
    }
    
    .main-title {
      font-size: clamp(2rem, 6vw, 4rem);
      font-weight: 800;
      background: linear-gradient(45deg, $dark-color, $primary-color);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: clamp(15px, 3vw, 25px);
      line-height: 1.2;
      text-align: center;
    }
    
    .title-underline {
      width: clamp(60px, 10vw, 100px);
      height: clamp(3px, 0.5vw, 5px);
      background: linear-gradient(45deg, $primary-color, #667eea);
      margin: 0 auto clamp(15px, 3vw, 25px);
      border-radius: 3px;
    }
    
    .section-description {
      font-size: clamp(0.9rem, 2.5vw, 1.3rem);
      color: $secondary-color;
      line-height: 1.7;
      font-weight: 400;
      text-align: center;
      max-width: 700px;
      margin: 0 auto;
    }
  }
}

// Contact Section
.contact {
  background: $white;
  
  .map-wrapper {
    border-radius: clamp(10px, 2vw, 20px);
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    margin-bottom: clamp(30px, 5vw, 50px);
    height: clamp(250px, 40vw, 400px);
    position: relative;
    
    iframe {
      transition: transform 0.4s ease;
      
      &:hover {
        transform: scale(1.02);
      }
    }
  }
  
  .contact-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(20px, 4vw, 40px);
    align-items: start;
    
    // Large screens: side by side layout
    @media (min-width: 992px) {
      grid-template-columns: 1fr 1fr;
      gap: clamp(40px, 5vw, 80px);
    }
    
    // Extra large screens: more space
    @media (min-width: 1400px) {
      gap: 100px;
    }
  }
  
  // Form Column
  .form-column {
    width: 100%;
    
    .form-header {
      margin-bottom: clamp(20px, 4vw, 35px);
      text-align: center;
      
      // Left align on larger screens
      @media (min-width: 992px) {
        text-align: left;
      }
      
      .form-title {
        font-size: clamp(1.4rem, 3.5vw, 2rem);
        font-weight: 700;
        color: $dark-color;
        margin-bottom: clamp(8px, 2vw, 15px);
      }
      
      .form-subtitle {
        font-size: clamp(0.9rem, 2vw, 1.1rem);
        color: $secondary-color;
        line-height: 1.6;
        margin: 0;
      }
    }
    
    .contact-form {
      background: $white;
      border-radius: clamp(10px, 2vw, 20px);
      padding: clamp(25px, 5vw, 40px);
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
      transition: all 0.4s ease;
      border: 1px solid rgba(0, 0, 0, 0.05);
      height: fit-content;
      
      &:hover {
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
      }
    }
    
    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: clamp(15px, 3vw, 25px);
      
      // Two columns on larger forms
      @media (min-width: 576px) {
        grid-template-columns: 1fr 1fr;
        
        .form-group {
          &.form-group-full {
            grid-column: span 2;
          }
        }
      }
      
      .form-group {
        display: flex;
        flex-direction: column;
      }
      
      .form-label {
        font-size: clamp(0.85rem, 2vw, 1rem);
        font-weight: 600;
        color: $dark-color;
        margin-bottom: clamp(5px, 1vw, 8px);
      }
      
      .form-control {
        width: 100%;
        border: 2px solid #e1e5e9;
        border-radius: clamp(8px, 1.5vw, 12px);
        padding: clamp(12px, 2.5vw, 16px);
        font-size: clamp(0.85rem, 2vw, 1rem);
        transition: all 0.3s ease;
        background: $white;
        font-family: inherit;
        
        &::placeholder {
          color: #9ca3af;
          opacity: 1;
        }
        
        &:focus {
          border-color: $primary-color;
          box-shadow: 0 0 0 3px rgba($primary-color, 0.1);
          outline: none;
          transform: translateY(-1px);
        }
        
        &:hover:not(:focus) {
          border-color: #c1c9d2;
        }
      }
      
      textarea.form-control {
        resize: vertical;
        min-height: clamp(100px, 15vw, 140px);
      }
      
      .status-messages {
        min-height: clamp(30px, 5vw, 40px);
        margin-bottom: clamp(10px, 2vw, 20px);
        font-size: clamp(0.85rem, 2vw, 0.95rem);
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .loading {
          color: $primary-color;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba($primary-color, 0.2);
          border-left-color: $primary-color;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .error-message {
          color: $danger-color;
          text-align: center;
        }
        
        .sent-message {
          color: $success-color;
          display: flex;
          align-items: center;
          gap: 8px;
          
          i {
            font-size: 1.2em;
          }
        }
      }
      
      .cta-button {
        background: linear-gradient(45deg, $primary-color, #667eea);
        color: $white;
        border: none;
        padding: clamp(12px, 3vw, 18px) clamp(30px, 6vw, 45px);
        border-radius: clamp(25px, 5vw, 35px);
        font-size: clamp(0.9rem, 2vw, 1.1rem);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.4s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: clamp(8px, 2vw, 12px);
        width: 100%;
        position: relative;
        overflow: hidden;
        
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }
        
        &:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(0, 123, 255, 0.4);
          
          &::before {
            left: 100%;
          }
          
          i {
            transform: scale(1.2);
          }
        }
        
        &:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        i {
          transition: transform 0.3s ease;
        }
        
        .btn-loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-left-color: $white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      }
    }
  }
  
  // Info Column
  .info-column {
    width: 100%;
    
    .info-header {
      text-align: center;
      margin-bottom: clamp(20px, 4vw, 30px);
      
      // Left align on larger screens
      @media (min-width: 992px) {
        text-align: left;
      }
      
      .info-title {
        font-size: clamp(1.4rem, 3.5vw, 1.8rem);
        font-weight: 700;
        color: $dark-color;
        margin-bottom: clamp(8px, 2vw, 12px);
      }
      
      .info-subtitle {
        font-size: clamp(0.85rem, 2vw, 1rem);
        color: $secondary-color;
        line-height: 1.5;
        margin: 0;
      }
    }
    
    // Info cards container - stack on mobile, keep stacked on desktop for better alignment
    .info-cards-container {
      display: flex;
      flex-direction: column;
      gap: clamp(15px, 3vw, 25px);
    }
  }
  
  .info-card {
    background: $white;
    border-radius: clamp(10px, 2vw, 20px);
    padding: clamp(20px, 4vw, 30px);
    display: flex;
    align-items: center;
    gap: clamp(15px, 3vw, 25px);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
    position: relative;
    opacity: 0;
    transform: translateY(50px);
    border: 1px solid rgba(0, 0, 0, 0.05);
    
    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }
    
    .card-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: inherit;
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
        border-radius: inherit;
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
        border-radius: inherit;
      }
    }
    
    .icon-container {
      position: relative;
      width: clamp(50px, 8vw, 70px);
      height: clamp(50px, 8vw, 70px);
      flex-shrink: 0;
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
        font-size: clamp(1.5rem, 3vw, 2.2rem);
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
    
    .info-content {
      z-index: 3;
      flex: 1;
      
      .info-title {
        font-size: clamp(1rem, 2.5vw, 1.4rem);
        font-weight: 600;
        color: $dark-color;
        margin-bottom: clamp(5px, 1vw, 10px);
      }
      
      .info-text {
        font-size: clamp(0.85rem, 2vw, 1.1rem);
        color: $secondary-color;
        line-height: 1.6;
        word-break: break-word;
        
        a {
          color: $primary-color;
          text-decoration: none;
          transition: color 0.3s ease;
          
          &:hover {
            color: darken($primary-color, 15%);
            text-decoration: underline;
          }
        }
      }
    }
  }
}

// Hover Effects
.info-card:hover {
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
  
  .card-background {
    .gradient-overlay {
      opacity: 1;
    }
    
    .pattern-dots {
      opacity: 1;
      transform: scale(1.1);
    }
  }
  
  .icon-container {
    .service-icon {
      transform: translate(-50%, -50%) scale(1.15) rotate(5deg);
      color: $white;
    }
    
    .icon-background {
      transform: scale(1.3);
      background: linear-gradient(45deg, $primary-color, #667eea);
    }
    
    .icon-glow {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.6);
    }
  }
}

// Animations
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// Mobile First Responsive Design
@media (max-width: 575px) {
  .container {
    padding: 0 clamp(10px, 2vw, 15px);
  }
  
  .section {
    padding: clamp(30px, 6vw, 50px) 0;
  }
  
  .contact-grid {
    gap: clamp(20px, 4vw, 30px);
  }
  
  .form-column .form-grid {
    grid-template-columns: 1fr;
    
    .form-group.form-group-full {
      grid-column: span 1;
    }
  }
}

// Small devices (landscape phones)
@media (min-width: 576px) and (max-width: 767px) {
  .contact-grid {
    gap: clamp(25px, 4vw, 35px);
  }
}

// Medium devices (tablets)
@media (min-width: 768px) and (max-width: 991px) {
  .section {
    padding: clamp(50px, 8vw, 80px) 0;
  }
  
  .contact-grid {
    gap: clamp(30px, 5vw, 40px);
  }
  
  .form-column, .info-column {
    max-width: 600px;
    margin: 0 auto;
  }
}

// Large devices (desktops) - This is where the main grid layout kicks in
@media (min-width: 992px) {
  .contact-grid {
    align-items: start;
  }
  
  .form-column {
    order: 1;
  }
  
  .info-column {
    order: 2;
    
    .info-cards-container {
      position: sticky;
      top: 2rem;
    }
  }
}

// Extra large devices
@media (min-width: 1200px) {
  .container {
    max-width: 1200px;
  }
  
  .contact-grid {
    gap: clamp(50px, 5vw, 70px);
  }
  
  .form-column .contact-form {
    padding: clamp(35px, 4vw, 45px);
  }
  
  .info-card {
    padding: clamp(25px, 3vw, 35px);
  }
}

// XXL devices
@media (min-width: 1400px) {
  .container {
    max-width: 1400px;
  }
  
  .section {
    padding: clamp(80px, 8vw, 120px) 0;
  }
}

// Ultra-wide screens
@media (min-width: 1600px) {
  .container {
    max-width: 1600px;
  }
  
  .contact-grid {
    gap: 100px;
  }
}

// High DPI screens
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .info-card,
  .contact-form {
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
  }
}

// Reduced motion support
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

// Print styles
@media print {
  .contact-form,
  .map-wrapper {
    display: none;
  }
  
  .info-card {
    box-shadow: none;
    border: 1px solid #ccc;
  }
}
</style>