<template>
  <footer id="footer" class="footer bg-dark-blue">
    <div class="container">
      <!-- Logo Section -->
      <div class="logo-section text-center mb-4">
        <EagerLogo class="logo" />
        <h3 class="company-name">EagerSky</h3>
        <div class="additional-names">
          <span>EagerSky Realty</span>
          <span>Dar es Saalam, Tanzania</span>
        </div>
      </div>

      <!-- Main Footer Content -->
      <div class="footer-content">
        <!-- Address -->
        <div class="footer-item">
          <div class="item-header">
            <h4>Address</h4>
          </div>
          <div class="item-content">
            <p>S.L.P 20950</p>
            <p>Dar es Saalam, Tanzania</p>
          </div>
        </div>

        <!-- Contact -->
        <div class="footer-item">
          <div class="item-header">
            <h4>Contact</h4>
          </div>
          <div class="item-content">
            <p><strong>Phone:</strong> +255 741-681178</p>
            <p><strong>Email:</strong> info@eagerskyreality.com</p>
            <p><strong>Website:</strong> www.eagersky.co.tz</p>
          </div>
        </div>

        <!-- Opening Hours -->
        <div class="footer-item opening-hours">
          <div class="item-header">
            <h4>Opening Hours</h4>
          </div>
          <div class="item-content">
            <p class="hours">24/7</p>
          </div>
        </div>

        <!-- Social Links -->
        <div class="footer-item social-section">
          <div class="item-header">
            <h4>Follow Us</h4>
          </div>
          <div class="social-links">
            <a href="https://facebook.com/eagerskyreality" target="_blank" title="Facebook">
              <img src="/social/facebook.png" alt="Facebook" />
            </a>
            <a href="https://twitter.com/eagerskyreality" target="_blank" title="Twitter">
              <img src="/social/x.png" alt="Twitter" />
            </a>
            <a href="https://instagram.com/eagerskyreality" target="_blank" title="Instagram">
              <img src="/social/instagram.jpeg" alt="Instagram" />
            </a>
            <a href="https://linkedin.com/company/eagerskyreality" target="_blank" title="LinkedIn">
              <img src="/social/linkedin.png" alt="LinkedIn" />
            </a>
          </div>
        </div>
      </div>

      <!-- Copyright -->
      <div class="copyright text-center">
        <p>© Copyright <strong>EagerSky</strong> All Rights Reserved</p>
      </div>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import EagerLogo from './EagerLogo.vue';
</script>

<style lang="scss" scoped>
.footer {
  background: linear-gradient(135deg, #1a2b49 0%, #0f1b35 100%);
  color: #fff;
  padding: 40px 0 20px;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, #007bff 50%, transparent 100%);
  }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 40px;
  .logo {
    width: 80px;
    height: auto;
    max-height: 60px;
    object-fit: contain;
  }
  .company-name {
    font-size: 1.8rem;
    font-weight: 700;
    margin: 0;
  }
  .additional-names {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    span {
      font-size: 0.9rem;
      color: #b8c5d6;
    }
  }
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
  margin-bottom: 40px;
}

.footer-item {
  .item-header {
    margin-bottom: 16px;
    h4 {
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0;
    }
  }
  .item-content {
    p {
      display: flex;
      align-items: center;
      margin: 0 0 8px;
      font-size: 0.95rem;
      color: #d1d5db;
      strong {
        display: inline-block;
        width: 70px; /* Aligns phone and email */
        min-width: 70px;
        font-weight: 500;
        margin-right: 6px;
        color: #fff;
      }
    }
    .hours {
      font-size: 2rem;
      font-weight: bold;
      text-align: center;
    }
  }
}

.social-section {
  .social-links {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    padding-left: 0;
    a {
      display: flex;
      align-items: center;
      justify-content: center;
      img {
        width: 40px;
        height: 40px;
        object-fit: contain;
        border-radius: 8px;
        transition: transform 0.3s ease;
        &:hover {
          transform: translateY(-3px);
        }
      }
    }
  }
}

.copyright {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 24px;
  p {
    font-size: 0.9rem;
    color: #9ca3af;
    margin: 0;
    strong {
      color: #fff;
    }
  }
}

@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .footer-item {
    text-align: center;
    .item-content p {
      justify-content: center;
      strong {
        width: auto;
        min-width: 0;
      }
    }
  }
  .social-links {
    justify-content: center;
  }
}
</style>
