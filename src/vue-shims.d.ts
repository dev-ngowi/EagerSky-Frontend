import { SweetAlert2 } from 'sweetalert2';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $swal: typeof SweetAlert2;
  }
}