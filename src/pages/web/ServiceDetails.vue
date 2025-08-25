<template>
  <div class="service-details-page">
    <!-- Section Title -->
    <div class="section-title text-center" data-aos="fade-up">
      <div class="title-wrapper">
        <h2 class="main-title">Service Details</h2>
        <div class="title-underline"></div>
        <p class="section-description">
          Explore our comprehensive real estate services tailored to meet your needs in Tanzania's property market.
        </p>
      </div>
    </div>

    <!-- Service Details Section -->
    <section id="service-details" class="service-details section">
      <div class="container">
        <div class="row gy-4">
          <!-- Left Sidebar -->
          <div class="col-lg-4" data-aos="fade-up" data-aos-delay="100">
            <div class="sidebar-wrapper">
              <div class="service-box">
                <h4>Services List</h4>
                <div class="services-list">
                  <router-link
                    v-for="service in services"
                    :key="service.id"
                    :to="`/service-details?service_id=${service.id}`"
                    :class="{ active: service.id === currentService?.id }"
                  >
                    <i class="bi bi-arrow-right-circle"></i>
                    <span>{{ service.title }}</span>
                  </router-link>
                </div>
              </div>

              <div class="help-box">
                <i class="bi bi-headset help-icon"></i>
                <h4>Have a Question?</h4>
                <p class="contact-item">
                  <i class="bi bi-telephone"></i>
                  <span>+255 741-681178</span>
                </p>
                <p class="contact-item">
                  <i class="bi bi-envelope"></i>
                  <a href="mailto:info@eagerskyreality.com">info@eagerskyreality.com</a>
                </p>
              </div>
            </div>
          </div>

          <!-- Right Content -->
          <div class="col-lg-8" data-aos="fade-up" data-aos-delay="200">
            <div class="content-wrapper">
              <div v-if="currentService" class="service-content">
                <div class="service-image-container">
                  <img
                    :src="getServiceImage(currentService.id)"
                    :alt="currentService.title || 'Service Image'"
                    class="img-fluid services-img"
                    @error="handleImageError"
                  >
                </div>
                <div class="service-info">
                  <h3>{{ currentService.title }}</h3>
                  <p class="service-description">{{ currentService.description }}</p>
                  <div v-if="currentService.features && currentService.features.length" class="features-section">
                    <h4>Key Features:</h4>
                    <ul class="features-list">
                      <li v-for="feature in currentService.features" :key="feature">
                        <i class="bi bi-check-circle"></i>
                        <span>{{ feature }}</span>
                      </li>
                    </ul>
                  </div>
                  <div class="additional-info">
                    <p class="service-additional">{{ currentService.additional }}</p>
                  </div>
                </div>
              </div>
              <div v-else class="service-content">
                <div class="service-image-container">
                  <img
                    :src="getDefaultImage()"
                    alt="Default Service Image"
                    class="img-fluid services-img"
                  >
                </div>
                <div class="service-info">
                  <h3>Service Not Found</h3>
                  <p class="service-description">The requested service could not be found. Please select a service from the list on the left.</p>
                  <p class="service-additional">Contact our support team at <a href="mailto:info@eagerskyreality.com">info@eagerskyreality.com</a> for assistance.</p>
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
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const services = ref([
  {
    id: 1,
    title: "Property Management",
    description: "Our property management services ensure your real estate investments are well-maintained and profitable. We handle tenant relations, maintenance, rent collection, and compliance with local regulations in Tanzania.",
    features: [
      "Tenant screening and lease management",
      "Regular property maintenance and inspections",
      "Financial reporting and rent collection",
      "Compliance with Tanzanian property laws"
    ],
    additional: "Our team provides personalized property management solutions, ensuring your properties in Dodoma, Dar es Salaam, Arusha, and beyond are managed efficiently."
  },
  {
    id: 2,
    title: "Permanent and Temporary Home Stay",
    description: "We provide fully furnished accommodations for both short-term visitors and long-term residents in Tanzania, ensuring comfort and convenience in prime locations.",
    features: [
      "Fully furnished homes and apartments",
      "Flexible lease terms",
      "24/7 support for tenants",
      "Prime locations in Dodoma, Dar es Salaam, and Arusha"
    ],
    additional: "Whether you're visiting for a short stay or relocating permanently, our home stay solutions offer comfort and flexibility tailored to your needs."
  },
  {
    id: 3,
    title: "Office and Commercial Renting",
    description: "We offer premium office and commercial spaces for businesses, with flexible rental options tailored to your needs in Tanzania's growing commercial hubs.",
    features: [
      "Modern office spaces with amenities",
      "Flexible rental agreements",
      "Strategic locations for business growth",
      "Maintenance and support services"
    ],
    additional: "Our commercial properties are designed to support business success, offering modern facilities and strategic locations across Tanzania."
  },
  {
    id: 4,
    title: "Property Management Software Distribution",
    description: "Our property management software solutions streamline landlord operations, offering tools for tenant management, payment tracking, and property maintenance scheduling.",
    features: [
      "User-friendly property management software",
      "Automated rent collection and reminders",
      "Maintenance request tracking",
      "Integration with existing systems"
    ],
    additional: "We are the bridge between cutting-edge property tech and landlords, making property management effortless and efficient."
  },
  {
    id: 5,
    title: "Property Marketing and Advertising",
    description: "We employ targeted marketing strategies to maximize exposure for your properties, using both digital and traditional channels to reach potential buyers and tenants in Tanzania.",
    features: [
      "Professional photography and virtual tours",
      "Social media and online advertising",
      "Local and international marketing campaigns",
      "Market analysis for optimal pricing"
    ],
    additional: "Our marketing expertise ensures your properties stand out in the competitive Tanzanian real estate market."
  },
  {
    id: 6,
    title: "Property Interior and Exterior Design",
    description: "Our design team transforms properties with innovative interior and exterior solutions, increasing aesthetic appeal and market value for sales or rentals.",
    features: [
      "Custom interior design solutions",
      "Exterior landscaping and renovations",
      "Space optimization for functionality",
      "Eco-friendly design options"
    ],
    additional: "Enhance your property's value and appeal with our creative design solutions tailored to the Tanzanian market."
  }
]);

