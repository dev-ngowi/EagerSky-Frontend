declare global {
  interface Window {
    AOS: {
      init: (options?: {
        duration?: number;
        once?: boolean;
        offset?: number;
        [key: string]: any;
      }) => void;
    };
  }
}

export {};