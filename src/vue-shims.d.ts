import { SweetAlert2 } from 'sweetalert2';
import { ComponentCustomProperties } from 'vue';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $swal: typeof SweetAlert2;
  }
}

// Allow importing .vue files in TypeScript
declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Allow importing various asset types
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp';
declare module '*.avif';
declare module '*.css';
declare module '*.scss';
declare module '*.less';