const currentService = computed(() => {
  const serviceId = Number(route.query.service_id);
  return services.value.find(s => s.id === serviceId);
});

// Image handling functions
const getServiceImage = (serviceId: number) => {
  const imageMap: { [key: number]: string } = {
    1: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1073&q=80', // Property Management
    2: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1180&q=80', // Home Stay
    3: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1169&q=80', // Office Commercial
    4: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80', // Software
    5: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1115&q=80', // Marketing
    6: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1158&q=80'  // Interior Design
  };
  
  return imageMap[serviceId] || getDefaultImage();
};

const getDefaultImage = () => {
  return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1073&q=80';
};

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src = getDefaultImage();
};

const downloadCatalog = async (url: string) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      window.open(url, '_blank');
    } else {
      alert('Sorry, the catalog file is not available at the moment. Please contact support at info@eagerskyreality.com.');
    }
  } catch (error) {
    alert('Sorry, the catalog file is not available at the moment. Please contact support at info@eagerskyreality.com.');
  }
};

onMounted(() => {
  // Initialize AOS animations if AOS is available
  if (window.AOS) {
    window.AOS.init({
      duration: 1000,
      once: true,
    });
  }
});
</script>

<style lang="scss" scoped>
@import '../../scss/variables';

// Color Variables
$primary-color: #007bff;
$secondary-color: #6c757d;
$success-color: #28a745;
$light-color: #f8f9fa;
$dark-color: #212529;
$white: #ffffff;

.service-details-page {
  font-family: 'Poppins', sans-serif;
  padding-top: 80px;
}

