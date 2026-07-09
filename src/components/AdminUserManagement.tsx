import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, UserMinus, Shield, ShieldOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type UserRole = "admin" | "moderator" | "user";

interface UserWithRoles {
  user_id: string;
  email: string | null;
  display_name: string | null;
  roles: UserRole[];
  is_admin: boolean;
}

export default function AdminUserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [adminsOnly, setAdminsOnly] = useState(false);
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [removeRoleDialogOpen, setRemoveRoleDialogOpen] = useState(false);
  const [adminConfirmOpen, setAdminConfirmOpen] = useState(false);
  const [adminConfirmAction, setAdminConfirmAction] = useState<"grant" | "revoke">("grant");
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const [roleToRemove, setRoleToRemove] = useState<UserRole | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["usersWithRoles"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-list-users");
      if (error) throw error;
      return (data?.users ?? []) as UserWithRoles[];
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from("user_roles" as any)
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usersWithRoles"] });
      toast({ title: "Role added" });
      setAddRoleDialogOpen(false);
      setAdminConfirmOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from("user_roles" as any)
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usersWithRoles"] });
      toast({ title: "Role removed" });
      setRemoveRoleDialogOpen(false);
      setAdminConfirmOpen(false);
      setSelectedUser(null);
      setRoleToRemove(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isSelf = (userId: string) => currentUser?.id === userId;

  const filteredUsers = users?.filter((u) => {
    if (adminsOnly && !u.is_admin) return false;
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      (u.display_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q)
    );
  });

  const openAdminConfirm = (user: UserWithRoles, action: "grant" | "revoke") => {
    setSelectedUser(user);
    setAdminConfirmAction(action);
    setAdminConfirmOpen(true);
  };

  const confirmAdminToggle = () => {
    if (!selectedUser) return;
    if (adminConfirmAction === "grant") {
      addRoleMutation.mutate({ userId: selectedUser.user_id, role: "admin" });
    } else {
      removeRoleMutation.mutate({ userId: selectedUser.user_id, role: "admin" });
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={adminsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setAdminsOnly(false)}
            >
              All
            </Button>
            <Button
              variant={adminsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setAdminsOnly(true)}
            >
              <Shield className="h-4 w-4 mr-1" /> Admins only
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Admin</TableHead>
                <TableHead className="text-right">Other roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading users...</TableCell>
                </TableRow>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="font-medium">{user.display_name || "No name"}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {user.user_id.slice(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.email || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={role === "admin" ? "default" : "secondary"}
                              className="gap-1"
                            >
                              {role === "admin" && <Shield className="h-3 w-3" />}
                              {role}
                              {role !== "admin" && (
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setRoleToRemove(role);
                                    setRemoveRoleDialogOpen(true);
                                  }}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <UserMinus className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.is_admin ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isSelf(user.user_id)}
                                onClick={() => openAdminConfirm(user, "revoke")}
                              >
                                <ShieldOff className="h-4 w-4 mr-1" />
                                Revoke Admin
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {isSelf(user.user_id) && (
                            <TooltipContent>You cannot revoke your own admin role.</TooltipContent>
                          )}
                        </Tooltip>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => openAdminConfirm(user, "grant")}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Make Admin
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setSelectedRole("moderator");
                          setAddRoleDialogOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No users found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Admin grant/revoke confirm */}
        <Dialog open={adminConfirmOpen} onOpenChange={setAdminConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {adminConfirmAction === "grant" ? "Grant admin role" : "Revoke admin role"}
              </DialogTitle>
              <DialogDescription>
                {adminConfirmAction === "grant"
                  ? "This user will gain full administrative access."
                  : "This user will lose administrative access."}{" "}
                <span className="font-medium text-foreground">
                  {selectedUser?.display_name || selectedUser?.email || selectedUser?.user_id}
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdminConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={adminConfirmAction === "grant" ? "default" : "destructive"}
                onClick={confirmAdminToggle}
                disabled={addRoleMutation.isPending || removeRoleMutation.isPending}
              >
                {adminConfirmAction === "grant" ? "Grant Admin" : "Revoke Admin"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add generic role */}
        <Dialog open={addRoleDialogOpen} onOpenChange={setAddRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add role</DialogTitle>
              <DialogDescription>
                Assign a role to {selectedUser?.display_name || selectedUser?.email || "this user"}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddRoleDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedUser &&
                  addRoleMutation.mutate({ userId: selectedUser.user_id, role: selectedRole })
                }
                disabled={addRoleMutation.isPending}
              >
                {addRoleMutation.isPending ? "Adding..." : "Add role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove non-admin role */}
        <Dialog open={removeRoleDialogOpen} onOpenChange={setRemoveRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove role</DialogTitle>
              <DialogDescription>
                Remove the "{roleToRemove}" role from{" "}
                {selectedUser?.display_name || selectedUser?.email || "this user"}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveRoleDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  selectedUser &&
                  roleToRemove &&
                  removeRoleMutation.mutate({
                    userId: selectedUser.user_id,
                    role: roleToRemove,
                  })
                }
                disabled={removeRoleMutation.isPending}
              >
                {removeRoleMutation.isPending ? "Removing..." : "Remove role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
