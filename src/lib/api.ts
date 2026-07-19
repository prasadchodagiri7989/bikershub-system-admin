export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getHeaders(): HeadersInit {
  const token = localStorage.getItem("admin_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Silent access-token refresh ────────────────────────────────
// The refresh token lives in an httpOnly cookie sent automatically
// (credentials: "include") — this exchanges it for a fresh short-lived
// access token once the current one has expired, so admins stay logged in
// without re-entering their password every 15 minutes.
type AdminAuthListener = (token: string | null, user: any | null) => void;
let authListener: AdminAuthListener | null = null;
export function onAdminAuthRefresh(listener: AdminAuthListener) { authListener = listener; }

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAdminAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        authListener?.(null, null);
        return null;
      }
      const data = await res.json();
      if (data.user?.role !== "admin") {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        authListener?.(null, null);
        return null;
      }
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", JSON.stringify({ ...data.user, token: data.token }));
      authListener?.(data.token, data.user);
      return data.token as string;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

const NO_RETRY_PATHS = ["/auth/login", "/auth/refresh"];

async function request<T>(path: string, options?: RequestInit, _retry = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options?.headers || {}) },
    credentials: "include",
  });

  if (res.status === 401 && _retry && !NO_RETRY_PATHS.includes(path)) {
    const newToken = await refreshAdminAccessToken();
    if (newToken) return request<T>(path, options, false);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API Error ${res.status}`);
  }
  return res.json();
}

async function upload<T>(path: string, formData: FormData, method: "POST" | "PUT" = "POST", _retry = true): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    credentials: "include",
  });

  if (res.status === 401 && _retry) {
    const newToken = await refreshAdminAccessToken();
    if (newToken) return upload<T>(path, formData, method, false);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Products
  getProducts: (params?: string) => request<any>(`/products${params ? `?${params}` : ""}`),
  getProduct: (id: string) => request<any>(`/products/${id}`),
  createProduct: (data: any) => request<any>("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request<any>(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  // Multipart variants: used when the admin has staged new image files (field name "images", max 5).
  createProductMultipart: (formData: FormData) => upload<any>("/products", formData, "POST"),
  updateProductMultipart: (id: string, formData: FormData) => upload<any>(`/products/${id}`, formData, "PUT"),
  deleteProduct: (id: string) => request<any>(`/products/${id}`, { method: "DELETE" }),

  // Orders
  getOrders: (params?: string) => request<any>(`/orders${params ? `?${params}` : ""}`),
  getOrder: (id: string) => request<any>(`/orders/${id}`),
  updateOrderStatus: (id: string, data: any) => request<any>(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify(data) }),

  // Homepage content (categories, featured collections, trending cards, limited-time offers)
  getHomeItems: (resource: string) => request<{ items: any[] }>(`/home/${resource}`),
  createHomeItem: (resource: string, data: any) => request<{ item: any }>(`/home/${resource}`, { method: "POST", body: JSON.stringify(data) }),
  updateHomeItem: (resource: string, id: string, data: any) => request<{ item: any }>(`/home/${resource}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteHomeItem: (resource: string, id: string) => request<{ success: boolean }>(`/home/${resource}/${id}`, { method: "DELETE" }),
  moveHomeItem: (resource: string, id: string, direction: "up" | "down") =>
    request<{ items: any[] }>(`/home/${resource}/${id}/move`, { method: "PUT", body: JSON.stringify({ direction }) }),
  uploadHomeImage: (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return upload<{ url: string }>("/home/upload-image", fd, "POST");
  },

  // Bikes (shared brand/model master data — also powers the customer "Shop by Bike" list)
  getBikes: () => request<{ brands: Record<string, string[]> }>("/bikes"),
  addBikeBrand: (brand: string) =>
    request<{ brands: Record<string, string[]> }>("/bikes/brands", { method: "POST", body: JSON.stringify({ brand }) }),
  renameBikeBrand: (brand: string, newName: string) =>
    request<{ brands: Record<string, string[]> }>(`/bikes/brands/${encodeURIComponent(brand)}`, { method: "PUT", body: JSON.stringify({ brand: newName }) }),
  deleteBikeBrand: (brand: string) =>
    request<{ brands: Record<string, string[]> }>(`/bikes/brands/${encodeURIComponent(brand)}`, { method: "DELETE" }),
  addBikeModel: (brand: string, model: string) =>
    request<{ brands: Record<string, string[]> }>(`/bikes/brands/${encodeURIComponent(brand)}/models`, { method: "POST", body: JSON.stringify({ model }) }),
  deleteBikeModel: (brand: string, model: string) =>
    request<{ brands: Record<string, string[]> }>(`/bikes/brands/${encodeURIComponent(brand)}/models/${encodeURIComponent(model)}`, { method: "DELETE" }),

  // Users
  getUsers: (params?: string) => request<any>(`/users${params ? `?${params}` : ""}`),
  getUser: (id: string) => request<any>(`/users/${id}`),
  updateUser: (id: string, data: any) => request<any>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Reviews
  getProductReviews: (productId: string) => request<any>(`/reviews/product/${productId}`),
  getAllReviews: (params?: string) => request<any>(`/admin/reviews${params ? `?${params}` : ""}`),
  deleteReview: (id: string) => request<any>(`/reviews/${id}`, { method: "DELETE" }),
  flagReview: (id: string) => request<any>(`/reviews/${id}/flag`, { method: "PUT" }),

  // Analytics
  getAnalytics: (range: number) => request<any>(`/admin/analytics?range=${range}`),
  getDashboard: () => request<any>("/admin/dashboard"),
  getCategoryBreakdown: (range = 30) => request<any>(`/admin/analytics/category-breakdown?range=${range}`),

  // Users - role / status
  promoteUser: (id: string, role: "admin" | "user") =>
    request<any>(`/users/${id}`, { method: "PUT", body: JSON.stringify({ role }) }),
  toggleUserActive: (id: string) =>
    request<any>(`/users/${id}/ban`, { method: "PUT" }),

  // Products - bulk import (CSV file upload)
  bulkImportProducts: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return upload<any>("/admin/products/bulk-import", fd);
  },

  // Products - bulk import (JSON rows with selection support)
  bulkImportProductsJson: (rows: Record<string, string>[]) =>
    request<any>("/admin/products/bulk-import-json", {
      method: "POST",
      body: JSON.stringify(rows),
    }),

  // AI Insights - Gemini powered
  generateAIInsights: () =>
    request<any>("/admin/ai-insights/gemini", { method: "POST" }),

  // Auth
  login: (email: string, password: string) => request<any>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<any>("/auth/logout", { method: "POST" }),

  // Settings
  getSettings: () => request<any>("/admin/settings"),
  updateSettings: (data: any) => request<any>("/admin/settings", { method: "PUT", body: JSON.stringify(data) }),
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<any>("/admin/settings/password", { method: "PUT", body: JSON.stringify(data) }),

  // Profile (current user)
  updateProfile: (data: any) => request<any>("/auth/me", { method: "PUT", body: JSON.stringify(data) }),

  // ── Shiprocket ────────────────────────────────────────────
  getShiprocketStats: () => request<any>("/admin/shiprocket/stats"),
  getShiprocketOrders: (params?: string) => request<any>(`/admin/shiprocket/orders${params ? `?${params}` : ""}`),
  getShiprocketSrOrders: (params?: string) => request<any>(`/admin/shiprocket/sr-orders${params ? `?${params}` : ""}`),
  shiprocketGenerateAwb: (orderId: string) => request<any>(`/admin/shiprocket/orders/${orderId}/generate-awb`, { method: "POST" }),
  shiprocketRequestPickup: (orderId: string) => request<any>(`/admin/shiprocket/orders/${orderId}/request-pickup`, { method: "POST" }),
  shiprocketGenerateLabel: (orderId: string) => request<any>(`/admin/shiprocket/orders/${orderId}/generate-label`, { method: "POST" }),
  shiprocketCancelOrder: (orderId: string) => request<any>(`/admin/shiprocket/orders/${orderId}/cancel`, { method: "POST" }),
  shiprocketTrack: (awb: string) => request<any>(`/admin/shiprocket/track/${awb}`),
};
