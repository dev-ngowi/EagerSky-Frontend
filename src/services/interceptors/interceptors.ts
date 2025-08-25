import axios from 'axios'
import router from '../../router'

// Define the user data interface
interface UserData {
  token: string
  [key: string]: any // Allow for additional properties
}

interface SessionData extends UserData {
  expiresAt: number
}

// Function to set session data with expiration
const setSessionData = (data: UserData): void => {
  const expirationTime = new Date().getTime() + 30 * 60 * 1000 // 30 minutes from now
  sessionStorage.setItem(
    'userData',
    JSON.stringify({
      ...data,
      expiresAt: expirationTime,
    }),
  )
}

// Function to get session data and check expiration
const getSessionData = (): SessionData | null => {
  const userData = sessionStorage.getItem('userData')
  if (!userData) return null
  
  const parsedData = JSON.parse(userData) as SessionData
  if (new Date().getTime() > parsedData.expiresAt) {
    sessionStorage.removeItem('userData')
    return null
  }
  return parsedData
}

// Request interceptor
axios.interceptors.request.use(
  function (config) {
    const toBeIgnoredUrl = [
      '/v1/login',
      '/v1/users',
      '/v1/password/reset-request',
      '/v1/password/reset',
      '/v1/resend-otp',
    ]
    const isToBeIgnored = toBeIgnoredUrl.some((url) => config.url?.includes(url))
    if (!isToBeIgnored) {
      const sessionData = getSessionData()
      if (sessionData && sessionData.token) {
        config.headers.Authorization = `Bearer ${sessionData.token}`
      }
    }
    return config
  },
  function (error) {
    console.error('Request error:', error)
    return Promise.reject(error)
  },
)

// Response interceptor
axios.interceptors.response.use(
  function (response) {
    // Store login data on successful login
    if (response.config.url?.includes('/v1/login') && response.data.data) {
      setSessionData(response.data.data)
    }
    return response
  },
  function (error) {
    if (error.response && error.response.status === 401) {
      // Clear session data on unauthorized error
      sessionStorage.removeItem('userData')
      // Avoid redirecting if already on auth pages or home
      if (
        router.currentRoute.value.path !== '/auth/login' &&
        router.currentRoute.value.path !== '/auth/signup' &&
        router.currentRoute.value.path !== '/auth/recover-password' &&
        router.currentRoute.value.path !== '/auth/recover-password-email' &&
        router.currentRoute.value.path !== '/'
      ) {
        router.push('/auth/login')
      }
    }
    return Promise.reject(error)
  },
)