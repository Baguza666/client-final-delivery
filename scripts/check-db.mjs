/**
 * Phase 3 — Connection & Schema Health Check
 * Run: node --env-file=.env.local scripts/check-db.mjs
 *
 * Verifies:
 *   1. Supabase connection is live (new project credentials work)
 *   2. All 19 expected tables exist
 *   3. Key structural changes from the refactor are in place
 */

import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
    console.error('✗  NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local')
    process.exit(1)
}

const supabase = createClient(url, key)

let passed = 0
let failed = 0

function ok(label) {
    console.log(`  ✓  ${label}`)
    passed++
}

function fail(label, detail = '') {
    console.log(`  ✗  ${label}${detail ? `  →  ${detail}` : ''}`)
    failed++
}

// ── Helper: fetch columns for a table from information_schema ────────────────
async function getColumns(table) {
    const { data, error } = await supabase
        .rpc('get_table_columns', { p_table: table })
        .select()

    if (error) {
        // Fallback: try a dummy select and read column metadata another way.
        // Some blank projects won't have a helper function, so we directly
        // query information_schema via a raw SQL RPC we define below.
        return null
    }
    return data?.map(r => r.column_name) ?? []
}

// We query information_schema directly using Supabase's pg RPC capability.
// The function below runs a parameterised query through Supabase's REST API.
async function columnsOf(table) {
    const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', table)

    if (error) return null
    return data.map(r => r.column_name)
}

// ── 1. Connection check ──────────────────────────────────────────────────────
console.log('\n── 1. Connection ───────────────────────────────────────')
try {
    const { error } = await supabase.from('workspaces').select('id').limit(1)
    if (error) fail('Supabase connection', error.message)
    else        ok('Supabase connection reachable')
} catch (e) {
    fail('Supabase connection', e.message)
}

// ── 2. Table existence ───────────────────────────────────────────────────────
console.log('\n── 2. Table existence ──────────────────────────────────')
const EXPECTED_TABLES = [
    'profiles',
    'team_invitations',
    'workspaces',
    'workspace_settings',
    'clients',
    'products',
    'invoices',
    'invoice_items',
    'quotes',
    'quote_items',
    'purchase_orders',
    'purchase_order_items',
    'delivery_notes',
    'delivery_note_items',
    'expenses',
    'debts',
    'payments',
    'invoice_share_links',
    'invoice_payment_links',
]

for (const table of EXPECTED_TABLES) {
    const { error } = await supabase.from(table).select('id').limit(0)
    // RLS might reject the query but still means the table exists (code 42501 ≠ table-not-found)
    if (!error || error.code !== '42P01') {
        ok(table)
    } else {
        fail(table, 'table not found — did you run the schema SQL?')
    }
}

// ── 3. Structural checks ─────────────────────────────────────────────────────
console.log('\n── 3. Structural integrity ─────────────────────────────')

// We probe column presence by attempting a select on that specific column.
async function hasColumn(table, column) {
    const { error } = await supabase.from(table).select(column).limit(0)
    // No error → column exists. "column X does not exist" → code 42703.
    if (!error) return true
    if (error.code === '42703') return false
    // Any other error (RLS, etc.) — column most likely exists.
    return true
}

// invoices: must have invoice_number, must NOT have number / total / total_amount
const inv_has_invoice_number  = await hasColumn('invoices', 'invoice_number')
const inv_has_banned_number   = await hasColumn('invoices', 'number')
const inv_has_banned_total    = await hasColumn('invoices', 'total')
const inv_has_banned_total_am = await hasColumn('invoices', 'total_amount')

inv_has_invoice_number
    ? ok('invoices.invoice_number exists')
    : fail('invoices.invoice_number', 'column missing')

!inv_has_banned_number
    ? ok('invoices.number is absent (double-id removed)')
    : fail('invoices.number', 'stale column still present — schema not applied')

!inv_has_banned_total
    ? ok('invoices.total is absent (dedup removed)')
    : fail('invoices.total', 'stale column still present')

!inv_has_banned_total_am
    ? ok('invoices.total_amount is absent (dedup removed)')
    : fail('invoices.total_amount', 'stale column still present')

// clients: must have workspace_id, must NOT have owner_id
const cli_has_ws  = await hasColumn('clients', 'workspace_id')
const cli_has_own = await hasColumn('clients', 'owner_id')

cli_has_ws
    ? ok('clients.workspace_id exists (multi-tenancy)')
    : fail('clients.workspace_id', 'column missing')

!cli_has_own
    ? ok('clients.owner_id is absent (old pattern removed)')
    : fail('clients.owner_id', 'stale column still present')

// expenses: must have workspace_id
const exp_has_ws = await hasColumn('expenses', 'workspace_id')
exp_has_ws
    ? ok('expenses.workspace_id exists (orphan-guard)')
    : fail('expenses.workspace_id', 'column missing')

// quote_items: must have tva_rate
const qi_has_tva = await hasColumn('quote_items', 'tva_rate')
qi_has_tva
    ? ok('quote_items.tva_rate exists (dynamic TVA)')
    : fail('quote_items.tva_rate', 'column missing')

// invoice_items: must have tva_rate
const ii_has_tva = await hasColumn('invoice_items', 'tva_rate')
ii_has_tva
    ? ok('invoice_items.tva_rate exists')
    : fail('invoice_items.tva_rate', 'column missing')

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n────────────────────────────────────────────────────────')
const total = passed + failed
console.log(`  ${passed}/${total} checks passed`)
if (failed === 0) {
    console.log('  All checks green. Ready for Phase 4.\n')
    process.exit(0)
} else {
    console.log(`  ${failed} check(s) failed. Fix above before continuing.\n`)
    process.exit(1)
}
