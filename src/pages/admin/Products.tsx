import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Plus, Search, Eye, Pencil, Trash2, Package, Upload, Download,
  AlertCircle, CheckCircle2, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// ── CSV helpers ──────────────────────────────────────────────
function parseCSVText(text: string): string[][] {
  const results: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') { cell += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      row.push(cell.trim()); cell = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (c === "\r" && next === "\n") i++;
      row.push(cell.trim());
      if (row.some(v => v !== "")) results.push(row);
      row = []; cell = "";
    } else {
      cell += c;
    }
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(v => v !== "")) results.push(row); }
  return results;
}

interface ParsedRow {
  rowNum: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
}

function validateRows(csvRows: string[][], headers: string[]): ParsedRow[] {
  return csvRows.map((row, i) => {
    const data: Record<string, string> = {};
    headers.forEach((h, j) => { data[h] = row[j]?.trim() ?? ""; });
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!data.name) errors.push("name is required");
    if (!data.price) errors.push("price is required");
    else if (isNaN(parseFloat(data.price))) errors.push("price must be a number");
    if (!data.category) warnings.push("category not set");
    if (!data.brand) warnings.push("brand not set");
    return { rowNum: i + 2, data, errors, warnings };
  });
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

export default function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  // Bulk import state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["products", page],
    queryFn: () => api.getProducts(`page=${page}&limit=20`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); toast.success("Product deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: (rows: ParsedRow[]) => api.bulkImportProductsJson(rows.map(r => r.data)),
    onSuccess: (result: ImportResult) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setImportResult(result);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) { toast.error("Please upload a .csv file"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const csvRows = parseCSVText(text);
      if (csvRows.length < 2) { toast.error("CSV has no data rows"); return; }
      const headers = csvRows[0].map(h => h.toLowerCase().trim());
      const validated = validateRows(csvRows.slice(1), headers);
      setParsedHeaders(headers);
      setParsedRows(validated);
      // Auto-select all valid rows
      const validIndices = validated.map((r, i) => r.errors.length === 0 ? i : -1).filter(i => i >= 0);
      setSelectedRows(new Set(validIndices));
      setImportResult(null);
      setPreviewOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function toggleRow(idx: number) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function toggleAll() {
    const validIndices = parsedRows.map((r, i) => r.errors.length === 0 ? i : -1).filter(i => i >= 0);
    const allSelected = validIndices.length > 0 && validIndices.every(i => selectedRows.has(i));
    setSelectedRows(allSelected ? new Set() : new Set(validIndices));
  }

  function handleImport() {
    const rowsToImport = parsedRows.filter((_, i) => selectedRows.has(i));
    if (rowsToImport.length === 0) { toast.error("No rows selected"); return; }
    importMutation.mutate(rowsToImport);
  }

  function downloadTemplate() {
    const headers = ["name", "description", "price", "category", "brand", "stock", "images", "tags"];
    const example = ["Racing Helmet Pro", "Full-face motorcycle helmet", "199.99", "Helmets", "RacePro", "50", "https://example.com/img.jpg", "helmet,racing"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const products = Array.isArray(data) ? data : data?.items || data?.products || [];
  const filtered = products.filter((p: any) => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "all" || p.category === category;
    return matchSearch && matchCategory;
  });
  const categories = [...new Set(products.map((p: any) => p.category).filter(Boolean))] as string[];

  const validCount = parsedRows.filter(r => r.errors.length === 0).length;
  const validIndices = parsedRows.map((r, i) => r.errors.length === 0 ? i : -1).filter(i => i >= 0);
  const allValidSelected = validIndices.length > 0 && validIndices.every(i => selectedRows.has(i));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Products" description={`${filtered.length} products`}>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />CSV Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" />Upload CSV
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        <Button asChild>
          <Link to="/admin/products/new"><Plus className="w-4 h-4 mr-2" />Add Product</Link>
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading products...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="No products found" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-12">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product: any) => (
                <TableRow key={product._id || product.id} className="border-border/50">
                  <TableCell>
                    <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                      {(product.image || product.images?.[0]) ? (
                        <img src={product.image || product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell><span className="text-muted-foreground">{product.category}</span></TableCell>
                  <TableCell className="font-mono">₹{product.price}</TableCell>
                  <TableCell>
                    <StatusBadge status={product.stockQuantity > 10 || product.stock > 10 ? "In Stock" : (product.stockQuantity ?? product.stock ?? 0) > 0 ? "Low Stock" : "Out of Stock"} />
                    <span className="ml-2 text-sm text-muted-foreground">{product.stockQuantity ?? product.stock ?? product.countInStock ?? 0}</span>
                  </TableCell>
                  <TableCell>⭐ {product.rating?.toFixed(1) || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild><Link to={`/admin/products/${product._id || product.id}`}><Eye className="w-4 h-4" /></Link></Button>
                      <Button variant="ghost" size="icon" asChild><Link to={`/admin/products/${product._id || product.id}`}><Pencil className="w-4 h-4" /></Link></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(product._id || product.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(page + 1)}>Next</Button>
      </div>

      {/* ── CSV Preview / Import Dialog ── */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!importMutation.isPending) { setPreviewOpen(open); if (!open) setImportResult(null); }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[88vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50">
            <DialogTitle>
              {importResult
                ? "Import Complete"
                : `CSV Preview — ${parsedRows.length} row${parsedRows.length !== 1 ? "s" : ""} (${validCount} valid)`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto px-6 py-4">
            {importResult ? (
              // ── Result view ──
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-center">
                    <div className="text-3xl font-bold text-success">{importResult.imported}</div>
                    <div className="text-sm text-muted-foreground mt-1">Imported</div>
                  </div>
                  <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-center">
                    <div className="text-3xl font-bold text-warning">{importResult.skipped}</div>
                    <div className="text-sm text-muted-foreground mt-1">Skipped</div>
                  </div>
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
                    <div className="text-3xl font-bold text-destructive">{importResult.errors.length}</div>
                    <div className="text-sm text-muted-foreground mt-1">Errors</div>
                  </div>
                </div>

                {importResult.errors.length > 0 ? (
                  <div className="rounded-xl border border-destructive/20 bg-card p-4">
                    <h4 className="font-medium text-sm mb-3 text-destructive">Import Errors</h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">
                            <span className="font-medium text-foreground">Row {err.row}:</span> {err.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-success text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    All selected products imported successfully!
                  </div>
                )}

                {/* Raw result object */}
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground font-mono mb-1">Response</p>
                  <pre className="text-xs text-foreground font-mono whitespace-pre-wrap">
                    {JSON.stringify({ imported: importResult.imported, skipped: importResult.skipped, errors: importResult.errors }, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              // ── Preview table ──
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allValidSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all valid rows"
                        />
                      </TableHead>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="min-w-[120px]">Status</TableHead>
                      {parsedHeaders.map(h => (
                        <TableHead key={h} className="capitalize min-w-[100px]">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, i) => {
                      const hasError = row.errors.length > 0;
                      return (
                        <TableRow key={i} className={`border-border/50 ${hasError ? "opacity-50" : ""}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(i)}
                              disabled={hasError}
                              onCheckedChange={() => !hasError && toggleRow(i)}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{row.rowNum}</TableCell>
                          <TableCell>
                            {hasError ? (
                              <div className="space-y-0.5">
                                {row.errors.map((e, j) => (
                                  <div key={j} className="flex items-center gap-1 text-xs text-destructive whitespace-nowrap">
                                    <X className="w-3 h-3 shrink-0" />{e}
                                  </div>
                                ))}
                              </div>
                            ) : row.warnings.length > 0 ? (
                              <div className="space-y-0.5">
                                {row.warnings.map((w, j) => (
                                  <div key={j} className="flex items-center gap-1 text-xs text-warning whitespace-nowrap">
                                    <AlertCircle className="w-3 h-3 shrink-0" />{w}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-success whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5" />Valid
                              </div>
                            )}
                          </TableCell>
                          {parsedHeaders.map(h => (
                            <TableCell key={h} className="text-sm max-w-[160px] truncate" title={row.data[h]}>
                              {row.data[h] || <span className="text-muted-foreground/40">—</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50">
            {importResult ? (
              <Button onClick={() => { setPreviewOpen(false); setImportResult(null); }}>Close</Button>
            ) : (
              <>
                <span className="text-sm text-muted-foreground mr-auto">
                  {selectedRows.size} of {validCount} valid rows selected
                </span>
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedRows.size === 0 || importMutation.isPending}
                >
                  {importMutation.isPending
                    ? "Importing…"
                    : `Import ${selectedRows.size} Product${selectedRows.size !== 1 ? "s" : ""}`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
