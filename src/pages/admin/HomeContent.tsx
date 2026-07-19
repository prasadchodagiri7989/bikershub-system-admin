import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ImagePlus, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FieldType = "text" | "textarea" | "image" | "select" | "datetime";

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  optional?: boolean;
}

const RESOURCE_CONFIG: Record<string, { label: string; description: string; fields: FieldConfig[]; listSubtitle: (item: any) => string }> = {
  hero: {
    label: "Hero Slides",
    description: "The full-bleed autoplay banner at the very top of the homepage.",
    fields: [
      { key: "image", label: "Background image", type: "image" },
      { key: "badge", label: "Badge", type: "text", placeholder: "2026 RELEASES", optional: true },
      { key: "title", label: "Title (use a new line for a line break)", type: "textarea", placeholder: "Gear Up.\nRide Bold." },
      { key: "description", label: "Description", type: "textarea", placeholder: "Premium helmets, riding gear & accessories..." },
      { key: "cta1Label", label: "Primary button text", type: "text", placeholder: "Shop Now" },
      { key: "cta1Path", label: "Primary button link", type: "text", placeholder: "/shop" },
      { key: "cta2Label", label: "Secondary button text", type: "text", placeholder: "Explore Helmets", optional: true },
      { key: "cta2Path", label: "Secondary button link", type: "text", placeholder: "/shop?category=Helmets", optional: true },
      {
        key: "align", label: "Text alignment", type: "select",
        options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }],
      },
    ],
    listSubtitle: (item) => (item.title || "").replace(/\n/g, " "),
  },
  categories: {
    label: "Categories",
    description: 'Powers the "Shop by Category" strip (with image) on the homepage. The shop filter sidebar uses the name only, no image.',
    fields: [
      { key: "name", label: "Display name", type: "text", placeholder: "Helmets" },
      { key: "categoryValue", label: "Links to category", type: "text", placeholder: "Helmets" },
      { key: "image", label: "Image (PNG/JPG)", type: "image" },
    ],
    listSubtitle: (item) => `→ ${item.categoryValue}`,
  },
  collections: {
    label: "Featured Collections",
    description: "The 3-card curated collections band on the homepage.",
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "New Arrivals" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Fresh drops..." },
      { key: "cta", label: "Button text", type: "text", placeholder: "Shop Now" },
      { key: "path", label: "Link path", type: "text", placeholder: "/shop?category=Helmets" },
      { key: "image", label: "Image", type: "image" },
      { key: "badge", label: "Badge (optional)", type: "text", placeholder: "NEW", optional: true },
    ],
    listSubtitle: (item) => item.description || "",
  },
  trending: {
    label: "Trending Now",
    description: "The editorial-style asymmetric grid on the homepage.",
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "Winter Riding" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Stay warm, stay safe" },
      { key: "path", label: "Link path", type: "text", placeholder: "/shop?category=Winter+Gear" },
      { key: "image", label: "Image", type: "image" },
      {
        key: "span", label: "Card size", type: "select",
        options: [{ value: "normal", label: "Normal" }, { value: "wide", label: "Wide (2 cols)" }, { value: "tall", label: "Tall (2 rows)" }],
      },
    ],
    listSubtitle: (item) => item.subtitle || "",
  },
  "limited-time": {
    label: "Limited Time",
    description: "The Limited Time promo banner above Deep Discounts on the homepage.",
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "Limited Time" },
      { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Deep discounts on select gear..." },
      { key: "cta", label: "Button text", type: "text", placeholder: "Shop Deals" },
      { key: "path", label: "Link path", type: "text", placeholder: "/shop?badge=discount" },
      { key: "image", label: "Image", type: "image" },
      { key: "badge", label: "Badge (optional)", type: "text", placeholder: "SALE", optional: true },
      { key: "endsAt", label: "Ends at (optional)", type: "datetime", optional: true },
    ],
    listSubtitle: (item) => item.subtitle || "",
  },
};

