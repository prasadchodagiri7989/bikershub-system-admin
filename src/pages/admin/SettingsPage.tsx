import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Lock, Store, Truck } from "lucide-react";
import { PageHeader } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();

  // ── Store settings ──────────────────────────────────────────────────────────
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });

  const [storeForm, setStoreForm] = useState({
    storeName: "", storeEmail: "", currency: "INR",
    taxRate: "", shippingFee: "", freeShippingThreshold: "",
  });

  useEffect(() => {
    if (settingsData) {
      setStoreForm({
        storeName: settingsData.storeName || "",
        storeEmail: settingsData.storeEmail || "",
        currency: settingsData.currency || "INR",
        taxRate: settingsData.taxRate ?? "",
        shippingFee: settingsData.shippingFee ?? "",
        freeShippingThreshold: settingsData.freeShippingThreshold ?? "",
      });
    }
  }, [settingsData]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => api.updateSettings(data),
    onSuccess: () => toast.success("Store settings saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Profile ──────────────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "", email: user?.email || "", phone: "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => api.updateProfile(data),
    onSuccess: () => toast.success("Profile updated"),
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Password ─────────────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => api.updatePassword(data),
    onSuccess: () => { toast.success("Password updated"); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (pwForm.newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    updatePasswordMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <PageHeader title="Settings" description="Manage your admin preferences" />

      <Tabs defaultValue="profile">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="profile" className="gap-2"><User className="w-3.5 h-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="password" className="gap-2"><Lock className="w-3.5 h-3.5" />Password</TabsTrigger>
          <TabsTrigger value="store" className="gap-2"><Store className="w-3.5 h-3.5" />Store</TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2"><Truck className="w-3.5 h-3.5" />Shipping</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <form
            onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(profileForm); }}
            className="rounded-xl border border-border/50 bg-card p-6 space-y-4"
          >
            <h3 className="font-semibold">Admin Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={profileForm.name} onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value="Administrator" disabled />
              </div>
            </div>
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password" className="mt-6">
          <form onSubmit={handlePasswordSubmit} className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <h3 className="font-semibold">Change Password</h3>
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={updatePasswordMutation.isPending}>
              {updatePasswordMutation.isPending ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </TabsContent>

        {/* Store Tab */}
        <TabsContent value="store" className="mt-6">
          <form
            onSubmit={(e) => { e.preventDefault(); updateSettingsMutation.mutate(storeForm); }}
            className="rounded-xl border border-border/50 bg-card p-6 space-y-4"
          >
            <h3 className="font-semibold">Store Configuration</h3>
            {settingsLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Loading settings…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Store Name</Label>
                  <Input value={storeForm.storeName} onChange={(e) => setStoreForm(f => ({ ...f, storeName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Store Email</Label>
                  <Input type="email" value={storeForm.storeEmail} onChange={(e) => setStoreForm(f => ({ ...f, storeEmail: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input value={storeForm.currency} onChange={(e) => setStoreForm(f => ({ ...f, currency: e.target.value }))} placeholder="INR" />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input type="number" step="0.01" value={storeForm.taxRate} onChange={(e) => setStoreForm(f => ({ ...f, taxRate: e.target.value }))} placeholder="18" />
                </div>
              </div>
            )}
            <Button type="submit" disabled={updateSettingsMutation.isPending || settingsLoading}>
              {updateSettingsMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </TabsContent>

        {/* Shipping Tab */}
        <TabsContent value="shipping" className="mt-6">
          <form
            onSubmit={(e) => { e.preventDefault(); updateSettingsMutation.mutate(storeForm); }}
            className="rounded-xl border border-border/50 bg-card p-6 space-y-4"
          >
            <h3 className="font-semibold">Shipping Settings</h3>
            {settingsLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Loading settings…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Shipping Fee (₹)</Label>
                  <Input type="number" step="0.01" value={storeForm.shippingFee} onChange={(e) => setStoreForm(f => ({ ...f, shippingFee: e.target.value }))} placeholder="49" />
                </div>
                <div className="space-y-2">
                  <Label>Free Shipping Threshold (₹)</Label>
                  <Input type="number" value={storeForm.freeShippingThreshold} onChange={(e) => setStoreForm(f => ({ ...f, freeShippingThreshold: e.target.value }))} placeholder="999" />
                </div>
              </div>
            )}
            <Button type="submit" disabled={updateSettingsMutation.isPending || settingsLoading}>
              {updateSettingsMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
