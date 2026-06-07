import React, { createContext, useContext, useEffect, useState } from 'react'

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
})

const API_BASE_URL = 'https://api.haxnation.org/ctf/api'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' })
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        throw new Error('Not authenticated')
      })
      .then((data) => {
        if (data.authenticated && data.name) {
          setUser(data)
        } else {
          setUser(null)
        }
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const login = () => {
    // Match the main CTF site: pass pathname only, not full href
    const currentPath = window.location.pathname + window.location.search + window.location.hash
    window.location.href = `${API_BASE_URL}/auth/login?returnTo=${encodeURIComponent(currentPath)}`
  }

  const logout = () => {
    fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
      .finally(() => {
        window.location.reload()
      })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
