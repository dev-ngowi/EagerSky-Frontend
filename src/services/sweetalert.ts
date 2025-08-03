import Swal from 'sweetalert2'

class SweetAlert {
  static success(options: any) {
    return Swal.fire({
      title: options.title || 'Success',
      text: options.message,
      icon: 'success',
      showCancelButton: options.showCancelButton || false,
      confirmButtonText: options.confirmButtonText || 'OK',
      confirmButtonColor: options.confirmButtonColor,
      cancelButtonColor: options.cancelButtonColor,
      cancelButtonText: options.cancelButtonText,
    })
  }

  static warning(options: any) {
    return Swal.fire({
      title: options.title || 'Warning',
      text: options.message,
      icon: 'warning',
      showCancelButton: options.showCancelButton || false,
      confirmButtonText: options.confirmButtonText || 'OK',
      confirmButtonColor: options.confirmButtonColor,
      cancelButtonColor: options.cancelButtonColor,
      cancelButtonText: options.cancelButtonText,
    })
  }

  static error(options: any) {
    return Swal.fire({
      title: options.title || 'Error',
      text: options.message,
      icon: 'error',
      showCancelButton: options.showCancelButton || false,
      confirmButtonText: options.confirmButtonText || 'OK',
      confirmButtonColor: options.confirmButtonColor,
      cancelButtonColor: options.cancelButtonColor,
      cancelButtonText: options.cancelButtonText,
    })
  }
}

export default SweetAlert