// Section Title
.section-title {
  margin-bottom: 60px;
  padding-top: 40px;

  .title-wrapper {
    max-width: 800px;
    margin: 0 auto;

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

// Service Details Section
.service-details.section {
  padding: 80px 0;

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 15px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 30px;
  }

  .col-lg-4 {
    flex: 0 0 auto;
    width: calc(33.333333% - 20px);
    min-width: 300px;
  }

  .col-lg-8 {
    flex: 1;
    min-width: 0;
  }

  // Sidebar Wrapper
  .sidebar-wrapper {
    display: flex;
    flex-direction: column;
    gap: 20px;
    height: fit-content;
    position: sticky;
    top: 100px;
  }

  // Content Wrapper
  .content-wrapper {
    background: $white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    height: fit-content;
  }

  .service-content {
    display: flex;
    flex-direction: column;
    gap: 25px;
  }

  .service-image-container {
    width: 100%;
    overflow: hidden;
    border-radius: 12px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }

  .services-img {
    width: 100%;
    height: 300px;
    object-fit: cover;
    transition: transform 0.3s ease;

    &:hover {
      transform: scale(1.02);
    }
  }

  .service-info {
    display: flex;
    flex-direction: column;
    gap: 20px;

    h3 {
      font-size: clamp(1.8rem, 4vw, 2.2rem);
      font-weight: 700;
      color: $dark-color;
      margin: 0;
      line-height: 1.3;
    }

    .service-description {
      font-size: clamp(0.95rem, 3vw, 1.15rem);
      color: $secondary-color;
      line-height: 1.8;
      margin: 0;
    }

    .features-section {
      h4 {
        font-size: clamp(1.1rem, 3vw, 1.3rem);
        font-weight: 600;
        color: $dark-color;
        margin-bottom: 15px;
      }

      .features-list {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: clamp(0.9rem, 2.5vw, 1rem);
          color: $secondary-color;
          margin-bottom: 12px;
          line-height: 1.6;

          i {
            color: $success-color;
            font-size: clamp(0.9rem, 2vw, 1rem);
            margin-top: 2px;
            flex-shrink: 0;
          }

          span {
            flex: 1;
          }
        }
      }
    }

    .additional-info {
      .service-additional {
        font-size: clamp(0.95rem, 3vw, 1.15rem);
        color: $secondary-color;
        line-height: 1.8;
        margin: 0;
        padding: 20px;
        background: rgba($primary-color, 0.05);
        border-left: 4px solid $primary-color;
        border-radius: 0 8px 8px 0;
      }
    }
  }

  // Service Box
  .service-box {
    background: $white;
    border-radius: 12px;
    padding: 25px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    h4 {
      font-size: clamp(1.2rem, 3vw, 1.5rem);
      font-weight: 700;
      color: $dark-color;
      margin-bottom: 20px;
      border-bottom: 2px solid $primary-color;
      padding-bottom: 10px;
    }

    .services-list {
      display: flex;
      flex-direction: column;
      gap: 8px;

      a {
        display: flex;
        align-items: center;
        gap: 12px;
        color: $secondary-color;
        text-decoration: none;
        padding: 12px 15px;
        border-radius: 8px;
        font-size: clamp(0.9rem, 2.5vw, 1rem);
        transition: all 0.3s ease;
        position: relative;

        &.active,
        &:hover {
          background: rgba($primary-color, 0.15);
          color: $primary-color;
          transform: translateX(5px);

          i {
            transform: rotate(90deg);
          }
        }

        i {
          font-size: clamp(0.9rem, 2vw, 1rem);
          transition: transform 0.3s ease;
        }
      }
    }

    .download-catalog {
      display: flex;
      flex-direction: column;
      gap: 8px;

      a {
        display: flex;
        align-items: center;
        gap: 12px;
        color: $secondary-color;
        text-decoration: none;
        padding: 12px 15px;
        border-radius: 8px;
        font-size: clamp(0.9rem, 2.5vw, 1rem);
        transition: all 0.3s ease;

        &:hover {
          background: rgba($success-color, 0.15);
          color: $success-color;
          transform: translateX(5px);
        }

        i {
          font-size: clamp(1rem, 2vw, 1.2rem);
        }
      }
    }
  }

  // Help Box
  .help-box {
    background: linear-gradient(45deg, $primary-color, #667eea);
    color: $white;
    padding: 25px;
    border-radius: 12px;
    text-align: center;
    transition: transform 0.3s ease;

    &:hover {
      transform: translateY(-2px);
    }

    .help-icon {
      font-size: 2.8rem;
      margin-bottom: 15px;
      animation: pulse 2s infinite;
    }

    h4 {
      font-size: clamp(1.2rem, 3vw, 1.5rem);
      font-weight: 700;
      margin-bottom: 15px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: clamp(0.9rem, 2.5vw, 1rem);
      color: $white;
      margin-bottom: 10px;

      &:last-child {
        margin-bottom: 0;
      }

      i {
        font-size: clamp(0.9rem, 2vw, 1rem);
      }

      a {
        color: $white;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}

// Animations
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

// Responsive Design
@media (max-width: 1200px) {
  .service-details.section {
    .container {
      max-width: 95%;
    }
  }
}

@media (max-width: 992px) {
  .service-details.section {
    padding: 60px 0;

    .row {
      flex-direction: column;
      gap: 20px;
    }

    .col-lg-4 {
      width: 100%;
      order: 2;
    }

    .col-lg-8 {
      width: 100%;
      order: 1;
    }

    .sidebar-wrapper {
      position: static;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 15px;

      .service-box,
      .help-box {
        flex: 1;
        min-width: 250px;
      }
    }

    .content-wrapper {
      padding: 25px;
    }
  }
}

@media (max-width: 768px) {
  .service-details.section {
    padding: 40px 0;

    .sidebar-wrapper {
      flex-direction: column;

      .service-box,
      .help-box {
        min-width: auto;
      }
    }

    .content-wrapper {
      padding: 20px;
    }

    .services-img {
      height: 250px;
    }
  }
}

@media (max-width: 480px) {
  .service-details.section {
    padding: 30px 0;

    .services-img {
      height: 200px;
    }

    .service-box,
    .help-box {
      padding: 20px;
    }
  }
}
</style>