import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthState {
  tenDangNhap: string;
  tenQuyen: string;
}

interface AuthContextValue {
  user: AuthState | null;
  setSession: (token: string, user: AuthState) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(() => {
    const tenDangNhap = localStorage.getItem('tenDangNhap');
    const tenQuyen = localStorage.getItem('tenQuyen');
    return tenDangNhap && tenQuyen ? { tenDangNhap, tenQuyen } : null;
  });

  function setSession(token: string, newUser: AuthState) {
    localStorage.setItem('token', token);
    localStorage.setItem('tenDangNhap', newUser.tenDangNhap);
    localStorage.setItem('tenQuyen', newUser.tenQuyen);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('tenDangNhap');
    localStorage.removeItem('tenQuyen');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
