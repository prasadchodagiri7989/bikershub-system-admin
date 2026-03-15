const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getHeaders(): HeadersInit {
  const token = localStorage.getItem("admin_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API Error ${res.status}`);
  }
  return res.json();
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
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
  deleteProduct: (id: string) => request<any>(`/products/${id}`, { method: "DELETE" }),

  // Orders
  getOrders: (params?: string) => request<any>(`/orders${params ? `?${params}` : ""}`),
  getOrder: (id: string) => request<any>(`/orders/${id}`),
  updateOrderStatus: (id: string, data: any) => request<any>(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify(data) }),

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

  // Settings
  getSettings: () => request<any>("/admin/settings"),
  updateSettings: (data: any) => request<any>("/admin/settings", { method: "PUT", body: JSON.stringify(data) }),
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<any>("/admin/settings/password", { method: "PUT", body: JSON.stringify(data) }),

  // Profile (current user)
  updateProfile: (data: any) => request<any>("/auth/me", { method: "PUT", body: JSON.stringify(data) }),
};
