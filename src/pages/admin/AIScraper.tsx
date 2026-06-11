import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Search, Plus, Sparkles, Check, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";


export default function AIScraper() {
  const [url, setUrl] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  // Scrape mutation (Gemini parsed products)
  const scrapeMutation = useMutation({
    mutationFn: async (targetUrl: string) => {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_BASE}/admin/products/ai-scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ url: targetUrl })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to analyze URL");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const generated = data?.products || [];
      setProducts(generated);
      setSelectedIndices(new Set(generated.map((_: any, i: number) => i))); // Select all by default
      toast.success(`Generated ${generated.length} products using Gemini AI!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "AI Scraper failed");
    }
  });

  // Import mutation (bulk save selected to Database)
  const importMutation = useMutation({
    mutationFn: async (selectedProducts: any[]) => {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_BASE}/admin/products/bulk-import-json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(selectedProducts)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to import products");
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Successfully imported ${result.imported} products to database!`);
      setProducts([]);
      setSelectedIndices(new Set());
      setUrl("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Import failed");
    }
  });

  const handleScrape = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.warning("Please enter a website URL first");
      return;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast.warning("URL must start with http:// or https://");
      return;
    }
    scrapeMutation.mutate(url);
  };

  const toggleSelectRow = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === products.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(products.map((_, i) => i)));
    }
  };

  const handleImport = () => {
    const selected = products.filter((_, i) => selectedIndices.has(i));
    if (selected.length === 0) {
      toast.warning("No products selected to import");
      return;
    }
    importMutation.mutate(selected);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="AI Product Scraper" description="Provide any website URL to extract product details using Gemini AI">
        <div className="flex items-center gap-2 bg-secondary/30 border border-border/50 px-3 py-1.5 rounded-lg text-xs text-muted-foreground">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>Automatic schema generation</span>
        </div>
      </PageHeader>

      <form onSubmit={handleScrape} className="rounded-xl border border-border/50 bg-card p-6 space-y-4 max-w-3xl">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Website URL to Extract</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g. https://www.shoei-helmets.com/products/neotec-3"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={scrapeMutation.isPending}
              required
            />
            <Button type="submit" disabled={scrapeMutation.isPending} className="gap-2">
              {scrapeMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Products
                </>
              )}
            </Button>
          </div>
          <span className="text-xs text-muted-foreground block leading-tight">
            Gemini will scrape target page text and extract details structured perfectly into the BikersHub product catalog schema (prices, colors, compatible bikes, sizes, specs, and images).
          </span>
        </div>
      </form>

      {products.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Generated Preview Listings</h3>
            <Button
              onClick={handleImport}
              disabled={selectedIndices.size === 0 || importMutation.isPending}
              className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
            >
              {importMutation.isPending ? (
                "Importing..."
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Import {selectedIndices.size} Selected Products
                </>
              )}
            </Button>
          </div>

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIndices.size === products.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Colors</TableHead>
                  <TableHead>Sizes</TableHead>
                  <TableHead>Specifications</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p, idx) => (
                  <TableRow key={idx} className="border-border/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedIndices.has(idx)}
                        onCheckedChange={() => toggleSelectRow(idx)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs opacity-40">No Img</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={p.name}>
                      {p.name}
                    </TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell className="font-mono">₹{p.price}</TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {p.colors?.map((c: any) => c.name).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {p.sizes?.join(", ") || "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs font-mono text-muted-foreground" title={JSON.stringify(p.specifications)}>
                      {JSON.stringify(p.specifications)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props}>
      {children}
    </label>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
