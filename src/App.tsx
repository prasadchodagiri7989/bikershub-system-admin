import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AdminLayout from "./layouts/AdminLayout";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/Login";

const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Products = lazy(() => import("./pages/admin/Products"));
const ProductForm = lazy(() => import("./pages/admin/ProductForm"));
const Orders = lazy(() => import("./pages/admin/Orders"));
const OrderDetails = lazy(() => import("./pages/admin/OrderDetails"));
const Transactions = lazy(() => import("./pages/admin/Transactions"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const Reviews = lazy(() => import("./pages/admin/Reviews"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const AIInsights = lazy(() => import("./pages/admin/AIInsights"));
const AIScraper = lazy(() => import("./pages/admin/AIScraper"));
const BikeCatalog = lazy(() => import("./pages/admin/BikeCatalog"));
const HomeContent = lazy(() => import("./pages/admin/HomeContent"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const ShiprocketPage = lazy(() => import("./pages/admin/Shiprocket"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const Loading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/admin" replace />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/:id" element={<ProductForm />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<OrderDetails />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="reviews" element={<Reviews />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="ai-insights" element={<AIInsights />} />
                <Route path="ai-scraper" element={<AIScraper />} />
                <Route path="bike-catalog" element={<BikeCatalog />} />
                <Route path="home-content" element={<HomeContent />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="shiprocket" element={<ShiprocketPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
