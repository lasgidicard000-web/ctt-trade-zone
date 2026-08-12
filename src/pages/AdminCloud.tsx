import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cloud, Database, Users, HardDrive, Server, Headphones } from "lucide-react";
import TableBrowser from "@/components/admin/cloud/TableBrowser";
import UsersPanel from "@/components/admin/cloud/UsersPanel";
import StoragePanel from "@/components/admin/cloud/StoragePanel";
import OpsPanel from "@/components/admin/cloud/OpsPanel";
import SupportPanel from "@/components/admin/cloud/SupportPanel";

const AdminCloud = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setState(data ? "ok" : "denied");
    };
    check();
  }, [navigate]);

  if (state === "loading") {
    return <div className="container mx-auto px-4 py-12 text-muted-foreground">Checking access…</div>;
  }

  if (state === "denied") {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold">Admins only</h1>
        <p className="mt-2 text-muted-foreground">This console is restricted to administrator accounts.</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Cloud className="h-6 w-6 text-primary" /> Cloud Console
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Database, users, storage, functions and live support — every write is recorded in the admin audit log.
        </p>
      </header>

      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="database">
            <Database className="mr-1.5 h-4 w-4" /> Database
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-1.5 h-4 w-4" /> Users &amp; auth
          </TabsTrigger>
          <TabsTrigger value="storage">
            <HardDrive className="mr-1.5 h-4 w-4" /> Storage
          </TabsTrigger>
          <TabsTrigger value="ops">
            <Server className="mr-1.5 h-4 w-4" /> Functions &amp; email
          </TabsTrigger>
          <TabsTrigger value="support">
            <Headphones className="mr-1.5 h-4 w-4" /> Live support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database">
          <TableBrowser />
        </TabsContent>
        <TabsContent value="users">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="storage">
          <StoragePanel />
        </TabsContent>
        <TabsContent value="ops">
          <OpsPanel />
        </TabsContent>
        <TabsContent value="support">
          <SupportPanel />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default AdminCloud;
