import { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE } from "@/lib/api";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Star, BarChart3,
  Brain, Settings, ChevronLeft, ChevronRight, Search, Bell, Moon, Sun,
  LogOut, Menu, Truck, CreditCard, Globe, Plus, Sparkles,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem
} from "@/components/ui/command";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Products", icon: Package, path: "/admin/products" },
  { label: "Orders", icon: ShoppingCart, path: "/admin/orders" },
  { label: "Transactions", icon: CreditCard, path: "/admin/transactions" },
  { label: "Shiprocket", icon: Truck, path: "/admin/shiprocket" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Reviews", icon: Star, path: "/admin/reviews" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  { label: "AI Insights", icon: Brain, path: "/admin/ai-insights" },
  { label: "AI Scraper", icon: Globe, path: "/admin/ai-scraper" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Search dialog state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>({ products: [], users: [], orders: [] });
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Ctrl+K to open search dialog
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  // Fetch universal search results
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ products: [], users: [], orders: [] });
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const token = localStorage.getItem("admin_token");
        const res = await fetch(`${API_BASE}/admin/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Universal search failed:", err);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={cn("flex items-center gap-2 px-4 h-16 border-b border-border/50", collapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">BH</span>
        </div>
        {!collapsed && <span className="font-bold text-lg tracking-tight">BikersHub</span>}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              collapsed && "justify-center px-2",
              isActive(item.path)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-2 border-t border-border/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar - mobile */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border/50 transform transition-transform duration-200 lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      {/* Sidebar - desktop */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r border-border/50 bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top nav */}
        <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            
            {/* Clickable Universal Search Input button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="relative hidden sm:flex items-center text-left text-sm text-muted-foreground w-64 bg-secondary/50 hover:bg-secondary/80 border border-border/50 rounded-lg h-9 px-3 transition-colors gap-2"
            >
              <Search className="h-4 w-4 shrink-0 opacity-50" />
              <span>Search...</span>
              <kbd className="pointer-events-none absolute right-2.5 top-2.5 hidden h-4 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">Ctrl</span>K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} className="text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-3 font-semibold border-b border-border">Notifications</div>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                  <span className="text-sm font-medium">Low stock alert</span>
                  <span className="text-xs text-muted-foreground">Helmet X stock below 5 units</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                  <span className="text-sm font-medium">3 new orders</span>
                  <span className="text-xs text-muted-foreground">Received in the last hour</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                  <span className="text-sm font-medium">Negative review</span>
                  <span className="text-xs text-muted-foreground">Product Y has multiple 1-star reviews</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {user?.name?.[0]?.toUpperCase() ?? "A"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">{user?.name ?? "Admin"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Universal Search Dialog Modal */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput
          placeholder="Search products, users, or transactions..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {loadingSearch && <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>}
          <CommandEmpty>No results found.</CommandEmpty>
          
          {searchResults.products?.length > 0 && (
            <CommandGroup heading="Products">
              {searchResults.products.map((p: any) => (
                <CommandItem
                  key={p._id}
                  value={`product-${p.name}`}
                  onSelect={() => {
                    setSearchOpen(false);
                    navigate(`/admin/products/${p._id}`);
                  }}
                >
                  <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{p.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">₹{p.price}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {searchResults.users?.length > 0 && (
            <CommandGroup heading="Users">
              {searchResults.users.map((u: any) => (
                <CommandItem
                  key={u._id}
                  value={`user-${u.name}-${u.email}`}
                  onSelect={() => {
                    setSearchOpen(false);
                    navigate(`/admin/users`);
                  }}
                >
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{u.name} ({u.email})</span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono capitalize">{u.role}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {searchResults.orders?.length > 0 && (
            <CommandGroup heading="Transactions / Orders">
              {searchResults.orders.map((o: any) => (
                <CommandItem
                  key={o._id}
                  value={`order-${o._id}`}
                  onSelect={() => {
                    setSearchOpen(false);
                    navigate(`/admin/orders`);
                  }}
                >
                  <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Order #{o._id.slice(-6)} - {o.user?.name || 'Customer'}</span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">₹{o.total}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Quick Actions">
            <CommandItem
              value="action-new-product"
              onSelect={() => {
                setSearchOpen(false);
                navigate("/admin/products/new");
              }}
            >
              <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Add New Product</span>
            </CommandItem>
            <CommandItem
              value="action-scraper"
              onSelect={() => {
                setSearchOpen(false);
                navigate("/admin/ai-scraper");
              }}
            >
              <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>AI Product Scraper</span>
            </CommandItem>
            <CommandItem
              value="action-ai-insights"
              onSelect={() => {
                setSearchOpen(false);
                navigate("/admin/ai-insights");
              }}
            >
              <Brain className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>View AI Insights</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
