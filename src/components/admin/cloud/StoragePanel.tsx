import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FolderOpen, RefreshCw, Trash2 } from "lucide-react";
import { cloud } from "./api";

interface Bucket {
  name: string;
  public: boolean;
  created_at: string;
}

export const StoragePanel = () => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [bucket, setBucket] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async (b?: string | null) => {
    setLoading(true);
    try {
      const res = await cloud<{ buckets: Bucket[]; files: any[] }>("storage-list", { bucket: b ?? undefined });
      setBuckets(res.buckets);
      setFiles(res.files ?? []);
      if (!b && res.buckets.length && !bucket) setBucket(res.buckets[0].name);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (bucket) load(bucket);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

  const open = async (path: string) => {
    if (!bucket) return;
    setBusy(path);
    try {
      const { url } = await cloud<{ url: string }>("storage-signed-url", { bucket, path });
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (path: string) => {
    if (!bucket) return;
    setBusy(path);
    try {
      await cloud("storage-delete", { bucket, path });
      toast.success("File deleted");
      load(bucket);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {buckets.map((b) => (
          <Button
            key={b.name}
            size="sm"
            variant={bucket === b.name ? "secondary" : "outline"}
            onClick={() => setBucket(b.name)}
          >
            <FolderOpen className="mr-1.5 h-4 w-4" />
            {b.name}
            <Badge variant="outline" className="ml-2 text-[10px]">
              {b.public ? "public" : "private"}
            </Badge>
          </Button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => load(bucket)}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Bucket is empty
                </TableCell>
              </TableRow>
            ) : (
              files.map((f) => (
                <TableRow key={f.name}>
                  <TableCell className="max-w-[260px] truncate font-mono text-xs">{f.name}</TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {f.metadata?.size ? `${(f.metadata.size / 1024).toFixed(1)} KB` : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{f.metadata?.mimetype ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {f.updated_at ? new Date(f.updated_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" disabled={busy === f.name} onClick={() => open(f.name)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={busy === f.name}
                        onClick={() => remove(f.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default StoragePanel;
