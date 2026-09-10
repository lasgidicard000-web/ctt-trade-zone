import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const callerId = claimsData.claims.sub as string

    const admin = createClient(supabaseUrl, serviceKey)

    // Verify caller is admin
    const { data: isAdminRow, error: roleErr } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleErr || !isAdminRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch auth users (paginated)
    const authUsers: {
      id: string
      email: string | null
      created_at: string | null
      last_sign_in_at: string | null
    }[] = []
    let page = 1
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      if (error) throw error
      for (const u of data.users) {
        authUsers.push({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at ?? null,
          last_sign_in_at: (u as any).last_sign_in_at ?? null,
        })
      }
      if (data.users.length < 200) break
      page++
      if (page > 25) break
    }

    const [
      { data: profiles },
      { data: roles },
      { data: prices },
      { data: balances },
      { data: investments },
      { data: cards },
      { data: funding },
      { data: merchantReqs },
      { data: withdrawals },
      { data: liveAccounts },
    ] = await Promise.all([
      admin.from('profiles').select('user_id, display_name, avatar_url'),
      admin.from('user_roles').select('user_id, role'),
      admin.from('coin_prices').select('symbol, price'),
      admin.from('wallet_balances').select('user_id, coin_symbol, balance'),
      admin
        .from('user_investments')
        .select('user_id, plan_name, amount, daily_roi, status, started_at, ends_at')
        .order('created_at', { ascending: false }),
      admin
        .from('virtual_cards')
        .select('id, user_id, last4, status, balance_usd, activated_at, network'),
      admin.from('card_funding_requests').select('user_id, status, amount_usd'),
      admin.from('merchant_payment_requests').select('user_id, status, amount_usd'),
      admin.from('withdrawals').select('user_id, status, amount'),
      admin.from('live_accounts').select('user_id, balance, realized_pnl'),
    ])

    const priceMap = new Map((prices ?? []).map((p: any) => [p.symbol, Number(p.price)]))
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]))

    const rolesMap = new Map<string, string[]>()
    for (const r of roles ?? []) {
      const arr = rolesMap.get((r as any).user_id) ?? []
      arr.push((r as any).role)
      rolesMap.set((r as any).user_id, arr)
    }

    const walletUsd = new Map<string, number>()
    for (const b of balances ?? []) {
      const price = priceMap.get((b as any).coin_symbol) ?? 0
      const usd = Number((b as any).balance) * price
      walletUsd.set((b as any).user_id, (walletUsd.get((b as any).user_id) ?? 0) + usd)
    }

    const planMap = new Map<string, any>()
    for (const inv of investments ?? []) {
      const uid = (inv as any).user_id
      const existing = planMap.get(uid)
      const isActive = (inv as any).status === 'active'
      if (!existing || (isActive && existing.status !== 'active')) {
        planMap.set(uid, {
          plan_name: (inv as any).plan_name,
          amount: Number((inv as any).amount),
          daily_roi: Number((inv as any).daily_roi),
          status: (inv as any).status,
          started_at: (inv as any).started_at,
          ends_at: (inv as any).ends_at,
        })
      }
    }
    const activePlanCount = (investments ?? []).filter((i: any) => i.status === 'active').length

    const cardMap = new Map<string, any>()
    for (const c of cards ?? []) {
      cardMap.set((c as any).user_id, {
        id: (c as any).id,
        last4: (c as any).last4,
        status: (c as any).status,
        network: (c as any).network,
        balance_usd: Number((c as any).balance_usd ?? 0),
        activated: Boolean((c as any).activated_at),
      })
    }

    const liveMap = new Map(
      (liveAccounts ?? []).map((a: any) => [
        a.user_id,
        { balance: Number(a.balance), realized_pnl: Number(a.realized_pnl) },
      ]),
    )

    const countPending = (rows: any[] | null) => {
      const m = new Map<string, number>()
      for (const r of rows ?? []) {
        if (r.status !== 'pending') continue
        m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1)
      }
      return m
    }
    const pendingFunding = countPending(funding as any[])
    const pendingMerchant = countPending(merchantReqs as any[])
    const pendingWithdrawals = countPending(withdrawals as any[])

    const users = authUsers.map((u) => {
      const profile: any = profileMap.get(u.id)
      return {
        user_id: u.id,
        email: u.email,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        roles: rolesMap.get(u.id) ?? [],
        is_admin: (rolesMap.get(u.id) ?? []).includes('admin'),
        wallet_usd: Number((walletUsd.get(u.id) ?? 0).toFixed(2)),
        live: liveMap.get(u.id) ?? null,
        plan: planMap.get(u.id) ?? null,
        card: cardMap.get(u.id) ?? null,
        pending: {
          funding: pendingFunding.get(u.id) ?? 0,
          merchant: pendingMerchant.get(u.id) ?? 0,
          withdrawals: pendingWithdrawals.get(u.id) ?? 0,
        },
      }
    })

    const totals = {
      members: users.length,
      wallet_usd: Number(users.reduce((s, u) => s + u.wallet_usd, 0).toFixed(2)),
      card_balance_usd: Number(
        users.reduce((s, u) => s + (u.card?.balance_usd ?? 0), 0).toFixed(2),
      ),
      active_plans: activePlanCount,
      pending_funding: (funding ?? []).filter((f: any) => f.status === 'pending').length,
      pending_merchant: (merchantReqs ?? []).filter((m: any) => m.status === 'pending').length,
      pending_withdrawals: (withdrawals ?? []).filter((w: any) => w.status === 'pending').length,
    }

    return new Response(JSON.stringify({ users, totals }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
