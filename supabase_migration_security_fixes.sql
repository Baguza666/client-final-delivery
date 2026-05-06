-- ============================================================
-- Security & Data-Integrity Fixes
-- Run once in the Supabase SQL Editor.
-- ============================================================


-- ─── 1. REMOVE ANONYMOUS READ POLICY ON INVOICE_SHARE_LINKS ─────────────────
-- The using(true) policy let any anon key holder enumerate every share token.
-- Token resolution is handled server-side via service-role only.

drop policy if exists "invoice_share_links: public read by token"
    on public.invoice_share_links;


-- ─── 2. WORKSPACE IDEMPOTENCY ────────────────────────────────────────────────
-- Remove duplicate workspaces (keep the oldest row per owner), then enforce
-- the uniqueness constraint the insert-or-fallback logic in workspace.ts depends on.
--
-- SAFE APPROACH: re-home all child rows to the survivor workspace before
-- deleting duplicates. All child tables use ON DELETE CASCADE, so a naive
-- DELETE would destroy every client, invoice, payment, etc. that belonged
-- to the removed workspace ids.

begin;

-- Build survivor map: oldest workspace per owner is the one we keep.
create temp table _ws_survivors as
select distinct on (owner_id) id as survivor_id, owner_id
from   public.workspaces
order  by owner_id, created_at asc;

-- Collect the ids of every workspace that will be removed.
create temp table _ws_dups as
select w.id as dup_id, s.survivor_id
from   public.workspaces w
join   _ws_survivors s on s.owner_id = w.owner_id
where  w.id <> s.survivor_id;

-- workspace_settings has UNIQUE(workspace_id).
-- If the survivor already has a settings row, delete the duplicate's row
-- (cannot update to an already-taken id). Otherwise re-home it.
delete from public.workspace_settings d
using  _ws_dups dm
where  d.workspace_id = dm.dup_id
  and  exists (
           select 1 from public.workspace_settings s
           where  s.workspace_id = dm.survivor_id
       );

update public.workspace_settings
set    workspace_id = dm.survivor_id
from   _ws_dups dm
where  workspace_id = dm.dup_id;

-- Re-home all other direct-workspace-id child tables.
update public.clients
    set workspace_id = dm.survivor_id from _ws_dups dm where workspace_id = dm.dup_id;

update public.products
    set workspace_id = dm.survivor_id from _ws_dups dm where workspace_id = dm.dup_id;

update public.invoices
    set workspace_id = dm.survivor_id from _ws_dups dm where workspace_id = dm.dup_id;

update public.quotes
    set workspace_id = dm.survivor_id from _ws_dups dm where workspace_id = dm.dup_id;

update public.purchase_orders
    set workspace_id = dm.survivor_id from _ws_dups dm where workspace_id = dm.dup_id;

update public.delivery_notes
    set workspace_id = dm.survivor_id from _ws_dups dm where workspace_id = dm.dup_id;

update public.expenses
    set workspace_id = dm.survivor_id from _ws_dups dm where workspace_id = dm.dup_id;

update public.debts
    set workspace_id = dm.survivor_id from _ws_dups dm where workspace_id = dm.dup_id;

update public.payments
    set workspace_id = dm.survivor_id from _ws_dups dm where workspace_id = dm.dup_id;

-- All children now point to the survivor; cascades on the following delete
-- will find no dependent rows.
delete from public.workspaces
where  id in (select dup_id from _ws_dups);

drop table _ws_survivors;
drop table _ws_dups;

alter table public.workspaces
    add constraint workspaces_owner_id_unique unique (owner_id);

commit;


-- ─── 3. ATOMIC RECONCILIATION RPC ───────────────────────────────────────────
-- Inserts only the *remaining* balance (total_ttc minus existing payments) and
-- marks the invoice paid in a single transaction. Handles partial payments
-- correctly: a second reconciliation call on a partially-paid invoice settles
-- only the outstanding amount instead of double-booking the full total.
-- SECURITY DEFINER so the function can bypass RLS, but includes an explicit
-- ownership check so callers can only reconcile their own invoices.
-- Idempotent: a call on an already-paid invoice is a no-op.

create or replace function public.mark_invoice_paid(invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_workspace_id  uuid;
    v_total_ttc     numeric;
    v_status        text;
    v_paid_already  numeric;
    v_remaining     numeric;
begin
    select i.workspace_id, i.total_ttc, i.status
    into   v_workspace_id, v_total_ttc, v_status
    from   invoices i
    join   workspaces w on w.id = i.workspace_id
    where  i.id = mark_invoice_paid.invoice_id
      and  w.owner_id = auth.uid();

    if not found then
        raise exception 'Invoice not found or access denied';
    end if;

    if v_status = 'paid' then
        return;
    end if;

    -- Compute the true outstanding balance from persisted payment records.
    select coalesce(sum(amount), 0)
    into   v_paid_already
    from   payments
    where  invoice_id = mark_invoice_paid.invoice_id;

    v_remaining := v_total_ttc - v_paid_already;

    if v_remaining <= 0 then
        -- Already fully covered by prior payments; flip status without inserting.
        update invoices set status = 'paid' where id = mark_invoice_paid.invoice_id;
        return;
    end if;

    -- Payment insert runs first; any failure aborts the whole transaction
    -- so the status update below never executes.
    insert into payments (invoice_id, workspace_id, amount, payment_date, method, notes)
    values (
        mark_invoice_paid.invoice_id,
        v_workspace_id,
        v_remaining,
        current_date,
        'virement',
        'Rapprochement bancaire'
    );

    update invoices
    set    status = 'paid'
    where  id = mark_invoice_paid.invoice_id;
end;
$$;