export default function HomeContentPage() {
  const [tab, setTab] = useState<keyof typeof RESOURCE_CONFIG>("hero");

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Homepage Content" description="Master data for the customer site's homepage — hero slides, categories, collections, trending cards, and limited-time offers." />

      <Tabs value={tab} onValueChange={(v) => setTab(v as keyof typeof RESOURCE_CONFIG)}>
        <TabsList>
          {Object.entries(RESOURCE_CONFIG).map(([key, cfg]) => (
            <TabsTrigger key={key} value={key}>{cfg.label}</TabsTrigger>
          ))}
        </TabsList>
        {Object.keys(RESOURCE_CONFIG).map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            <ResourceManager resource={key} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ResourceManager({ resource }: { resource: string }) {
  const cfg = RESOURCE_CONFIG[resource];
  const queryClient = useQueryClient();
  const queryKey = ["home-content", resource];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.getHomeItems(resource),
  });
  const items = data?.items || [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.createHomeItem(resource, payload),
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success("Added"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.updateHomeItem(resource, id, payload),
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteHomeItem(resource, id),
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const moveMutation = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) => api.moveHomeItem(resource, id, direction),
    onSuccess: (result) => { queryClient.setQueryData(queryKey, result); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditing(item); setDialogOpen(true); };
  const handleDelete = (item: any) => {
    if (!window.confirm(`Delete "${item.name || item.title}"?`)) return;
    deleteMutation.mutate(item._id);
  };
  const handleSubmit = (payload: any) => {
    if (editing) updateMutation.mutate({ id: editing._id, payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <p className="text-sm text-muted-foreground max-w-lg">{cfg.description}</p>
        <Button type="button" size="sm" onClick={openCreate} className="gap-1.5 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={ImagePlus} title="Nothing here yet" description={`Click "Add" to create the first ${cfg.label.toLowerCase()} entry.`} />
      ) : (
        <div className="divide-y divide-border/50">
          {items.map((item: any, idx: number) => (
            <div key={item._id} className="flex items-center gap-3 p-3">
              <div className="flex flex-col shrink-0">
                <button type="button" disabled={idx === 0} onClick={() => moveMutation.mutate({ id: item._id, direction: "up" })} className="disabled:opacity-25 hover:text-primary">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" disabled={idx === items.length - 1} onClick={() => moveMutation.mutate({ id: item._id, direction: "down" })} className="disabled:opacity-25 hover:text-primary">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-12 h-12 rounded-lg border border-border/50 bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {item.image ? (
                  <img src={item.image} className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name || item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{cfg.listSubtitle(item)}</p>
              </div>

              {item.badge && <span className="status-pill bg-neutral-badge/15 text-neutral-badge shrink-0">{item.badge}</span>}

              <div className="flex items-center gap-1 shrink-0">
                <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(item)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => handleDelete(item)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        fields={cfg.fields}
        initial={editing}
        onSubmit={handleSubmit}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function ItemDialog({
  open, onOpenChange, fields, initial, onSubmit, saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FieldConfig[];
  initial: any | null;
  onSubmit: (payload: any) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingFieldRef = useRef<string | null>(null);

  // Reset form contents whenever the dialog opens (create) or a different item is opened (edit).
  const openKey = open ? (initial?._id || "new") : "closed";
  const [lastOpenKey, setLastOpenKey] = useState("closed");
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = initial?.[f.key];
      if (v !== undefined && v !== null) {
        next[f.key] = f.type === "datetime" ? new Date(v).toISOString().slice(0, 16) : v;
      } else {
        next[f.key] = f.type === "select" ? f.options![0].value : "";
      }
    }
    setForm(next);
  }

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const triggerUpload = (key: string) => {
    uploadingFieldRef.current = key;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const key = uploadingFieldRef.current;
    e.target.value = "";
    if (!file || !key) return;
    setUploading(key);
    try {
      const res = await api.uploadHomeImage(file);
      update(key, res.url);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    for (const f of fields) {
      const v = form[f.key]?.trim?.() ?? form[f.key];
      if (!v && !f.optional) {
        toast.error(`${f.label.replace(/\s*\(.*\)$/, "")} is required`);
        return;
      }
    }

    const payload: Record<string, any> = {};
    for (const f of fields) {
      const v = form[f.key]?.trim?.() ?? form[f.key];
      if (!v && f.optional) continue;
      if (f.type === "datetime") payload[f.key] = v ? new Date(v).toISOString() : undefined;
      else payload[f.key] = v;
    }
    onSubmit(payload);
  };

  const missingRequired = fields.some((f) => {
    if (f.optional) return false;
    const v = form[f.key]?.trim?.() ?? form[f.key];
    return !v;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle>{initial ? "Edit" : "Add"} entry</DialogTitle>
        </DialogHeader>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="space-y-4 overflow-y-auto flex-1 min-h-0 px-6 py-1">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}{!f.optional && <span className="text-destructive"> *</span>}</Label>
              {f.type === "textarea" ? (
                <Textarea value={form[f.key] || ""} onChange={(e) => update(f.key, e.target.value)} placeholder={f.placeholder} rows={3} />
              ) : f.type === "select" ? (
                <Select value={form[f.key] || f.options![0].value} onValueChange={(v) => update(f.key, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {f.options!.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : f.type === "datetime" ? (
                <Input type="datetime-local" value={form[f.key] || ""} onChange={(e) => update(f.key, e.target.value)} />
              ) : f.type === "image" ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input value={form[f.key] || ""} onChange={(e) => update(f.key, e.target.value)} placeholder="Image URL, or upload →" />
                    <Button type="button" variant="outline" onClick={() => triggerUpload(f.key)} disabled={uploading === f.key} className="shrink-0 gap-1.5">
                      {uploading === f.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                      Upload
                    </Button>
                  </div>
                  {form[f.key] && (
                    <div className="w-20 h-20 rounded-lg border border-border/50 bg-muted overflow-hidden">
                      <img src={form[f.key]} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ) : (
                <Input value={form[f.key] || ""} onChange={(e) => update(f.key, e.target.value)} placeholder={f.placeholder} />
              )}
            </div>
          ))}
        </div>
          <DialogFooter className="p-6 pt-4 shrink-0 border-t border-border/50">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || missingRequired}>{saving ? "Saving..." : initial ? "Save changes" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
