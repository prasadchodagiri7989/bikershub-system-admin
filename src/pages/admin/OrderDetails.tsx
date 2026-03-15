import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, MapPin, CreditCard, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, StatusBadge } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState("");
  const [trackingId, setTrackingId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.getOrder(id!),
  });

  const order = data?.order || data;

  const statusMutation = useMutation({
    mutationFn: () => api.updateOrderStatus(id!, { status: newStatus, trackingId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["order", id] }); toast.success("Order status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading order...</div>;
  if (!order) return <div className="p-12 text-center text-muted-foreground">Order not found</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orders")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <PageHeader title={`Order #${(order._id || order.id)?.slice(-8)}`} description={`Placed on ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Customer & Shipping</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {order.user?.name || order.shippingAddress?.name}</p>
            <p><span className="text-muted-foreground">Email:</span> {order.user?.email || "N/A"}</p>
            <p><span className="text-muted-foreground">Address:</span> {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.zip}</p>
            <p><span className="text-muted-foreground">Phone:</span> {order.shippingAddress?.phone || "N/A"}</p>
          </div>
        </div>

        {/* Payment Info */}
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Payment Details</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Method:</span> {order.paymentMethod || "N/A"}</p>
            <p><span className="text-muted-foreground">Status:</span> <StatusBadge status={order.paymentStatus || "pending"} /></p>
            <p><span className="text-muted-foreground">Total:</span> <span className="font-mono font-semibold">RS. {order.total?.toFixed(2)}</span></p>
            <p><span className="text-muted-foreground">Tax:</span> <span className="font-mono">RS. {order.taxPrice?.toFixed(2) || "0.00"}</span></p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Order Items</h3>
        </div>
        <div className="space-y-3">
          {(order.items || order.orderItems || []).map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-3 text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity || item.qty || 1}</p>
              </div>
              <p className="font-mono text-sm">RS. {(item.price * (item.qty || item.quantity || 1)).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Update Status */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Update Order</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Order Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tracking ID</Label>
            <Input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} placeholder="Enter tracking ID" />
          </div>
          <div className="flex items-end">
            <Button onClick={() => statusMutation.mutate()} disabled={!newStatus || statusMutation.isPending}>
              {statusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
