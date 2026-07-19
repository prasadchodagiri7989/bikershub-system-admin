import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { API_BASE, api, onAdminAuthRefresh, refreshAdminAccessToken } from "@/lib/api";

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
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage immediately, then validate/renew the session
  // in the background via the httpOnly refresh cookie so admins don't get
  // bounced to /login just because the 15-minute access token expired.
  useEffect(() => {
    refreshAdminAccessToken().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    onAdminAuthRefresh((tok, u) => {
      if (!tok || !u) { setUser(null); return; }
      setUser({ id: u.id, name: u.name, email: u.email, role: u.role, token: tok });
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
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
    // Fire-and-forget the server call (revokes the refresh cookie); always
    // clear client-side state regardless of whether it succeeds.
    api.logout().catch(() => null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
