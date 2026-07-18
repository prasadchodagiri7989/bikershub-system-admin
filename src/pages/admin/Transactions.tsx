import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Search, CornerUpLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";


export default function Transactions() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", page, search],
    queryFn: async () => {
      const token = localStorage.getItem("admin_token");
      let url = `${API_BASE}/admin/transactions?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    }
  });

  const refundMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_BASE}/admin/transactions/${orderId}/refund`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to process refund");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Refund processed and order cancelled successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Refund failed");
    }
  });

  const transactions = data?.transactions || [];
  const totalPages = data?.pages || 1;
  const totalTransactions = data?.total || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Transactions" description={`${totalTransactions} transactions found`}>
        <div className="flex items-center gap-2 bg-secondary/30 border border-border/50 px-3 py-1.5 rounded-lg text-xs text-muted-foreground">
          <CreditCard className="w-3.5 h-3.5 text-primary" />
          <span>Razorpay payments logs</span>
        </div>
      </PageHeader>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by Payment ID, Order ID, Customer Name..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="pl-9" 
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <CreditCard className="w-8 h-8 opacity-40 mb-2" />
            <h4 className="font-semibold text-foreground">No transactions recorded</h4>
            <p className="text-xs max-w-xs">Transactions show here once prepaid/Razorpay orders are created and verified.</p>
          </div>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction / Order ID</TableHead>
                    <TableHead>Razorpay Details</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Order Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: any) => (
                    <TableRow key={tx._id} className="border-border/50">
                      <TableCell className="text-sm">
                        {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        #{tx.orderId.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell className="space-y-1">
                        <div className="text-xs font-mono text-muted-foreground">
                          Pay ID: {tx.razorpayPaymentId || <span className="opacity-40">—</span>}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          Order ID: {tx.razorpayOrderId || <span className="opacity-40">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="space-y-0.5">
                        <div className="font-medium text-sm">{tx.user?.name || "Guest Customer"}</div>
                        <div className="text-xs text-muted-foreground">{tx.user?.email || ""}</div>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-sm">
                        ₹{tx.total}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.paymentStatus === "paid" ? "Paid" : tx.paymentStatus === "failed" ? "Failed" : "Pending"} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status === "delivered" ? "Delivered" : tx.status === "cancelled" ? "Cancelled" : "Processing"} />
                      </TableCell>
                      <TableCell className="text-right">
                        {tx.paymentStatus === "paid" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refundMutation.mutate(tx.orderId)}
                            disabled={refundMutation.isPending}
                            className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 transition-all gap-1.5"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                            Refund
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 font-medium select-none">No Action</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border/50">
              {transactions.map((tx: any) => (
                <div key={tx._id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">#{tx.orderId.slice(-8).toUpperCase()}</span>
                    <span className="font-mono font-semibold text-sm shrink-0">₹{tx.total}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={tx.paymentStatus === "paid" ? "Paid" : tx.paymentStatus === "failed" ? "Failed" : "Pending"} />
                    <StatusBadge status={tx.status === "delivered" ? "Delivered" : tx.status === "cancelled" ? "Cancelled" : "Processing"} />
                  </div>
                  <div className="min-w-0 mt-2">
                    <p className="text-sm truncate">{tx.user?.name || "Guest Customer"}</p>
                    <p className="text-xs text-muted-foreground truncate">{tx.user?.email || ""}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {tx.paymentStatus === "paid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refundMutation.mutate(tx.orderId)}
                        disabled={refundMutation.isPending}
                        className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 transition-all gap-1.5 h-7 text-xs"
                      >
                        <CornerUpLeft className="w-3 h-3" />
                        Refund
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>Next</Button>
      </div>
    </div>
  );
}
