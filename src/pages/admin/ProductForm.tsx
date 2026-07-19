import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, Image as ImageIcon, Sparkles, Upload, X, Plus,
  Trash2, Check, ChevronsUpDown, Package, Bike,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { PageHeader } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface ImageItem {
  id: string;
  kind: "url" | "file";
  url?: string;
  file?: File;
}

interface VariantRow {
  id: string;
  size: string;
  colorName: string;
  colorHex: string;
  stock: string;
}

interface SpecRow {
  id: string;
  key: string;
  value: string;
}

const COLOR_PALETTE = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#f5f5f5" },
  { name: "Red", hex: "#c8371f" },
  { name: "Blue", hex: "#2f5f8f" },
  { name: "Green", hex: "#1a7a4c" },
  { name: "Grey", hex: "#726e68" },
  { name: "Orange", hex: "#a8660a" },
  { name: "Navy", hex: "#1c2b4a" },
];

const BADGE_TONE_CLASS: Record<string, string> = {
  new: "bg-primary/15 text-primary",
  bestseller: "bg-success/15 text-success",
  discount: "bg-warning/15 text-warning",
};

const STEPS = [
  { n: 1, label: "Basic Info" },
  { n: 2, label: "Media" },
  { n: 3, label: "Variants & Specs" },
  { n: 4, label: "Description" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

const emptyVariantRow = (): VariantRow => ({ id: uid(), size: "", colorName: "", colorHex: "#1a1a1a", stock: "" });
const emptySpecRow = (): SpecRow => ({ id: uid(), key: "", value: "" });

// ── Component ────────────────────────────────────────────────────────────

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";

  const { data: existingProduct } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id!),
    enabled: isEdit,
  });

  const product = existingProduct?.product || existingProduct;

  // Category options, derived the same way Products.tsx derives its filter list.
  const { data: productsList } = useQuery({
    queryKey: ["products-for-categories"],
    queryFn: () => api.getProducts(),
  });

  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);

  const [form, setForm] = useState<any>({
    name: "", price: "", originalPrice: "", discount: "", category: "",
    stockQuantity: "", inStock: true, description: "", badge: "",
    rating: "0", reviewCount: "0",
  });

  const [images, setImages] = useState<ImageItem[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([emptyVariantRow()]);
  const [specs, setSpecs] = useState<SpecRow[]>([emptySpecRow()]);
  const [compatibleBikes, setCompatibleBikes] = useState<string[]>([]);
  const [bikePickerOpen, setBikePickerOpen] = useState(false);
  const [pickerBrand, setPickerBrand] = useState<string | null>(null);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());

  const { data: bikesData } = useQuery({
    queryKey: ["bikes-catalog"],
    queryFn: () => api.getBikes(),
    staleTime: 10 * 60 * 1000,
  });
  const bikeBrands = bikesData?.brands || {};
  const bikeBrandNames = Object.keys(bikeBrands).sort();

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlMap = useRef<Map<string, string>>(new Map());

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        price: product.price ?? "",
        originalPrice: product.originalPrice ?? "",
        discount: product.discount ?? product.discountPercentage ?? "",
        category: product.category || "",
        stockQuantity: product.stockQuantity ?? product.countInStock ?? product.stock ?? "",
        inStock: product.inStock ?? true,
        description: product.description || "",
        badge: product.badge || "",
        rating: product.rating ?? "0",
        reviewCount: product.reviewCount ?? "0",
      });

      const existingImageUrls: string[] = Array.isArray(product.images) && product.images.length
        ? product.images
        : (product.image ? [product.image] : []);
      setImages(existingImageUrls.filter(Boolean).map((url: string) => ({ id: uid(), kind: "url" as const, url })));

      const sizesArr: string[] = Array.isArray(product.sizes) ? product.sizes : [];
      const colorsArr: any[] = Array.isArray(product.colors) ? product.colors : [];
      // The backend stores sizes[] and colors[] as flat, unpaired arrays (no per-variant
      // linkage). We reconstruct approximate "rows" by zipping them index-wise purely for
      // editing UX — this is a best-effort reconciliation, not a real stored pairing.
      const rowCount = Math.max(sizesArr.length, colorsArr.length);
      if (rowCount > 0) {
        setVariants(Array.from({ length: rowCount }).map((_, i) => ({
          id: uid(),
          size: sizesArr[i] || "",
          colorName: typeof colorsArr[i] === "object" ? colorsArr[i]?.name || "" : (colorsArr[i] || ""),
          colorHex: typeof colorsArr[i] === "object" ? colorsArr[i]?.hex || "#1a1a1a" : "#1a1a1a",
          stock: "",
        })));
      }

      if (product.specifications && typeof product.specifications === "object" && Object.keys(product.specifications).length) {
        setSpecs(Object.entries(product.specifications).map(([key, value]) => ({ id: uid(), key, value: String(value) })));
      }

      if (Array.isArray(product.compatibleBikes)) {
        setCompatibleBikes(product.compatibleBikes.filter(Boolean));
      }
    }
  }, [product?._id]);    // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => { objectUrlMap.current.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);

  const getObjectUrl = (item: ImageItem): string => {
    if (item.kind === "url") return item.url || "";
    const cached = objectUrlMap.current.get(item.id);
    if (cached) return cached;
    const url = URL.createObjectURL(item.file!);
    objectUrlMap.current.set(item.id, url);
    return url;
  };

  const categories = useMemo(() => {
    const standardCategories = ["Helmets", "Riding Gears", "Parts", "Accessories", "Tires", "Airbags", "Winter Gear", "Learn To Ride", "New Riders"];
    const productsArr = Array.isArray(productsList) ? productsList : productsList?.items || productsList?.products || [];
    return Array.from(new Set([...standardCategories, ...productsArr.map((p: any) => p.category).filter(Boolean)])) as string[];
  }, [productsList]);

  const updateField = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }));

  // ── AI Fill (existing logic, relocated to Step 1) ─────────────────────
  const handleAIFill = async () => {
    if (!form.name.trim()) {
      toast.warning("Please enter a product name first to let AI generate details.");
      return;
    }
    const toastId = toast.loading("AI is generating product details...");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_BASE}/admin/products/ai-fill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: form.name, category: form.category })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to generate details");
      }
      const aiData = await res.json();

      setForm((prev: any) => {
        const updated = { ...prev };
        if (!prev.description) updated.description = aiData.description || "";
        if (!prev.price) updated.price = aiData.price || "";
        if (!prev.originalPrice) updated.originalPrice = aiData.originalPrice || "";
        if (!prev.discount) updated.discount = aiData.discount || "";
        if (!prev.badge) updated.badge = aiData.badge || "";
        return updated;
      });

      const variantsEmpty = variants.every((v) => !v.size.trim() && !v.colorName.trim());
      if (variantsEmpty) {
        const aiSizes: string[] = Array.isArray(aiData.sizes) ? aiData.sizes : [];
        const aiColors: any[] = Array.isArray(aiData.colors) ? aiData.colors : [];
        const rowCount = Math.max(aiSizes.length, aiColors.length);
        if (rowCount > 0) {
          setVariants(Array.from({ length: rowCount }).map((_, i) => ({
            id: uid(),
            size: aiSizes[i] || "",
            colorName: typeof aiColors[i] === "object" ? aiColors[i]?.name || "" : (aiColors[i] || ""),
            colorHex: typeof aiColors[i] === "object" ? aiColors[i]?.hex || "#1a1a1a" : "#1a1a1a",
            stock: "",
          })));
        }
      }

      const specsEmpty = specs.every((s) => !s.key.trim());
      if (specsEmpty && aiData.specifications && typeof aiData.specifications === "object") {
        const entries = Object.entries(aiData.specifications);
        if (entries.length) setSpecs(entries.map(([key, value]) => ({ id: uid(), key, value: String(value) })));
      }

      if (compatibleBikes.length === 0 && Array.isArray(aiData.compatibleBikes)) {
        setCompatibleBikes(aiData.compatibleBikes.filter(Boolean));
      }

      toast.success("Blank fields populated with AI suggestions!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to fill details with AI", { id: toastId });
    }
  };

  // ── Image handling ──────────────────────────────────────────────────
  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setImages((prev) => [...prev, ...files.map((file) => ({ id: uid(), kind: "file" as const, file }))]);
  };

  const addUrlImage = () => {
    const url = urlInput.trim();
    if (!url) return;
    setImages((prev) => [...prev, { id: uid(), kind: "url" as const, url }]);
    setUrlInput("");
  };

  const removeImage = (imgId: string) => {
    setImages((prev) => prev.filter((i) => i.id !== imgId));
    const url = objectUrlMap.current.get(imgId);
    if (url) { URL.revokeObjectURL(url); objectUrlMap.current.delete(imgId); }
  };

  const setMainImage = (imgId: string) => {
    setImages((prev) => {
      const idx = prev.findIndex((i) => i.id === imgId);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  };

  const hasNewFiles = images.some((i) => i.kind === "file");
  const hasUrlImages = images.some((i) => i.kind === "url");
  const showReplaceWarning = hasUrlImages && hasNewFiles;

  // ── Variant rows ─────────────────────────────────────────────────────
  const updateVariant = (rowId: string, patch: Partial<VariantRow>) =>
    setVariants((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  const addVariantRow = () => setVariants((prev) => [...prev, emptyVariantRow()]);
  const removeVariantRow = (rowId: string) => setVariants((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== rowId) : prev));

  // ── Spec rows ────────────────────────────────────────────────────────
  const updateSpec = (rowId: string, patch: Partial<SpecRow>) =>
    setSpecs((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  const addSpecRow = () => setSpecs((prev) => [...prev, emptySpecRow()]);
  const removeSpecRow = (rowId: string) => setSpecs((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== rowId) : prev));

  // ── Compatible bikes picker ──────────────────────────────────────────
  const removeBike = (bike: string) => setCompatibleBikes((prev) => prev.filter((b) => b !== bike));

  const openBikePicker = () => {
    setPickerSelected(new Set(compatibleBikes));
    setPickerBrand(bikeBrandNames[0] || null);
    setBikePickerOpen(true);
  };

  const togglePickerEntry = (entry: string) => {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entry)) next.delete(entry);
      else next.add(entry);
      return next;
    });
  };

  const applyBikePicker = () => {
    setCompatibleBikes(Array.from(pickerSelected).sort());
    setBikePickerOpen(false);
  };

  // ── Mutation ─────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (payload: { multipart: boolean; data: any }) => {
      if (payload.multipart) {
        return isEdit ? api.updateProductMultipart(id!, payload.data) : api.createProductMultipart(payload.data);
      }
      return isEdit ? api.updateProduct(id!, payload.data) : api.createProduct(payload.data);
    },
    onSuccess: () => { toast.success(isEdit ? "Product updated" : "Product created"); navigate("/admin/products"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const goNext = () => {
    if (step === 1) {
      if (!form.name.trim()) { toast.warning("Product name is required"); return; }
      if (!form.category.trim()) { toast.warning("Category is required"); return; }
      if (!form.price || Number(form.price) <= 0) { toast.warning("Enter a valid price"); return; }
    }
    const next = Math.min(4, step + 1);
    setStep(next);
    setMaxStepReached((m) => Math.max(m, next));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));
  const jumpTo = (n: number) => { if (n <= maxStepReached) setStep(n); };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && step !== 4 && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
      goNext();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 4) { goNext(); return; }

    const sizes = Array.from(new Set(variants.map((v) => v.size.trim()).filter(Boolean)));
    const colors = (() => {
      const seen = new Set<string>();
      const out: { name: string; hex: string }[] = [];
      for (const v of variants) {
        const name = v.colorName.trim();
        if (!name) continue;
        const key = `${name}|${v.colorHex}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ name, hex: v.colorHex || "#000000" });
      }
      return out;
    })();
    const specifications = specs.reduce((acc: Record<string, string>, s) => {
      const key = s.key.trim();
      if (key) acc[key] = s.value.trim();
      return acc;
    }, {});

    const basePayload: any = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      discount: form.discount ? Number(form.discount) : undefined,
      // Note: the Product schema has no per-variant stock field — stockQuantity from
      // Step 1 remains the single source of truth; per-row stock in Step 3 is UX-only
      // and intentionally not sent to the backend to avoid a duplicate/conflicting value.
      stockQuantity: Number(form.stockQuantity || 0),
      inStock: !!form.inStock,
      description: form.description.trim(),
      badge: form.badge || undefined,
      sizes,
      colors,
      specifications,
      compatibleBikes,
    };
    if (isEdit) {
      basePayload.rating = Number(form.rating || 0);
      basePayload.reviewCount = Number(form.reviewCount || 0);
    }

    if (hasNewFiles) {
      // Backend always overwrites `images` (and derives `image` from files[0]) whenever
      // any files are present on POST/PUT — there's no server-side merge with previously
      // stored URLs. So once new files are staged we send ONLY the new files; any existing
      // URL-based images are dropped server-side (the UI warns the admin about this).
      const fd = new FormData();
      Object.entries(basePayload).forEach(([key, value]) => {
        if (value === undefined) return;
        if (typeof value === "object") fd.append(key, JSON.stringify(value));
        else fd.append(key, String(value));
      });
      images.filter((i) => i.kind === "file").forEach((i) => fd.append("images", i.file as File));
      mutation.mutate({ multipart: true, data: fd });
    } else {
      const urls = images.filter((i) => i.kind === "url").map((i) => i.url as string);
      mutation.mutate({
        multipart: false,
        data: { ...basePayload, image: urls[0] || "", images: urls },
      });
    }
  };

  const filteredCategories = categories.filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase()));
  const exactMatch = categories.some((c) => c.toLowerCase() === categorySearch.trim().toLowerCase());

  const previewImage = images[0] ? getObjectUrl(images[0]) : "";
  const priceNum = Number(form.price) || 0;
  const originalPriceNum = Number(form.originalPrice) || 0;
  const showStrike = originalPriceNum > priceNum;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/products")} type="button">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <PageHeader title={isEdit ? "Edit Product" : "New Product"} description={isEdit ? "Update product details" : "Add a new product to your store"} />
      </div>

      <StepIndicator step={step} maxStepReached={maxStepReached} onJump={jumpTo} />

      <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">
            {step === 1 && (
              <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Basic Information</h3>
                  <Button type="button" variant="outline" onClick={handleAIFill} className="gap-2 border-primary/30 hover:border-primary/60">
                    <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                    AI Fill
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Product Name</Label>
                    <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Product name" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Popover open={categoryOpen} onOpenChange={(open) => { setCategoryOpen(open); if (open) setCategorySearch(form.category); }}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" role="combobox" aria-expanded={categoryOpen} className="w-full justify-between font-normal">
                          {form.category || "Select or type a category"}
                          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Search or add category..." value={categorySearch} onValueChange={setCategorySearch} />
                          <CommandList>
                            <CommandEmpty>No matching category.</CommandEmpty>
                            <CommandGroup>
                              {filteredCategories.map((c) => (
                                <CommandItem key={c} value={c} onSelect={() => { updateField("category", c); setCategoryOpen(false); }}>
                                  <Check className={cn("mr-2 h-4 w-4", form.category === c ? "opacity-100" : "opacity-0")} />
                                  {c}
                                </CommandItem>
                              ))}
                              {categorySearch.trim() && !exactMatch && (
                                <CommandItem value={`__add__${categorySearch}`} onSelect={() => { updateField("category", categorySearch.trim()); setCategoryOpen(false); }}>
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add "{categorySearch.trim()}"
                                </CommandItem>
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Price (₹)</Label>
                    <Input className="font-mono" type="number" value={form.price} onChange={(e) => updateField("price", e.target.value)} placeholder="0.00" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Original Price (₹)</Label>
                    <Input className="font-mono" type="number" value={form.originalPrice} onChange={(e) => updateField("originalPrice", e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount %</Label>
                    <Input className="font-mono" type="number" value={form.discount} onChange={(e) => updateField("discount", e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Quantity</Label>
                    <Input className="font-mono" type="number" value={form.stockQuantity} onChange={(e) => updateField("stockQuantity", e.target.value)} placeholder="0" required />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Checkbox id="inStock" checked={form.inStock} onCheckedChange={(checked) => updateField("inStock", !!checked)} />
                    <Label htmlFor="inStock" className="cursor-pointer font-medium">In Stock</Label>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                <h3 className="font-semibold">Media</h3>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "rounded-lg border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                    isDragging ? "border-primary bg-primary/5" : "border-border/60 hover:border-border"
                  )}
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Drag & drop images here, or click to browse</p>
                  <p className="text-xs text-muted-foreground">Up to 5 images per upload</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                  />
                </div>

                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrlImage(); } }}
                    placeholder="Or paste an image URL…"
                  />
                  <Button type="button" variant="outline" onClick={addUrlImage}>Add</Button>
                </div>

                {showReplaceWarning && (
                  <p className="text-xs text-warning bg-warning/10 rounded-md px-3 py-2">
                    Uploaded files and pasted URLs can't be mixed on save — only the uploaded file(s) will be kept{isEdit ? ", and they'll replace the existing image gallery" : ""}. Remove the uploaded file(s) if you want to keep URL-based images instead.
                  </p>
                )}

                {images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <p className="text-sm">No images yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <div key={img.id} className="relative rounded-lg border border-border/50 bg-muted overflow-hidden aspect-square group">
                        <img src={getObjectUrl(img)} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 ? (
                          <span className="absolute top-1.5 left-1.5 status-pill bg-primary/90 text-primary-foreground">MAIN</span>
                        ) : (
                          <Button type="button" size="sm" variant="secondary" onClick={() => setMainImage(img.id)}
                            className="absolute top-1.5 left-1.5 h-6 px-2 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                            Set main
                          </Button>
                        )}
                        <Button type="button" size="icon" variant="destructive" onClick={() => removeImage(img.id)}
                          className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <>
                <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Variants</h3>
                    <Button type="button" size="sm" variant="outline" onClick={addVariantRow} className="gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {variants.map((row) => (
                      <div key={row.id} className="rounded-lg border border-border/50 p-3 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Size</Label>
                            <Input value={row.size} onChange={(e) => updateVariant(row.id, { size: e.target.value })} placeholder="S, M, L, XL..." />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Stock (informational)</Label>
                            <Input className="font-mono" type="number" value={row.stock} onChange={(e) => updateVariant(row.id, { stock: e.target.value })} placeholder="0" />
                          </div>
                          <Button type="button" size="icon" variant="ghost" onClick={() => removeVariantRow(row.id)} disabled={variants.length === 1}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Color</Label>
                          <div className="flex flex-wrap items-center gap-2">
                            {COLOR_PALETTE.map((c) => (
                              <button
                                key={c.hex}
                                type="button"
                                title={c.name}
                                onClick={() => updateVariant(row.id, { colorName: c.name, colorHex: c.hex })}
                                className={cn(
                                  "w-7 h-7 rounded-full border-2 transition-transform",
                                  row.colorHex === c.hex && row.colorName === c.name ? "border-primary scale-110" : "border-border/50"
                                )}
                                style={{ backgroundColor: c.hex }}
                              />
                            ))}
                            <input
                              type="color"
                              value={row.colorHex}
                              onChange={(e) => updateVariant(row.id, { colorHex: e.target.value })}
                              className="w-7 h-7 rounded-full border-2 border-border/50 cursor-pointer bg-transparent p-0"
                              title="Custom color"
                            />
                            <Input
                              value={row.colorName}
                              onChange={(e) => updateVariant(row.id, { colorName: e.target.value })}
                              placeholder="Color name"
                              className="max-w-[140px]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Specifications</h3>
                    <Button type="button" size="sm" variant="outline" onClick={addSpecRow} className="gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {specs.map((row) => (
                      <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                        <Input value={row.key} onChange={(e) => updateSpec(row.id, { key: e.target.value })} placeholder="Attribute (e.g. Material)" />
                        <Input value={row.value} onChange={(e) => updateSpec(row.id, { value: e.target.value })} placeholder="Value (e.g. Leather)" />
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeSpecRow(row.id)} disabled={specs.length === 1}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Compatible Bikes</h3>
                    <Button type="button" size="sm" variant="outline" onClick={openBikePicker} className="gap-1.5">
                      <Bike className="w-3.5 h-3.5" /> Select bikes
                    </Button>
                  </div>
                  {compatibleBikes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {compatibleBikes.map((bike) => (
                        <span key={bike} className="status-pill bg-neutral-badge/15 text-neutral-badge inline-flex items-center gap-1">
                          {bike}
                          <button type="button" onClick={() => removeBike(bike)} className="hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No bikes selected — click "Select bikes" to choose from the brand/model catalog.</p>
                  )}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                  <h3 className="font-semibold">Description</h3>
                  <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={6} placeholder="Product description..." />
                </div>

                <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
                  <h3 className="font-semibold">Storefront Settings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Badge</Label>
                      <Select value={form.badge || "none"} onValueChange={(val) => updateField("badge", val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="No Badge" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Badge</SelectItem>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="bestseller">Bestseller</SelectItem>
                          <SelectItem value="discount">Discount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {isEdit ? (
                      <>
                        <div className="space-y-2">
                          <Label>Rating (0.0 - 5.0)</Label>
                          <Input className="font-mono" type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => updateField("rating", e.target.value)} placeholder="4.5" />
                        </div>
                        <div className="space-y-2">
                          <Label>Review Count</Label>
                          <Input className="font-mono" type="number" min="0" value={form.reviewCount} onChange={(e) => updateField("reviewCount", e.target.value)} placeholder="0" />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Rating &amp; Reviews</Label>
                        <p className="text-xs text-muted-foreground pt-2.5">Set automatically once reviews come in.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between gap-3">
              <div>
                {step > 1 && <Button type="button" variant="outline" onClick={goBack}>Back</Button>}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate("/admin/products")}>Cancel</Button>
                {step < 4 ? (
                  <Button type="button" onClick={goNext} className="gap-2">
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Saving..." : isEdit ? "Update Product" : "Publish product"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              <PreviewPanel
                image={previewImage}
                name={form.name}
                category={form.category}
                price={priceNum}
                originalPrice={originalPriceNum}
                showStrike={showStrike}
                badge={form.badge}
              />
            </div>
          </div>
        </div>
      </form>

      <BikePickerDialog
        open={bikePickerOpen}
        onOpenChange={setBikePickerOpen}
        brands={bikeBrandNames}
        brandModels={bikeBrands}
        activeBrand={pickerBrand}
        onActiveBrandChange={setPickerBrand}
        selected={pickerSelected}
        onToggle={togglePickerEntry}
        onApply={applyBikePicker}
      />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function StepIndicator({ step, maxStepReached, onJump }: { step: number; maxStepReached: number; onJump: (n: number) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {STEPS.map((s) => {
        const active = s.n === step;
        const done = s.n < step;
        const reachable = s.n <= maxStepReached;
        return (
          <button
            key={s.n}
            type="button"
            onClick={() => onJump(s.n)}
            disabled={!reachable}
            className={cn("text-left space-y-1.5", reachable ? "cursor-pointer" : "cursor-not-allowed opacity-60")}
          >
            <div className={cn("h-1.5 rounded-full", active || done ? "bg-primary" : "bg-muted")} />
            <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
              {s.n}. {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BikePickerDialog({
  open, onOpenChange, brands, brandModels, activeBrand, onActiveBrandChange, selected, onToggle, onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: string[];
  brandModels: Record<string, string[]>;
  activeBrand: string | null;
  onActiveBrandChange: (brand: string) => void;
  selected: Set<string>;
  onToggle: (entry: string) => void;
  onApply: () => void;
}) {
  const models = activeBrand ? brandModels[activeBrand] || [] : [];
  const brandSelectedCount = (brand: string) =>
    (brandModels[brand] || []).filter((m) => selected.has(`${brand} ${m}`)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Select compatible bikes</DialogTitle>
        </DialogHeader>
        {brands.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No bike catalog data available yet.</p>
        ) : (
          <div className="grid grid-cols-[1fr_1.4fr] h-[420px] border-t border-border/50">
            <div className="overflow-y-auto border-r border-border/50">
              {brands.map((brand) => {
                const count = brandSelectedCount(brand);
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => onActiveBrandChange(brand)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm border-b border-border/30 transition-colors",
                      activeBrand === brand ? "bg-muted font-medium" : "hover:bg-muted/50"
                    )}
                  >
                    <span>{brand}</span>
                    {count > 0 && (
                      <span className="status-pill bg-primary/15 text-primary shrink-0">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="overflow-y-auto p-3 space-y-1">
              {models.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3">No models for this brand.</p>
              ) : (
                models.map((model) => {
                  const entry = `${activeBrand} ${model}`;
                  const checked = selected.has(entry);
                  return (
                    <label
                      key={model}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => onToggle(entry)} />
                      {model}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
        <DialogFooter className="p-6 pt-4 border-t border-border/50">
          <span className="text-xs text-muted-foreground mr-auto self-center">
            {selected.size} bike{selected.size === 1 ? "" : "s"} selected
          </span>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={onApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewPanel({ image, name, category, price, originalPrice, showStrike, badge }: {
  image: string; name: string; category: string; price: number; originalPrice: number; showStrike: boolean; badge: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Live Preview</h3>
      <div className="rounded-lg border border-border/50 bg-muted aspect-square overflow-hidden flex items-center justify-center">
        {image ? (
          <img src={image} alt="Product preview" className="w-full h-full object-cover" />
        ) : (
          <Package className="w-10 h-10 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1.5">
        {badge && (
          <span className={cn("status-pill inline-flex items-center capitalize", BADGE_TONE_CLASS[badge] || "bg-neutral-badge/15 text-neutral-badge")}>
            {badge}
          </span>
        )}
        <p className="font-semibold leading-snug">{name || "Untitled product"}</p>
        {category && <p className="text-xs text-muted-foreground">{category}</p>}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-mono font-bold text-lg">₹{price ? price.toLocaleString() : "0"}</span>
          {showStrike && (
            <span className="font-mono text-sm text-muted-foreground line-through">₹{originalPrice.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
