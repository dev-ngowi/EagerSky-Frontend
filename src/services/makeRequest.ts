import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

interface IRequestParams {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, any>;
  responseType?: 'json' | 'blob';
  requiresAuth?: boolean;
}

async function makeRequest<T = any>(options: IRequestParams): Promise<AxiosResponse<T>> {
  let token: string | null = null;
  if (options.requiresAuth) {
    // Prioritize authToken to match auth-store.ts
    token = localStorage.getItem('authToken');
    if (token) {
      console.log('Token found in localStorage under key: authToken', { token });
    } else {
      // Fallback to other possible token keys
      const possibleTokenKeys = ['auth_token', 'token', 'access_token', 'jwt'];
      for (const key of possibleTokenKeys) {
        token = localStorage.getItem(key);
        if (token) {
          console.log(`Token found in localStorage under key: ${key}`, { token });
          break;
        }
      }
      // Try userProfile.token as last resort
      if (!token) {
        const userProfileString = localStorage.getItem('userProfile');
        if (userProfileString) {
          try {
            const userProfile = JSON.parse(userProfileString);
            token = userProfile.token || null;
            if (token) {
              console.log('Token found in localStorage.userProfile.token', { token });
            } else {
              console.error('No token field found in userProfile:', userProfile);
            }
          } catch (error) {
            console.error('Failed to parse userProfile from localStorage:', error);
          }
        }
      }
      if (!token) {
        console.error('No authentication token found in localStorage for keys:', ['authToken', ...possibleTokenKeys], 'or userProfile.token for request to:', options.url);
        throw new Error(`No authentication token found for request to ${options.url}. Please log in again.`);
      }
    }
  }

  const config: AxiosRequestConfig = {
    method: options.method,
    url: options.url,
    headers: {
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    responseType: options.responseType || 'json',
    withCredentials: true,
  };

  // Ensure headers is defined
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

    if (isAxiosError && error.response) {
      const responseData = error.response.data;
      const responseStatus = error.response.status;

      if (typeof responseData === 'string') {
        if (responseData.trim().startsWith('{') || responseData.trim().startsWith('[')) {
          try {
            const parsedJson = JSON.parse(responseData);
            const message = parsedJson.message || parsedJson.error || 'An error occurred.';
            throw new Error(`HTTP ${responseStatus}: ${message}`);
          } catch (parseError) {
            throw new Error(`HTTP ${responseStatus}: Failed to parse JSON response from the server.`);
          }
        } else {
          throw new Error(`HTTP ${responseStatus}: The server returned a non-JSON response.`);
        }
      }

      if (typeof responseData === 'object' && responseData !== null) {
        const message = responseData.message || responseData.error || error.message || 'An unknown error occurred.';
        throw new Error(`HTTP ${responseStatus}: ${message}`);
      }
    }

    throw new Error(`An unexpected error occurred: ${error.message || String(error)}`);
  }
}

export default makeRequest;