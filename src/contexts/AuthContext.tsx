import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "admin_user";

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: AuthUser = JSON.parse(raw);
    if (parsed.role !== "admin") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("admin_token");
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Login failed" }));
      throw new Error(err.message || "Invalid credentials");
    }

    const data = await res.json();

    // data may be { user: {...}, token: "..." } or flat { ...user, token }
    const authUser: AuthUser = {
      id: data.user?.id ?? data.id,
      name: data.user?.name ?? data.name ?? "Admin",
      email: data.user?.email ?? data.email ?? email,
      role: data.user?.role ?? data.role,
      token: data.token,
    };

    if (authUser.role !== "admin") {
      throw new Error("Access denied. Only admin users can log in.");
    }

    localStorage.setItem("admin_token", authUser.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
