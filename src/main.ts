import { createApp } from 'vue';
import App from './App.vue';
import { createI18n } from 'vue-i18n';
import { createVuestic } from 'vuestic-ui';
import { createPinia } from 'pinia';
import router from './router';
import Swal from 'sweetalert2';
import './scss/main.scss';
import './services/interceptors/interceptors';
import AOS from 'aos';
import 'aos/dist/aos.css';
import 'bootstrap/dist/js/bootstrap.bundle';
import 'swiper/swiper-bundle.css';

const messages = {
  en: {
    AppName: 'EagerSky',
    Home: 'Home',
    Properties: 'Properties',
    Services: 'Services',
    About: 'About',
    Contact: 'Contact',
    'My Account': 'My Account',
    Login: 'Login',
  },
};

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages,
});

const stores = createPinia();

const vuesticGlobalConfig = {};

const app = createApp(App);

// Register SweetAlert2 globally
app.config.globalProperties.$swal = Swal;

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err, info);
  app.config.globalProperties.$toast?.init({
    message: 'An unexpected error occurred. Please try again.',
    color: 'danger',
  });
};

app.use(stores);
app.use(router);
app.use(i18n);
app.use(createVuestic({ config: vuesticGlobalConfig }));

// Initialize AOS after mounting
app.mount('#app');

setTimeout(() => {
  AOS.init({
    duration: 1000,
    once: true,
  });
}, 0);