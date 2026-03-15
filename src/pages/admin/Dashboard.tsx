import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, BarChart3 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { StatsCard, PageHeader } from "@/components/admin/SharedComponents";
import { api } from "@/lib/api";

const COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)", "hsl(350, 80%, 55%)"];

export default function Dashboard() {
  const { data: dashData } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.getDashboard() });
  const { data: analyticsData } = useQuery({ queryKey: ["analytics", 30], queryFn: () => api.getAnalytics(30) });
  const { data: categoryData } = useQuery({ queryKey: ["categoryBreakdown"], queryFn: () => api.getCategoryBreakdown(30) });

  const stats = dashData?.stats;
  const summary = analyticsData?.summary;
  const timeSeries: any[] = (analyticsData?.timeSeries ?? []).map((d: any) => ({
    day: d.date,
    revenue: d.revenue,
    orders: d.orders,
  }));
  const categories: any[] = Array.isArray(categoryData)
    ? categoryData.map((c: any) => ({ name: c.category, value: c.revenue }))
    : [];

  const totalRevenue = stats?.totalRevenue?.value ?? summary?.totalRevenue ?? 0;
  const totalOrders  = stats?.totalOrders?.value  ?? summary?.totalOrders  ?? 0;
  const totalUsers   = stats?.totalUsers?.value   ?? 0;
  const totalProducts = stats?.totalProducts?.value ?? 0;
  const avgOrderValue = summary?.avgOrderValue ?? (totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard" description="Overview of your BikersHub platform" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard title="Total Revenue" value={`₹${Number(totalRevenue).toLocaleString()}`} change={stats?.totalRevenue?.change ?? summary?.revenueChange ?? "—"} changeType={stats?.totalRevenue?.changeType ?? "positive"} icon={DollarSign} description="vs last month" />
        <StatsCard title="Total Orders" value={totalOrders} change={stats?.totalOrders?.change ?? summary?.ordersChange ?? "—"} changeType={stats?.totalOrders?.changeType ?? "positive"} icon={ShoppingCart} description="vs last month" />
        <StatsCard title="Total Users" value={totalUsers} change={stats?.totalUsers?.change ?? "—"} changeType={stats?.totalUsers?.changeType ?? "positive"} icon={Users} description="vs last month" />
        <StatsCard title="Total Products" value={totalProducts} change={stats?.totalProducts?.change ?? "—"} changeType="positive" icon={Package} description="in catalog" />
        <StatsCard title="Avg. Order Value" value={`₹${Number(avgOrderValue).toLocaleString()}`} change={summary?.avgOrderChange ?? "—"} changeType="positive" icon={TrendingUp} />
        <StatsCard title="New Users (30d)" value={summary?.newUsers ?? 0} change={summary?.usersChange ?? "—"} changeType="positive" icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card p-5">
          <h3 className="font-semibold mb-4">Revenue (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 15.9%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(240, 5%, 64.9%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(240, 5%, 64.9%)" />
              <Tooltip contentStyle={{ background: "hsl(240, 6%, 6%)", border: "1px solid hsl(240, 3.7%, 15.9%)", borderRadius: 8, fontSize: 13 }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(217, 91%, 60%)" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="font-semibold mb-4">Category Distribution</h3>
          {categories.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categories} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={4}>
                    {categories.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(240, 6%, 6%)", border: "1px solid hsl(240, 3.7%, 15.9%)", borderRadius: 8, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2">
                {categories.map((c: any, i: number) => (
                  <div key={c.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{c.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Orders per day */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <h3 className="font-semibold mb-4">Orders per Day</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={timeSeries.slice(0, 14)}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 15.9%)" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(240, 5%, 64.9%)" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(240, 5%, 64.9%)" />
            <Tooltip contentStyle={{ background: "hsl(240, 6%, 6%)", border: "1px solid hsl(240, 3.7%, 15.9%)", borderRadius: 8, fontSize: 13 }} />
            <Bar dataKey="orders" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
