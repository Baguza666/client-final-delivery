-- ============================================================
-- Invoicify — Complete Baseline Schema (v1.0)
-- Run once in the Supabase SQL Editor on a completely blank
-- database. Defines all tables, FKs, and RLS policies.
-- Replaces supabase_migration_multicurrency.sql (that patch
-- is now included here).
-- ============================================================


-- ─── 1. PROFILES ─────────────────────────────────────────────────────────────
-- One row per auth.users row; stores the app-level role.

create table public.profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    role        text not null default 'user',
    created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner can read and update"
    on public.profiles for all
    using  (auth.uid() = id)
    with check (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.profiles (id)
    values (new.id)
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- ─── 2. TEAM_INVITATIONS ─────────────────────────────────────────────────────

create table public.team_invitations (
    id          uuid primary key default gen_random_uuid(),
    email       text not null unique,
    role        text not null default 'user',
    invited_by  uuid references auth.users(id) on delete set null,
    status      text not null default 'pending',
    created_at  timestamptz not null default now()
);

alter table public.team_invitations enable row level security;

create policy "team_invitations: admins can manage"
    on public.team_invitations for all
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );


-- ─── 3. WORKSPACES ───────────────────────────────────────────────────────────

create table public.workspaces (
    id              uuid primary key default gen_random_uuid(),
    owner_id        uuid not null references auth.users(id) on delete cascade,
    name            text,
    email           text,
    email_secondary text,
    phone           text,
    address         text,
    city            text,
    country         text,
    tax_id          text,   -- IF (Identifiant Fiscal)
    ice             text,   -- Identifiant Commun de l'Entreprise
    rc              text,   -- Registre de Commerce
    cnss            text,   -- CNSS number
    tp              text,   -- Taxe Professionnelle
    bank_name       text,
    rib             text,   -- Moroccan bank account number
    logo_url            text,
    signature_name      text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz
);

alter table public.workspaces enable row level security;

create policy "workspaces: owner full access"
    on public.workspaces for all
    using  (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);


-- ─── 4. WORKSPACE_SETTINGS ───────────────────────────────────────────────────

create table public.workspace_settings (
    id                  uuid primary key default gen_random_uuid(),
    workspace_id        uuid not null unique references public.workspaces(id) on delete cascade,
    smtp_host           text,
    smtp_port           text,
    smtp_email          text,
    smtp_password       text,
    email_sender_name   text,
    updated_at          timestamptz
);

alter table public.workspace_settings enable row level security;

create policy "workspace_settings: owner full access"
    on public.workspace_settings for all
    using (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    )
    with check (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    );


-- ─── 5. CLIENTS ──────────────────────────────────────────────────────────────
-- Clients belong to a workspace, enforcing true multi-tenancy.

