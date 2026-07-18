import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Search, Trash2, Flag } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const DATE_RANGES = [
  { label: "All Time", value: "all" },
  { label: "Last 7 Days", value: "7" },
  { label: "Last 30 Days", value: "30" },
  { label: "Last 90 Days", value: "90" },
];

function dateFrom(value: string): Date | null {
  if (value === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - Number(value));
  return d;
}

export default function Reviews() {
  const [productId, setProductId] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const queryClient = useQueryClient();

  // Get products list for selector
  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.getProducts(),
  });
  const products = Array.isArray(productsData) ? productsData : productsData?.products || [];

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: () =>
      productId === "all"
        ? api.getAllReviews()
        : api.getProductReviews(productId),
  });

  const reviews = Array.isArray(reviewsData) ? reviewsData : reviewsData?.reviews || [];

  const fromDate = dateFrom(dateRange);
  const filtered = reviews.filter((r: any) => {
    if (ratingFilter !== "all" && r.rating !== Number(ratingFilter)) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = (r.name || r.user?.name || "").toLowerCase();
      const comment = (r.comment || "").toLowerCase();
      if (!name.includes(s) && !comment.includes(s)) return false;
    }
    if (fromDate && r.createdAt && new Date(r.createdAt) < fromDate) return false;
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteReview(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reviews"] }); toast.success("Review deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const flagMutation = useMutation({
    mutationFn: (id: string) => api.flagReview(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reviews"] }); toast.success("Review flagged"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Reviews"
        description={filtered.length > 0 ? `${filtered.length} review${filtered.length !== 1 ? "s" : ""}` : "Manage product reviews"}
      />

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All Products" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map((p: any) => (
              <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((r) => <SelectItem key={r} value={String(r)}>{r} Stars</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Date range" /></SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search reviewer or comment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Star} title="No reviews found" description="Try adjusting your filters." />
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading reviews…</div>
          ) : (
            <>
              {/* Desktop / tablet table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead>User</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((review: any) => (
                      <TableRow key={review._id || review.id} className="border-border/50">
                        <TableCell className="font-medium">{review.name || review.user?.name || "Anonymous"}</TableCell>
                        <TableCell>{renderStars(review.rating)}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">{review.comment}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>
                          {review.flagged && <StatusBadge status="Flagged" />}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => flagMutation.mutate(review._id || review.id)}
                              disabled={flagMutation.isPending}
                            >
                              <Flag className="w-4 h-4 text-warning" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(review._id || review.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-border/50">
                {filtered.map((review: any) => (
                  <div key={review._id || review.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{review.name || review.user?.name || "Anonymous"}</p>
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{review.comment}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        {review.flagged && <StatusBadge status="Flagged" />}
                        <span className="text-xs text-muted-foreground">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => flagMutation.mutate(review._id || review.id)}
                          disabled={flagMutation.isPending}
                        >
                          <Flag className="w-3.5 h-3.5 text-warning" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteMutation.mutate(review._id || review.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
