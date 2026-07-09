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
    const authUsers: { id: string; email: string | null }[] = []
    let page = 1
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      if (error) throw error
      for (const u of data.users) authUsers.push({ id: u.id, email: u.email ?? null })
      if (data.users.length < 200) break
      page++
      if (page > 25) break
    }

    const { data: profiles } = await admin
      .from('profiles')
      .select('user_id, display_name')

    const { data: roles } = await admin.from('user_roles').select('user_id, role')

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]))
    const rolesMap = new Map<string, string[]>()
    for (const r of roles ?? []) {
      const arr = rolesMap.get((r as any).user_id) ?? []
      arr.push((r as any).role)
      rolesMap.set((r as any).user_id, arr)
    }

    const users = authUsers.map((u) => ({
      user_id: u.id,
      email: u.email,
      display_name: profileMap.get(u.id) ?? null,
      roles: rolesMap.get(u.id) ?? [],
      is_admin: (rolesMap.get(u.id) ?? []).includes('admin'),
    }))

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
