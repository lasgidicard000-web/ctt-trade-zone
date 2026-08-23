import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Admins have unrestricted write access through the row editor.
 * These sets are kept only to flag sensitive surfaces in the UI.
 */
const READ_ONLY_TABLES = new Set<string>([]);

/** Columns flagged as sensitive; values are still returned to admins. */
const SENSITIVE_COLUMNS = new Set([
  "card_number",
  "cvv",
  "pin_hash",
  "global_pin_hash",
  "token",
]);

const EDGE_FUNCTIONS = [
  "admin-cloud",
  "admin-list-users",
  "admin-regulate-roi",
  "admin-roi-audit",
  "admin-send-email",
  "admin-transactions",
  "auth-email-hook",
  "bank-transfer",
  "check-price-alerts",
  "community-access",
  "crypto-chat",
  "fetch-price-history",
  "get-leaderboard",
  "handle-email-suppression",
  "handle-email-unsubscribe",
  "mail-reply",
  "mcp",
  "nowpayments-deposit",
  "paypal-deposit",
  "preview-transactional-email",
  "process-email-queue",
  "process-rewards",
  "process-withdrawal",
  "send-transactional-email",
  "update-cct-price-history",
  "update-prices",
  "wallet-copilot",
];

const BodySchema = z.object({
  action: z.enum([
    "list-tables",
    "list-rows",
    "insert-row",
    "update-row",
    "delete-row",
    "list-users",
    "user-detail",
    "user-action",
    "storage-list",
    "storage-signed-url",
    "storage-delete",
    "ops-overview",
    "clone-user-data",
  ]),
  payload: z.record(z.any()).optional().default({}),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "missing authorization" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "not authenticated" }, 401);
    const caller = userData.user;

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) return json({ error: "admin role required" }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { action, payload } = parsed.data;

    // ---- schema introspection (allow-list source of truth) ----
    const loadSchema = async () => {
      const { data, error } = await userClient.rpc("admin_list_tables");
      if (error) throw error;
      const map: Record<string, { name: string; type: string; nullable: boolean; def: string | null }[]> = {};
      for (const c of (data ?? []) as any[]) {
        (map[c.table_name] ??= []).push({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === "YES",
          def: c.column_default ?? null,
        });
      }
      return map;
    };

    const audit = async (
      act: string,
      target_table: string,
      target_id: string | null,
      target_user_id: string | null,
      before: unknown,
      after: unknown,
      reason: string | null,
    ) => {
      const isUuid = (v: unknown) =>
        typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
      await admin.from("admin_transaction_log").insert({
        admin_user_id: caller.id,
        action: act,
        target_table,
        target_id: isUuid(target_id) ? target_id : null,
        target_user_id: isUuid(target_user_id) ? target_user_id : null,
        before: before ?? null,
        after: after ?? null,
        reason,
      });
    };

    // Admins see raw values; sensitive columns are only flagged for the UI.
    const maskRow = (row: Record<string, any>) => row;

    // ------------------------------------------------------------------
    if (action === "list-tables") {
      const schema = await loadSchema();
      const names = Object.keys(schema).sort();
      const counts = await Promise.all(
        names.map(async (t) => {
          const { count } = await admin.from(t).select("*", { count: "exact", head: true });
          return [t, count ?? 0] as const;
        }),
      );
      return json({
        tables: names.map((name, i) => ({
          name,
          rows: counts[i][1],
          columns: schema[name].length,
          readOnly: false,
        })),
        schema,
      });
    }

    if (action === "list-rows") {
      const P = z
        .object({
          table: z.string(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(200).default(25),
          search: z.string().max(200).optional(),
          sortBy: z.string().optional(),
          sortDir: z.enum(["asc", "desc"]).default("desc"),
        })
        .safeParse(payload);
      if (!P.success) return json({ error: P.error.flatten() }, 400);
      const { table, page, pageSize, search, sortBy, sortDir } = P.data;

      const schema = await loadSchema();
      const cols = schema[table];
      if (!cols) return json({ error: "unknown table" }, 400);

      let q = admin.from(table).select("*", { count: "exact" });

      if (search && search.trim()) {
        const textCols = cols
          .filter((c) => ["text", "character varying", "uuid"].includes(c.type))
          .map((c) => c.name)
          ;
        if (textCols.length) {
          q = q.or(textCols.map((c) => `${c}.ilike.%${search.replace(/[,()]/g, "")}%`).join(","));
        }
      }

      const orderCol =
        (sortBy && cols.some((c) => c.name === sortBy) && sortBy) ||
        (cols.some((c) => c.name === "created_at") ? "created_at" : cols[0].name);
      q = q.order(orderCol, { ascending: sortDir === "asc" });

      const from = (page - 1) * pageSize;
      const { data, error, count } = await q.range(from, from + pageSize - 1);
      if (error) throw error;

      return json({
        columns: cols,
        rows: (data ?? []).map((r: any) => maskRow(r)),
        total: count ?? 0,
        readOnly: false,
        sensitiveColumns: cols.filter((c) => SENSITIVE_COLUMNS.has(c.name)).map((c) => c.name),
      });
    }

    if (action === "insert-row" || action === "update-row" || action === "delete-row") {
      const P = z
        .object({
          table: z.string(),
          pk: z.string().optional(),
          pkValue: z.union([z.string(), z.number()]).optional(),
          values: z.record(z.any()).optional(),
          reason: z.string().max(500).optional(),
        })
        .safeParse(payload);
      if (!P.success) return json({ error: P.error.flatten() }, 400);
      const { table, pk, pkValue, values, reason } = P.data;

      const schema = await loadSchema();
      const cols = schema[table];
      if (!cols) return json({ error: "unknown table" }, 400);

      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(values ?? {})) {
        if (!cols.some((c) => c.name === k)) continue;
        clean[k] = v === "" ? null : v;
      }

      if (action === "insert-row") {
        const { data, error } = await admin.from(table).insert(clean).select().maybeSingle();
        if (error) throw error;
        await audit("cloud-insert", table, (data as any)?.id ?? null, (data as any)?.user_id ?? null, null, data, reason ?? null);
        return json({ ok: true, row: maskRow((data ?? {}) as any) });
      }

      if (!pk || !cols.some((c) => c.name === pk) || pkValue === undefined) {
        return json({ error: "primary key required" }, 400);
      }

      const { data: before } = await admin.from(table).select("*").eq(pk, pkValue as any).maybeSingle();
      if (!before) return json({ error: "row not found" }, 404);

      if (action === "delete-row") {
        const { error } = await admin.from(table).delete().eq(pk, pkValue as any);
        if (error) throw error;
        await audit("cloud-delete", table, (before as any).id ?? null, (before as any).user_id ?? null, before, null, reason ?? null);
        return json({ ok: true });
      }

      const { data: after, error } = await admin
        .from(table)
        .update(clean)
        .eq(pk, pkValue as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      await audit("cloud-update", table, (before as any).id ?? null, (before as any).user_id ?? null, before, after, reason ?? null);
      return json({ ok: true, row: maskRow((after ?? {}) as any) });
    }

    // ------------------------------------------------------------------
    if (action === "clone-user-data") {
      const P = z
        .object({
          sourceUserId: z.string().uuid(),
          targetUserId: z.string().uuid(),
          sections: z
            .object({
              balances: z.boolean().default(false),
              transactions: z.boolean().default(false),
              deposits: z.boolean().default(false),
              investments: z.boolean().default(false),
              withdrawals: z.boolean().default(false),
            })
            .default({}),
          reason: z.string().max(500).optional(),
        })
        .safeParse(payload);
      if (!P.success) return json({ error: P.error.flatten() }, 400);
      const { sourceUserId, targetUserId, sections, reason } = P.data;
      if (sourceUserId === targetUserId) return json({ error: "source and target must differ" }, 400);

      const summary: Record<string, number> = {};

      const copyTable = async (table: string, strip: string[]) => {
        const { data: src, error: srcErr } = await admin.from(table).select("*").eq("user_id", sourceUserId);
        if (srcErr) throw srcErr;
        const { data: before } = await admin.from(table).select("*").eq("user_id", targetUserId);
        const { error: delErr } = await admin.from(table).delete().eq("user_id", targetUserId);
        if (delErr) throw delErr;
        const rows = (src ?? []).map((r: any) => {
          const out = { ...r, user_id: targetUserId };
          for (const k of strip) delete out[k];
          return out;
        });
        if (rows.length) {
          const { error: insErr } = await admin.from(table).insert(rows);
          if (errIns(insErr)) throw insErr;
        }
        summary[table] = rows.length;
        await audit(
          "clone-user-data",
          table,
          null,
          targetUserId,
          { rows: before ?? [] },
          { rows },
          reason ?? `cloned ${table} from ${sourceUserId}`,
        );
      };
      const errIns = (e: unknown) => !!e;

      // Investments need id mapping so the daily ROI history can follow them.
      const copyInvestmentsWithRoi = async () => {
        const { data: src, error: srcErr } = await admin
          .from("user_investments")
          .select("*")
          .eq("user_id", sourceUserId);
        if (srcErr) throw srcErr;
        const { data: before } = await admin.from("user_investments").select("*").eq("user_id", targetUserId);
        const { error: delErr } = await admin.from("user_investments").delete().eq("user_id", targetUserId);
        if (delErr) throw delErr;

        const inserted: { sourceId: string; newId: string }[] = [];
        for (const r of (src ?? []) as any[]) {
          const row = { ...r, user_id: targetUserId };
          delete row.id;
          delete row.created_at;
          delete row.updated_at;
          const { data: ins, error: insErr } = await admin
            .from("user_investments")
            .insert(row)
            .select("id")
            .maybeSingle();
          if (insErr) throw insErr;
          if (ins?.id) inserted.push({ sourceId: r.id, newId: ins.id });
        }
        summary["user_investments"] = inserted.length;
        await audit(
          "clone-user-data",
          "user_investments",
          null,
          targetUserId,
          { rows: before ?? [] },
          { count: inserted.length },
          reason ?? `cloned user_investments from ${sourceUserId}`,
        );

        // Copy the daily ROI history for each cloned investment.
        let roiCount = 0;
        if (inserted.length) {
          const { data: roiSrc, error: roiErr } = await admin
            .from("investment_daily_roi")
            .select("*")
            .eq("user_id", sourceUserId);
          if (roiErr) throw roiErr;
          const map = new Map(inserted.map((m) => [m.sourceId, m.newId]));
          const roiRows = (roiSrc ?? [])
            .filter((r: any) => map.has(r.investment_id))
            .map((r: any) => {
              const out = { ...r, user_id: targetUserId, investment_id: map.get(r.investment_id) };
              delete out.id;
              delete out.created_at;
              delete out.updated_at;
              return out;
            });
          if (roiRows.length) {
            const { error: roiInsErr } = await admin.from("investment_daily_roi").insert(roiRows);
            if (roiInsErr) throw roiInsErr;
          }
          roiCount = roiRows.length;
        }
        summary["investment_daily_roi"] = roiCount;
      };

      if (sections.balances) await copyTable("wallet_balances", ["id", "created_at", "updated_at"]);
      if (sections.transactions) await copyTable("transactions", ["id"]);
      if (sections.deposits) await copyTable("deposit_history", ["id"]);
      if (sections.investments) await copyInvestmentsWithRoi();
      if (sections.withdrawals) await copyTable("withdrawals", ["id"]);

      return json({ ok: true, summary });
    }

    // ------------------------------------------------------------------

    if (action === "list-users") {
      const users: any[] = [];
      let page = 1;
      while (page <= 25) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        users.push(...data.users);
        if (data.users.length < 200) break;
        page++;
      }
      const { data: profiles } = await admin.from("profiles").select("user_id, display_name");
      const { data: roles } = await admin.from("user_roles").select("user_id, role");
      const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));
      const roleMap = new Map<string, string[]>();
      for (const r of roles ?? []) {
        const arr = roleMap.get((r as any).user_id) ?? [];
        arr.push((r as any).role);
        roleMap.set((r as any).user_id, arr);
      }
      return json({
        users: users
          .map((u) => ({
            user_id: u.id,
            email: u.email ?? null,
            display_name: nameMap.get(u.id) ?? null,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at ?? null,
            confirmed: !!(u.email_confirmed_at ?? u.confirmed_at),
            banned: !!(u as any).banned_until && new Date((u as any).banned_until) > new Date(),
            roles: roleMap.get(u.id) ?? [],
            is_admin: (roleMap.get(u.id) ?? []).includes("admin"),
          }))
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
      });
    }

    if (action === "user-detail") {
      const P = z.object({ user_id: z.string().uuid() }).safeParse(payload);
      if (!P.success) return json({ error: P.error.flatten() }, 400);
      const uid = P.data.user_id;
      const [balances, investments, cards, deposits, withdrawals, txs] = await Promise.all([
        admin.from("wallet_balances").select("coin_symbol, balance").eq("user_id", uid),
        admin.from("user_investments").select("id, plan_name, amount, daily_roi, status, started_at, ends_at").eq("user_id", uid),
        admin.from("virtual_cards").select("id, last4, status, network, daily_limit, per_tx_limit, issued_at").eq("user_id", uid),
        admin.from("deposit_history").select("id, coin_symbol, amount, confirmation_status, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
        admin.from("withdrawals").select("id, amount, fee, status, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
        admin.from("transactions").select("id, type, amount, from_symbol, to_symbol, status, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      ]);
      return json({
        balances: balances.data ?? [],
        investments: investments.data ?? [],
        cards: cards.data ?? [],
        deposits: deposits.data ?? [],
        withdrawals: withdrawals.data ?? [],
        transactions: txs.data ?? [],
      });
    }

    if (action === "user-action") {
      const P = z
        .object({
          kind: z.enum(["grant-admin", "revoke-admin", "reset-password", "magic-link", "ban", "unban", "delete-user"]),
          user_id: z.string().uuid(),
          reason: z.string().max(500).optional(),
        })
        .safeParse(payload);
      if (!P.success) return json({ error: P.error.flatten() }, 400);
      const { kind, user_id, reason } = P.data;

      if (kind === "delete-user" && user_id === caller.id) return json({ error: "you cannot delete yourself" }, 400);
      if (kind === "revoke-admin" && user_id === caller.id) return json({ error: "you cannot revoke your own admin role" }, 400);

      const { data: target } = await admin.auth.admin.getUserById(user_id);
      const email = target?.user?.email ?? null;

      if (kind === "grant-admin") {
        const { error } = await admin.from("user_roles").insert({ user_id, role: "admin" });
        if (error && !error.message.includes("duplicate")) throw error;
      } else if (kind === "revoke-admin") {
        const { error } = await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
        if (error) throw error;
      } else if (kind === "reset-password" || kind === "magic-link") {
        if (!email) return json({ error: "user has no email" }, 400);
        const { error } = await admin.auth.admin.generateLink({
          type: kind === "reset-password" ? "recovery" : "magiclink",
          email,
        });
        if (error) throw error;
      } else if (kind === "ban" || kind === "unban") {
        const { error } = await admin.auth.admin.updateUserById(user_id, {
          ban_duration: kind === "ban" ? "876000h" : "none",
        } as any);
        if (error) throw error;
      } else if (kind === "delete-user") {
        const { error } = await admin.auth.admin.deleteUser(user_id);
        if (error) throw error;
      }

      await audit(`cloud-user-${kind}`, "auth.users", user_id, user_id, { email }, { kind }, reason ?? null);
      return json({ ok: true });
    }

    // ------------------------------------------------------------------
    if (action === "storage-list") {
      const P = z.object({ bucket: z.string().optional(), prefix: z.string().max(200).optional() }).safeParse(payload);
      if (!P.success) return json({ error: P.error.flatten() }, 400);
      const { data: buckets, error: bErr } = await admin.storage.listBuckets();
      if (bErr) throw bErr;
      let files: any[] = [];
      if (P.data.bucket) {
        const { data, error } = await admin.storage
          .from(P.data.bucket)
          .list(P.data.prefix ?? "", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
        if (error) throw error;
        files = data ?? [];
      }
      return json({
        buckets: (buckets ?? []).map((b) => ({ name: b.name, public: b.public, created_at: b.created_at })),
        files,
      });
    }

    if (action === "storage-signed-url") {
      const P = z.object({ bucket: z.string(), path: z.string() }).safeParse(payload);
      if (!P.success) return json({ error: P.error.flatten() }, 400);
      const { data, error } = await admin.storage.from(P.data.bucket).createSignedUrl(P.data.path, 120);
      if (error) throw error;
      return json({ url: data?.signedUrl });
    }

    if (action === "storage-delete") {
      const P = z.object({ bucket: z.string(), path: z.string() }).safeParse(payload);
      if (!P.success) return json({ error: P.error.flatten() }, 400);
      const { error } = await admin.storage.from(P.data.bucket).remove([P.data.path]);
      if (error) throw error;
      await audit("cloud-storage-delete", `storage:${P.data.bucket}`, null, null, { path: P.data.path }, null, null);
      return json({ ok: true });
    }

    if (action === "ops-overview") {
      const [emails, state, suppressed] = await Promise.all([
        admin
          .from("email_send_log")
          .select("id, template_name, recipient_email, status, error_message, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        admin.from("email_send_state").select("*").eq("id", 1).maybeSingle(),
        admin.from("suppressed_emails").select("id, email, reason, created_at").order("created_at", { ascending: false }).limit(50),
      ]);
      return json({
        functions: EDGE_FUNCTIONS,
        emailLog: emails.data ?? [],
        emailState: state.data ?? null,
        suppressed: suppressed.data ?? [],
      });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e: any) {
    console.error("admin-cloud error:", e);
    return json({ error: e.message ?? "unknown error" }, 400);
  }
});
