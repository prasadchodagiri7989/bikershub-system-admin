import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck, Package, Clock, CheckCircle2, Search, RefreshCw,
  Tag, AlertCircle, ExternalLink, MapPin, Copy, XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value ?? 0}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ShiprocketStatusBadge({ awb, shiprocketOrderId }: { awb?: string; shiprocketOrderId?: string }) {
  if (awb)               return <Badge variant="default"  className="bg-green-500/15 text-green-700 border-green-500/30">AWB Assigned</Badge>;
  if (shiprocketOrderId) return <Badge variant="secondary" className="bg-blue-500/15 text-blue-700 border-blue-500/30">SR Created</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Not Synced</Badge>;
}

export default function Shiprocket() {
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [page, setPage]             = useState(1);
  const [trackingOrder, setTrack]   = useState<any | null>(null);
  const [trackData, setTrackData]   = useState<any | null>(null);
  const [trackLoading, setTrkLoad]  = useState(false);

  /* ── Stats ────────────────────────────────────────────── */
  const { data: stats } = useQuery({
    queryKey: ["shiprocket-stats"],
    queryFn:  () => api.getShiprocketStats(),
  });

  /* ── Orders list ──────────────────────────────────────── */
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["shiprocket-orders", page, statusFilter, search],
    queryFn:  () => {
      const params = new URLSearchParams({
        page:  String(page),
        limit: "20",
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      });
      return api.getShiprocketOrders(params.toString());
    },
  });

  const orders      = data?.items ?? [];
  const totalPages  = data?.totalPages ?? 1;

  /* ── Mutations ────────────────────────────────────────── */
  const awbMutation = useMutation({
    mutationFn: (id: string) => api.shiprocketGenerateAwb(id),
    onSuccess: () => { toast.success("AWB generated successfully"); queryClient.invalidateQueries({ queryKey: ["shiprocket-orders"] }); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const pickupMutation = useMutation({
    mutationFn: (id: string) => api.shiprocketRequestPickup(id),
    onSuccess: () => toast.success("Pickup requested"),
    onError:   (e: Error) => toast.error(e.message),
  });

  const labelMutation = useMutation({
    mutationFn: (id: string) => api.shiprocketGenerateLabel(id),
    onSuccess: (data: any) => {
      if (data?.label_url) window.open(data.label_url, "_blank");
      toast.success("Label generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.shiprocketCancelOrder(id),
    onSuccess: () => { toast.success("Order cancelled in Shiprocket"); queryClient.invalidateQueries({ queryKey: ["shiprocket-orders"] }); },
    onError:   (e: Error) => toast.error(e.message),
  });

  /* ── Track AWB ────────────────────────────────────────── */
  async function openTracking(order: any) {
    setTrack(order);
    setTrackData(null);
    if (!order.shiprocketAwb) return;
    setTrkLoad(true);
    try {
      const result = await api.shiprocketTrack(order.shiprocketAwb);
      setTrackData(result);
    } catch {
      toast.error("Failed to fetch tracking info");
    } finally {
      setTrkLoad(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Shiprocket</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage shipments and track deliveries</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetch(); queryClient.invalidateQueries({ queryKey: ["shiprocket-stats"] }); }}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package}      label="Total Orders"    value={stats?.total ?? 0}          color="bg-primary/10 text-primary" />
        <StatCard icon={Truck}        label="In Shiprocket"   value={stats?.withShiprocket ?? 0} color="bg-blue-500/10 text-blue-600" />
        <StatCard icon={Clock}        label="Pending AWB"     value={stats?.pendingAwb ?? 0}     color="bg-yellow-500/10 text-yellow-600" />
        <StatCard icon={CheckCircle2} label="Shipped"         value={stats?.shipped ?? 0}        color="bg-green-500/10 text-green-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order ID, customer name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No orders found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead>Shiprocket</TableHead>
                <TableHead>AWB / Courier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: any) => (
                <TableRow key={order._id} className="border-border/50">
                  {/* Order ID */}
                  <TableCell>
                    <div className="font-mono text-xs text-muted-foreground">{order._id?.slice(-8)}</div>
                    <div className="text-xs mt-0.5">₹{order.total}</div>
                  </TableCell>

                  {/* Customer */}
                  <TableCell>
                    <div className="text-sm font-medium">{order.user?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{order.user?.email}</div>
                  </TableCell>

                  {/* Payment */}
                  <TableCell>
                    <Badge variant={order.paymentStatus === "paid" ? "default" : "outline"}
                      className={order.paymentStatus === "paid" ? "bg-green-500/15 text-green-700 border-green-500/30" : ""}>
                      {order.paymentMethod === "cod" ? "COD" : order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  </TableCell>

                  {/* Order status */}
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{order.status}</Badge>
                  </TableCell>

                  {/* Shiprocket sync status */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <ShiprocketStatusBadge awb={order.shiprocketAwb} shiprocketOrderId={order.shiprocketOrderId} />
                      {order.shiprocketOrderId && (
                        <span className="text-[10px] text-muted-foreground font-mono">SR#{order.shiprocketOrderId}</span>
                      )}
                    </div>
                  </TableCell>

                  {/* AWB */}
                  <TableCell>
                    {order.shiprocketAwb ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{order.shiprocketAwb}</span>
                          <button onClick={() => copyToClipboard(order.shiprocketAwb)} className="text-muted-foreground hover:text-foreground">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {order.shiprocketCourier && (
                          <span className="text-[11px] text-muted-foreground">{order.shiprocketCourier}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-xs text-muted-foreground">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "—"}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {/* Track */}
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => openTracking(order)}
                        title="Track shipment"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </Button>

                      {/* Generate AWB - only if SR order exists but no AWB */}
                      {order.shiprocketShipmentId && !order.shiprocketAwb && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => awbMutation.mutate(order._id)}
                          disabled={awbMutation.isPending}
                          title="Generate AWB"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Request Pickup */}
                      {order.shiprocketAwb && order.status !== "shipped" && order.status !== "delivered" && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => pickupMutation.mutate(order._id)}
                          disabled={pickupMutation.isPending}
                          title="Request Pickup"
                        >
                          <Truck className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Label */}
                      {order.shiprocketShipmentId && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => labelMutation.mutate(order._id)}
                          disabled={labelMutation.isPending}
                          title="Generate Label"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Cancel */}
                      {order.shiprocketOrderId && !["shipped", "delivered", "cancelled"].includes(order.status) && (
                        <Button
                          variant="ghost" size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Cancel this order in Shiprocket?")) cancelMutation.mutate(order._id);
                          }}
                          disabled={cancelMutation.isPending}
                          title="Cancel in Shiprocket"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="py-2 px-3 text-sm text-muted-foreground">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}

      {/* Tracking Dialog */}
      <Dialog open={!!trackingOrder} onOpenChange={open => { if (!open) { setTrack(null); setTrackData(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Shipment Tracking</DialogTitle>
            <DialogDescription>
              Order #{trackingOrder?._id?.slice(-8)} — {trackingOrder?.user?.name}
            </DialogDescription>
          </DialogHeader>

          {!trackingOrder?.shiprocketAwb ? (
            <div className="flex items-center gap-3 text-muted-foreground py-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">AWB not yet assigned for this order.</span>
            </div>
          ) : trackLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Fetching tracking data...</div>
          ) : trackData ? (
            <div className="space-y-4">
              {/* AWB info */}
              <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AWB</span>
                  <span className="font-mono font-medium">{trackingOrder.shiprocketAwb}</span>
                </div>
                {trackingOrder.shiprocketCourier && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Courier</span>
                    <span className="font-medium">{trackingOrder.shiprocketCourier}</span>
                  </div>
                )}
                {trackData?.tracking_data?.current_status && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className="capitalize">{trackData.tracking_data.current_status}</Badge>
                  </div>
                )}
                {trackData?.tracking_data?.etd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Delivery</span>
                    <span>{trackData.tracking_data.etd}</span>
                  </div>
                )}
              </div>

              {/* Activity */}
              {Array.isArray(trackData?.tracking_data?.shipment_track_activities) && (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {trackData.tracking_data.shipment_track_activities.map((act: any, i: number) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <div className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      <div>
                        <p className="font-medium">{act["sr-status-label"] ?? act.activity}</p>
                        <p className="text-xs text-muted-foreground">{act.location} · {act.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-sm text-muted-foreground">No tracking data available.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
