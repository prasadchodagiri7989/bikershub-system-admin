import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon, Search, Shield, Ban, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.getUsers(),
  });

  const promoteMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "admin" | "user" }) =>
      api.promoteUser(id, role),
    onSuccess: (_data, { role }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(role === "admin" ? "User promoted to admin" : "User demoted to customer");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => api.toggleUserActive(id),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(data?.message ?? "User status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = Array.isArray(data) ? data : data?.items || data?.users || [];
  const filtered = users.filter((u: any) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Users" description={`${filtered.length} registered users`} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading users...</div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="font-medium">Failed to load users</p>
            <p className="text-sm text-muted-foreground max-w-sm">{(error as Error)?.message || "An error occurred. Make sure you are logged in as admin."}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" description="No users match your search." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user: any) => {
                const isAdmin = user.role === "admin" || user.isAdmin;
                const isActive = user.isActive !== false;
                const userId = user._id || user.id;
                return (
                  <TableRow key={userId} className="border-border/50">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">{user.phone || "N/A"}</TableCell>
                    <TableCell><StatusBadge status={isAdmin ? "Admin" : "Customer"} /></TableCell>
                    <TableCell><StatusBadge status={isActive ? "active" : "inactive"} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={promoteMutation.isPending}
                          onClick={() => promoteMutation.mutate({ id: userId, role: isAdmin ? "user" : "admin" })}
                          className="text-xs"
                        >
                          <Shield className="w-3.5 h-3.5 mr-1" />
                          {isAdmin ? "Demote" : "Promote"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={toggleActiveMutation.isPending}
                          onClick={() => toggleActiveMutation.mutate(userId)}
                          className={`text-xs ${isActive ? "text-destructive" : "text-green-500"}`}
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          {isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
