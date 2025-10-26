import axios, { AxiosRequestConfig, AxiosResponse, AxiosProgressEvent } from 'axios';

interface IRequestParams {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, any>;
  responseType?: 'json' | 'blob';
  requiresAuth?: boolean;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  signal?: AbortSignal;
}

async function makeRequest<T = any>(options: IRequestParams): Promise<AxiosResponse<T>> {
  let token: string | null = null;
  if (options.requiresAuth) {
    token = localStorage.getItem('authToken');
    if (token) {
      console.log('Token found in localStorage under key: authToken', { token });
    } else {
      const possibleTokenKeys = ['auth_token', 'token', 'access_token', 'jwt'];
      for (const key of possibleTokenKeys) {
        token = localStorage.getItem(key);
        if (token) {
          console.log(`Token found in localStorage under key: ${key}`, { token });
          break;
        }
      }
      if (!token) {
        const userProfileString = localStorage.getItem('userData');
        if (userProfileString) {
          try {
            const userProfile = JSON.parse(userProfileString);
            token = userProfile.token || null;
            if (token) {
              console.log('Token found in localStorage.userData.token', { token });
            } else {
              console.error('No token field found in userData:', userProfile);
            }
          } catch (error) {
            console.error('Failed to parse userData from localStorage:', error);
          }
        }
        if (!token) {
          console.error('No authentication token found in localStorage for keys:', ['authToken', ...possibleTokenKeys], 'or userData.token for request to:', options.url);
          throw new Error(`No authentication token found for request to ${options.url}. Please log in again.`);
        }
      }
    }
  }

  const config: AxiosRequestConfig = {
    method: options.method,
    url: options.url,
    headers: {
      Accept: 'application/json',
      ...(token && options.requiresAuth ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    responseType: options.responseType || 'json',
    withCredentials: options.requiresAuth,
    onUploadProgress: options.onUploadProgress,
    signal: options.signal,
  };

  config.headers = config.headers || {};

  if (options.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else {
    config.headers['Content-Type'] = 'application/json';
  }

  if (options.method.toLowerCase() === 'get') {
    config.params = options.params;
  } else {
    config.data = options.data;
  }

  console.log('Making request:', {
    url: options.url,
    method: options.method,
    headers: config.headers,
    data: options.data instanceof FormData ? 'FormData' : options.data,
    params: options.params,
    signal: options.signal ? 'AbortSignal' : undefined,
  });

  try {
    const response = await axios.request<T>(config);

    if (
      response.data === '' ||
      response.data === null ||
      (typeof response.data === 'string' && response.data.trim() === '')
    ) {
      console.warn(`Received an empty but successful response from: ${options.url}`);
      return { ...response, data: {} as T };
    }

    return response;
  } catch (error: any) {
    const isAxiosError = axios.isAxiosError(error);

    const errorDetails = {
      url: options.url,
      method: options.method,
      errorMessage: error.message,
      response: isAxiosError
        ? {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: typeof error.response?.data === 'string' ? error.response.data : error.response?.data,
          }
        : 'No Axios response received',
    };
    console.error('Request failed:', errorDetails);

    throw error; // Throw the original Axios error to preserve response.data
  }
}

export default makeRequest;