create table public.clients (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces(id) on delete cascade,
    name            text not null,
    email       text,
    phone       text,
    address     text,
    city        text,
    ice         text,
    type        text default 'client',
    created_at  timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "clients: workspace owner full access"
    on public.clients for all
    using (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    )
    with check (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    );


-- ─── 6. PRODUCTS ─────────────────────────────────────────────────────────────

create table public.products (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces(id) on delete cascade,
    name            text not null,
    price           numeric not null default 0,
    unit            text not null default 'Unité',
    description     text,
    base_currency   text not null default 'MAD',
    created_at      timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products: workspace owner full access"
    on public.products for all
    using (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    )
    with check (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    );


-- ─── 7. INVOICES ─────────────────────────────────────────────────────────────

create table public.invoices (
    id                  uuid primary key default gen_random_uuid(),
    workspace_id        uuid not null references public.workspaces(id) on delete cascade,
    client_id           uuid references public.clients(id) on delete set null,
    owner_id            uuid references auth.users(id) on delete set null,
    -- invoice_number is the single document identifier.
    -- auto-numbering logic queries it with ilike.
    invoice_number      text,
    date                date,
    issue_date          date,
    due_date            date,
    status              text not null default 'draft',
    discount            numeric not null default 0,
    -- All stored as MAD equivalents.
    total_ht            numeric not null default 0,
    total_tva           numeric not null default 0,
    total_ttc           numeric not null default 0,
    currency            text not null default 'MAD',
    exchange_rate       numeric not null default 1,
    is_recurring        boolean not null default false,
    frequency           text,
    notes               text,
    last_generated_at   timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz
);

alter table public.invoices enable row level security;

create policy "invoices: workspace owner full access"
    on public.invoices for all
    using (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    )
    with check (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    );


-- ─── 8. INVOICE_ITEMS ────────────────────────────────────────────────────────

create table public.invoice_items (
    id              uuid primary key default gen_random_uuid(),
    invoice_id      uuid not null references public.invoices(id) on delete cascade,
    description     text not null,
    unit            text,
    quantity        numeric not null default 1,
    unit_price      numeric not null default 0,
    tva_rate        numeric not null default 20,
    total           numeric not null default 0,
    -- Multi-currency snapshot: null for manually-typed lines.
    original_price  numeric,
    base_currency   text,
    rate_snapshot   numeric
);

alter table public.invoice_items enable row level security;

create policy "invoice_items: via invoice workspace"
    on public.invoice_items for all
    using (
        exists (
            select 1 from public.invoices i
            join  public.workspaces w on w.id = i.workspace_id
            where i.id = invoice_id and w.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.invoices i
            join  public.workspaces w on w.id = i.workspace_id
            where i.id = invoice_id and w.owner_id = auth.uid()
        )
    );


-- ─── 9. QUOTES ───────────────────────────────────────────────────────────────

create table public.quotes (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces(id) on delete cascade,
    client_id       uuid references public.clients(id) on delete set null,
    number          text,
    date            date,
    discount        numeric not null default 0,
    discount_rate   numeric not null default 0,
    total_amount    numeric not null default 0,
    valid_until     date,
    status          text not null default 'draft',
    notes           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz
);

alter table public.quotes enable row level security;

create policy "quotes: workspace owner full access"
    on public.quotes for all
    using (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    )
    with check (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    );


-- ─── 10. QUOTE_ITEMS ─────────────────────────────────────────────────────────

create table public.quote_items (
    id          uuid primary key default gen_random_uuid(),
    quote_id    uuid not null references public.quotes(id) on delete cascade,
    description text not null,
    unit        text,
    quantity    numeric not null default 1,
    unit_price  numeric not null default 0,
    tva_rate    numeric not null default 20,
    total       numeric not null default 0
);

alter table public.quote_items enable row level security;

create policy "quote_items: via quote workspace"
    on public.quote_items for all
    using (
        exists (
            select 1 from public.quotes q
            join  public.workspaces w on w.id = q.workspace_id
            where q.id = quote_id and w.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.quotes q
            join  public.workspaces w on w.id = q.workspace_id
            where q.id = quote_id and w.owner_id = auth.uid()
        )
    );


-- ─── 11. PURCHASE_ORDERS ─────────────────────────────────────────────────────

create table public.purchase_orders (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces(id) on delete cascade,
    client_id       uuid references public.clients(id) on delete set null,
    owner_id        uuid references auth.users(id) on delete set null,
    number          text,
    date            date,
    status          text not null default 'draft',
    total_ht        numeric,
    total_ttc       numeric,
    notes           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz
);

alter table public.purchase_orders enable row level security;

create policy "purchase_orders: workspace owner full access"
    on public.purchase_orders for all
    using (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    )
    with check (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    );


-- ─── 12. PURCHASE_ORDER_ITEMS ────────────────────────────────────────────────

create table public.purchase_order_items (
    id                  uuid primary key default gen_random_uuid(),
    purchase_order_id   uuid not null references public.purchase_orders(id) on delete cascade,
    description         text not null,
    unit                text,
    quantity            numeric not null default 1,
    unit_price          numeric not null default 0,
    total               numeric not null default 0
);

alter table public.purchase_order_items enable row level security;

create policy "purchase_order_items: via po workspace"
    on public.purchase_order_items for all
    using (
        exists (
            select 1 from public.purchase_orders po
            join  public.workspaces w on w.id = po.workspace_id
            where po.id = purchase_order_id and w.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.purchase_orders po
            join  public.workspaces w on w.id = po.workspace_id
            where po.id = purchase_order_id and w.owner_id = auth.uid()
        )
    );


-- ─── 13. DELIVERY_NOTES ──────────────────────────────────────────────────────

create table public.delivery_notes (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces(id) on delete cascade,
    client_id       uuid references public.clients(id) on delete set null,
    owner_id        uuid references auth.users(id) on delete set null,
    number          text,
    date            date,
    status          text not null default 'draft',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz
);

alter table public.delivery_notes enable row level security;

create policy "delivery_notes: workspace owner full access"
    on public.delivery_notes for all
    using (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    )
    with check (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    );


-- ─── 14. DELIVERY_NOTE_ITEMS ─────────────────────────────────────────────────

create table public.delivery_note_items (
    id                  uuid primary key default gen_random_uuid(),
    delivery_note_id    uuid not null references public.delivery_notes(id) on delete cascade,
    description         text not null,
    unit                text,
    quantity            numeric not null default 1
);

alter table public.delivery_note_items enable row level security;

create policy "delivery_note_items: via dn workspace"
    on public.delivery_note_items for all
    using (
        exists (
            select 1 from public.delivery_notes dn
            join  public.workspaces w on w.id = dn.workspace_id
            where dn.id = delivery_note_id and w.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.delivery_notes dn
            join  public.workspaces w on w.id = dn.workspace_id
            where dn.id = delivery_note_id and w.owner_id = auth.uid()
        )
    );


-- ─── 15. EXPENSES ────────────────────────────────────────────────────────────
create table public.expenses (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces(id) on delete cascade,
    amount          numeric not null default 0,
    description     text,
    category        text,
    date            timestamptz,
    payment_method  text default 'Espèces',
    proof_url       text,
    receipt_url     text,
    is_recurring    boolean not null default false,
    frequency       text,
    status          text default 'paid',
    created_at      timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy "expenses: workspace owner full access"
    on public.expenses for all
    using (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    )
    with check (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    );


-- ─── 16. DEBTS ───────────────────────────────────────────────────────────────

create table public.debts (
    id                  uuid primary key default gen_random_uuid(),
    workspace_id        uuid not null references public.workspaces(id) on delete cascade,
    creditor_name       text not null,
    total_amount        numeric not null default 0,
    remaining_amount    numeric not null default 0,
    monthly_payment     numeric,
    due_date            date,
    status              text not null default 'Active',
    last_payment        timestamptz,
    created_at          timestamptz not null default now()
);

alter table public.debts enable row level security;

create policy "debts: workspace owner full access"
    on public.debts for all
    using (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    )
    with check (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    );


-- ─── 17. PAYMENTS ────────────────────────────────────────────────────────────

create table public.payments (
    id              uuid primary key default gen_random_uuid(),
    invoice_id      uuid not null references public.invoices(id) on delete cascade,
    workspace_id    uuid not null references public.workspaces(id) on delete cascade,
    amount          numeric not null default 0,
    payment_date    date,
    method          text,
    notes           text,
    created_at      timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments: workspace owner full access"
    on public.payments for all
    using (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    )
    with check (
        exists (select 1 from public.workspaces w
                where w.id = workspace_id and w.owner_id = auth.uid())
    );


-- ─── 18. INVOICE_SHARE_LINKS ─────────────────────────────────────────────────

create table public.invoice_share_links (
    id          uuid primary key default gen_random_uuid(),
    invoice_id  uuid not null references public.invoices(id) on delete cascade,
    token       text not null unique,
    created_by  uuid references auth.users(id) on delete set null,
    created_at  timestamptz not null default now()
);

alter table public.invoice_share_links enable row level security;

-- Workspace owner can create / delete their links.
create policy "invoice_share_links: workspace owner can manage"
    on public.invoice_share_links for all
    using (
        exists (
            select 1 from public.invoices i
            join  public.workspaces w on w.id = i.workspace_id
            where i.id = invoice_id and w.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.invoices i
            join  public.workspaces w on w.id = i.workspace_id
            where i.id = invoice_id and w.owner_id = auth.uid()
        )
    );

-- Unauthenticated visitors can resolve a token on the /view/[token] route.
create policy "invoice_share_links: public read by token"
    on public.invoice_share_links for select
    using (true);


-- ─── 19. INVOICE_PAYMENT_LINKS ───────────────────────────────────────────────

create table public.invoice_payment_links (
    id              uuid primary key default gen_random_uuid(),
    invoice_id      uuid not null references public.invoices(id) on delete cascade,
    provider        text not null default 'stripe',
    stripe_url      text,
    stripe_price_id text,
    stripe_link_id  text,
    amount          numeric,
    created_at      timestamptz not null default now(),
    unique (invoice_id, provider)
);

alter table public.invoice_payment_links enable row level security;

create policy "invoice_payment_links: workspace owner full access"
    on public.invoice_payment_links for all
    using (
        exists (
            select 1 from public.invoices i
            join  public.workspaces w on w.id = i.workspace_id
            where i.id = invoice_id and w.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.invoices i
            join  public.workspaces w on w.id = i.workspace_id
            where i.id = invoice_id and w.owner_id = auth.uid()
        )
    );


-- ─── 20. STORAGE BUCKETS ─────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
    values ('logos', 'logos', true)
    on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
    values ('receipts', 'receipts', false)
    on conflict (id) do nothing;

-- logos is a public bucket; reads work without a policy.
-- Authenticated users can upload/update/delete.
create policy "logos: authenticated write"
    on storage.objects for insert
    with check (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "logos: authenticated update"
    on storage.objects for update
    using (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "logos: authenticated delete"
    on storage.objects for delete
    using (bucket_id = 'logos' and auth.role() = 'authenticated');

-- receipts is private; only authenticated users.
create policy "receipts: authenticated full access"
    on storage.objects for all
    using  (bucket_id = 'receipts' and auth.role() = 'authenticated')
    with check (bucket_id = 'receipts' and auth.role() = 'authenticated');
