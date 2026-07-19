import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Check, X, Bike as BikeIcon, Search } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BikeCatalogPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["bikes-catalog"],
    queryFn: () => api.getBikes(),
  });
  const brands = data?.brands || {};
  const brandNames = useMemo(() => Object.keys(brands).sort(), [brands]);

  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [renamingBrand, setRenamingBrand] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const effectiveBrand = activeBrand && brands[activeBrand] ? activeBrand : brandNames[0] || null;

  const invalidate = (result: { brands: Record<string, string[]> }) => {
    queryClient.setQueryData(["bikes-catalog"], result);
  };

  const addBrandMutation = useMutation({
    mutationFn: (brand: string) => api.addBikeBrand(brand),
    onSuccess: (result, brand) => { invalidate(result); setNewBrand(""); setActiveBrand(brand); toast.success(`Added "${brand}"`); },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameBrandMutation = useMutation({
    mutationFn: ({ brand, newName }: { brand: string; newName: string }) => api.renameBikeBrand(brand, newName),
    onSuccess: (result, { newName }) => { invalidate(result); setRenamingBrand(null); setActiveBrand(newName); toast.success("Brand renamed"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBrandMutation = useMutation({
    mutationFn: (brand: string) => api.deleteBikeBrand(brand),
    onSuccess: (result) => { invalidate(result); setActiveBrand(null); toast.success("Brand deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addModelMutation = useMutation({
    mutationFn: ({ brand, model }: { brand: string; model: string }) => api.addBikeModel(brand, model),
    onSuccess: (result) => { invalidate(result); setNewModel(""); toast.success("Model added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteModelMutation = useMutation({
    mutationFn: ({ brand, model }: { brand: string; model: string }) => api.deleteBikeModel(brand, model),
    onSuccess: (result) => { invalidate(result); toast.success("Model removed"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAddBrand = () => {
    const v = newBrand.trim();
    if (!v) return;
    addBrandMutation.mutate(v);
  };

  const handleAddModel = () => {
    const v = newModel.trim();
    if (!v || !effectiveBrand) return;
    addModelMutation.mutate({ brand: effectiveBrand, model: v });
  };

  const handleDeleteBrand = (brand: string) => {
    if (!window.confirm(`Delete "${brand}" and all its models? This can't be undone.`)) return;
    deleteBrandMutation.mutate(brand);
  };

  const startRename = (brand: string) => { setRenamingBrand(brand); setRenameValue(brand); };
  const submitRename = () => {
    const v = renameValue.trim();
    if (!v || !renamingBrand) { setRenamingBrand(null); return; }
    if (v === renamingBrand) { setRenamingBrand(null); return; }
    renameBrandMutation.mutate({ brand: renamingBrand, newName: v });
  };

  const filteredBrands = brandNames.filter((b) => b.toLowerCase().includes(brandSearch.toLowerCase()));
  const models = effectiveBrand ? brands[effectiveBrand] || [] : [];
  const filteredModels = models.filter((m) => m.toLowerCase().includes(modelSearch.toLowerCase()));
  const totalModels = Object.values(brands).reduce((n, arr) => n + arr.length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Bike Catalog"
        description={`Master brand/model list used by the compatible-bikes picker and the customer "Shop by Bike" menu — ${brandNames.length} brands, ${totalModels} models`}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : brandNames.length === 0 && !newBrand ? (
        <div className="rounded-xl border border-border/50 bg-card">
          <EmptyState icon={BikeIcon} title="No brands yet" description="Add your first bike brand below to start building the catalog." />
          <div className="flex gap-2 p-6 pt-0 max-w-sm mx-auto">
            <Input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Brand name" onKeyDown={(e) => { if (e.key === "Enter") handleAddBrand(); }} />
            <Button type="button" onClick={handleAddBrand} disabled={addBrandMutation.isPending}>Add</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          {/* Brands column */}
          <div className="rounded-xl border border-border/50 bg-card flex flex-col h-[calc(100vh-260px)] min-h-[420px]">
            <div className="p-3 border-b border-border/50 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="Search brands..." className="pl-8 h-8 text-sm" />
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddBrand(); } }}
                  placeholder="New brand..."
                  className="h-8 text-sm"
                />
                <Button type="button" size="icon" className="h-8 w-8 shrink-0" onClick={handleAddBrand} disabled={addBrandMutation.isPending}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredBrands.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No matching brands.</p>
              ) : (
                filteredBrands.map((brand) => (
                  <div
                    key={brand}
                    className={cn(
                      "group flex items-center gap-1 px-3 py-2 border-b border-border/30 cursor-pointer text-sm",
                      effectiveBrand === brand ? "bg-muted" : "hover:bg-muted/50"
                    )}
                    onClick={() => renamingBrand !== brand && setActiveBrand(brand)}
                  >
                    {renamingBrand === brand ? (
                      <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setRenamingBrand(null); }}
                          className="h-7 text-sm"
                        />
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={submitRename}>
                          <Check className="w-3.5 h-3.5 text-success" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setRenamingBrand(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className={cn("flex-1 truncate", effectiveBrand === brand && "font-medium")}>{brand}</span>
                        <span className="status-pill bg-neutral-badge/15 text-neutral-badge shrink-0">{brands[brand]?.length || 0}</span>
                        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                          <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); startRename(brand); }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand); }}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Models column */}
          <div className="rounded-xl border border-border/50 bg-card flex flex-col h-[calc(100vh-260px)] min-h-[420px]">
            {effectiveBrand ? (
              <>
                <div className="p-4 border-b border-border/50 space-y-3">
                  <h3 className="font-semibold">{effectiveBrand} models</h3>
                  <div className="flex gap-2">
                    <Input
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddModel(); } }}
                      placeholder="New model name..."
                    />
                    <Button type="button" onClick={handleAddModel} disabled={addModelMutation.isPending} className="gap-1.5 shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} placeholder="Search models..." className="pl-8 h-8 text-sm" />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-3">
                  {filteredModels.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center">No matching models.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredModels.map((model) => (
                        <div key={model} className="group flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm">
                          <span className="truncate">{model}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteModelMutation.mutate({ brand: effectiveBrand, model })}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <EmptyState icon={BikeIcon} title="Select a brand" description="Choose a brand on the left to view and edit its models." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
