import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Image as ImageIcon, Globe, Sparkles } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { PageHeader } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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

  const [form, setForm] = useState<any>({
    name: "", price: "", originalPrice: "", discount: "", category: "",
    sizes: "", colors: "", compatibleBikes: "", description: "", specifications: "",
    stockQuantity: "", image: "", images: "", badge: "", rating: "0", reviewCount: "0",
    inStock: true,
  });

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        price: product.price || "",
        originalPrice: product.originalPrice || "",
        discount: product.discount ?? product.discountPercentage ?? "",
        category: product.category || "",
        sizes: Array.isArray(product.sizes) ? product.sizes.join(", ") : product.sizes || "",
        colors: Array.isArray(product.colors)
          ? product.colors.map((c: any) => typeof c === "object" ? `${c.name}:${c.hex || "#000000"}` : c).join(", ")
          : product.colors || "",
        compatibleBikes: Array.isArray(product.compatibleBikes) ? product.compatibleBikes.join(", ") : product.compatibleBikes || "",
        description: product.description || "",
        specifications: typeof product.specifications === "object"
          ? JSON.stringify(product.specifications || {})
          : product.specifications || "",
        stockQuantity: product.stockQuantity ?? product.countInStock ?? product.stock ?? "",
        image: product.image || product.images?.[0] || "",
        images: Array.isArray(product.images) ? product.images.join(", ") : product.images || "",
        badge: product.badge || "",
        rating: product.rating ?? "0",
        reviewCount: product.reviewCount ?? "0",
        inStock: product.inStock ?? true,
      });
    }
  }, [product?._id]);    // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit ? api.updateProduct(id!, data) : api.createProduct(data),
    onSuccess: () => { toast.success(isEdit ? "Product updated" : "Product created"); navigate("/admin/products"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      discount: form.discount ? Number(form.discount) : undefined,
      rating: Number(form.rating || 0),
      reviewCount: Number(form.reviewCount || 0),
      stockQuantity: Number(form.stockQuantity || 0),
      inStock: !!form.inStock,
      badge: form.badge || undefined,
      sizes: form.sizes.split(",").map((s: string) => s.trim()).filter(Boolean),
      colors: form.colors.split(",").map((s: string) => {
        const parts = s.trim().split(":");
        const name = parts[0]?.trim() || "";
        const hex = parts[1]?.trim() || "#000000";
        return { name, hex };
      }).filter((c: any) => c.name),
      compatibleBikes: form.compatibleBikes.split(",").map((s: string) => s.trim()).filter(Boolean),
      specifications: (() => { try { return JSON.parse(form.specifications || "{}"); } catch { return {}; } })(),
      image: form.image.trim(),
      images: form.images.split(/[|,]/).map((s: string) => s.trim()).filter(Boolean),
    };
    mutation.mutate(payload);
  };

  const updateField = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }));

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
        
        if (!prev.sizes) {
          updated.sizes = Array.isArray(aiData.sizes) ? aiData.sizes.join(", ") : "";
        }
        if (!prev.colors) {
          updated.colors = Array.isArray(aiData.colors)
            ? aiData.colors.map((c: any) => typeof c === "object" ? `${c.name}:${c.hex || "#000000"}` : c).join(", ")
            : "";
        }
        if (!prev.compatibleBikes) {
          updated.compatibleBikes = Array.isArray(aiData.compatibleBikes) ? aiData.compatibleBikes.join(", ") : "";
        }
        if (!prev.specifications || prev.specifications === "{}" || prev.specifications === "") {
          updated.specifications = typeof aiData.specifications === "object"
            ? JSON.stringify(aiData.specifications || {})
            : JSON.stringify({});
        }
        return updated;
      });
      toast.success("Blank fields populated with AI suggestions!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to fill details with AI", { id: toastId });
    }
  };

  // Helper to split & preview images
  const additionalImages = form.images
    ? form.images.split(/[|,]/).map((s: string) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/products")} type="button">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <PageHeader title={isEdit ? "Edit Product" : "New Product"} description={isEdit ? "Update product details" : "Add a new product to your store"}>
          <Button type="button" variant="outline" onClick={handleAIFill} className="gap-2 border-primary/30 hover:border-primary/60">
            <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
            AI Fill
          </Button>
        </PageHeader>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <h3 className="font-semibold">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Product Name</Label>
              <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Product name" required />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" value={form.price} onChange={(e) => updateField("price", e.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label>Original Price (₹)</Label>
              <Input type="number" value={form.originalPrice} onChange={(e) => updateField("originalPrice", e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Discount %</Label>
              <Input type="number" value={form.discount} onChange={(e) => updateField("discount", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => updateField("category", e.target.value)} placeholder="Helmets, Gloves, etc." required />
            </div>
            <div className="space-y-2">
              <Label>Stock Quantity</Label>
              <Input type="number" value={form.stockQuantity} onChange={(e) => updateField("stockQuantity", e.target.value)} placeholder="0" required />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Checkbox id="inStock" checked={form.inStock} onCheckedChange={(checked) => updateField("inStock", !!checked)} />
              <Label htmlFor="inStock" className="cursor-pointer font-medium">In Stock</Label>
            </div>
          </div>
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
            <div className="space-y-2">
              <Label>Rating (0.0 - 5.0)</Label>
              <Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => updateField("rating", e.target.value)} placeholder="4.5" />
            </div>
            <div className="space-y-2">
              <Label>Review Count</Label>
              <Input type="number" min="0" value={form.reviewCount} onChange={(e) => updateField("reviewCount", e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <h3 className="font-semibold">Details</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={4} placeholder="Product description..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sizes (comma separated)</Label>
                <Input value={form.sizes} onChange={(e) => updateField("sizes", e.target.value)} placeholder="S, M, L, XL" />
              </div>
              <div className="space-y-2">
                <Label>Colors (format Name:Hex, comma separated)</Label>
                <Input value={form.colors} onChange={(e) => updateField("colors", e.target.value)} placeholder="Black:#000000, Red:#FF0000" />
                <span className="text-[11px] text-muted-foreground block leading-tight mt-1">Specify color name and hex code (e.g., Red:#FF0000)</span>
              </div>
              <div className="space-y-2">
                <Label>Compatible Bikes (comma separated)</Label>
                <Input value={form.compatibleBikes} onChange={(e) => updateField("compatibleBikes", e.target.value)} placeholder="Royal Enfield, KTM" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Specifications (JSON)</Label>
              <Textarea value={form.specifications} onChange={(e) => updateField("specifications", e.target.value)} rows={3} placeholder='{"material": "leather", "weight": "500g"}' />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <h3 className="font-semibold">Images (URL Links)</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Main Image Link</Label>
              <div className="flex gap-2">
                <Input value={form.image} onChange={(e) => updateField("image", e.target.value)} placeholder="https://example.com/main-image.jpg" required />
              </div>
              {form.image && (
                <div className="mt-2 w-24 h-24 rounded-lg border border-border/50 bg-muted overflow-hidden flex items-center justify-center">
                  <img src={form.image} alt="Main preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Additional Image Links (comma or pipe separated)</Label>
              <Textarea value={form.images} onChange={(e) => updateField("images", e.target.value)} rows={3} placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg" />
              {additionalImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {additionalImages.map((url, index) => (
                    <div key={index} className="w-16 h-16 rounded-lg border border-border/50 bg-muted overflow-hidden flex items-center justify-center">
                      <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/products")}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
