import { jwtDecode } from 'jwt-decode'

export function isloggedIn(token: string | null): boolean {
  if (!token) return false // No token provided

  try {
    const decoded: any = jwtDecode(token)
    if (!decoded.exp) return false // No expiration field in token
    return decoded.exp * 1000 > Date.now() // Check if still valid
  } catch (error) {
    console.error('Invalid token:', error)
    return false // Token is invalid
  }
}
