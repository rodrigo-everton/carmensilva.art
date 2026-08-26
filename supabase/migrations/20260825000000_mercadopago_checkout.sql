-- Mercado Pago Checkout Pro persistence.
--
-- This migration is intentionally additive: the production project already has
-- sales and payments, while a fresh project may not. Financial mutations are
-- reserved for service_role; authenticated users only receive scoped reads.

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations (id) on delete set null,
  artwork_id text not null,
  customer_id uuid not null references auth.users (id) on delete restrict,
  negotiated_price numeric(12, 2) not null,
  currency text not null default 'BRL',
  sale_status text not null default 'negotiating',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_negotiated_price_positive_check check (negotiated_price > 0),
  constraint sales_currency_code_check check (currency ~ '^[A-Z]{3}$'),
  constraint sales_sale_status_check check (
    sale_status in (
      'negotiating',
      'awaiting_payment',
      'paid',
      'preparing_delivery',
      'shipped',
      'delivered',
      'completed',
      'cancelled'
    )
  )
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete restrict,
  provider text not null default 'mercadopago',
  provider_payment_id text,
  amount numeric(12, 2) not null,
  currency text not null default 'BRL',
  payment_method text,
  status text not null default 'pending',
  provider_status text,
  status_detail text,
  live_mode boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint payments_amount_positive_check check (amount > 0),
  constraint payments_currency_code_check check (currency ~ '^[A-Z]{3}$'),
  constraint payments_normalized_status_check check (
    status in ('pending', 'approved', 'rejected', 'refunded')
  )
);

-- These are the only new columns required on the existing payments table.
alter table public.payments
  add column if not exists provider_status text,
  add column if not exists status_detail text,
  add column if not exists live_mode boolean;

alter table public.payments
  alter column provider set default 'mercadopago';

-- If sales/payments predated this migration, enforce normalized values for all
-- new writes without making deployment fail because of historical rows. A
-- subsequent data audit may validate these NOT VALID constraints explicitly.
do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_sale_status_check'
  ) then
    alter table public.sales
      add constraint sales_sale_status_check check (
        sale_status in (
          'negotiating',
          'awaiting_payment',
          'paid',
          'preparing_delivery',
          'shipped',
          'delivered',
          'completed',
          'cancelled'
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payments'::regclass
      and conname = 'payments_normalized_status_check'
  ) then
    alter table public.payments
      add constraint payments_normalized_status_check check (
        status in ('pending', 'approved', 'rejected', 'refunded')
      ) not valid;
  end if;
end
$migration$;

create table if not exists public.payment_preferences (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete restrict,
  conversation_id uuid not null references public.conversations (id) on delete restrict,
  created_by uuid not null references auth.users (id) on delete restrict,
  provider text not null default 'mercadopago',
  provider_preference_id text,
  checkout_url text,
  amount_cents bigint not null,
  currency text not null default 'BRL',
  status text not null default 'creating',
  -- Reserved before the chat message is inserted. The FK intentionally exists
  -- only in the messages -> payment_preferences direction below.
  message_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_preferences_amount_cents_positive_check check (amount_cents > 0),
  constraint payment_preferences_currency_code_check check (currency ~ '^[A-Z]{3}$'),
  constraint payment_preferences_status_check check (
    status in (
      'creating',
      'active',
      'paid',
      'superseded',
      'expired',
      'refunded',
      'failed'
    )
  )
);

alter table public.messages
  add column if not exists payment_preference_id uuid;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.messages'::regclass
      and conname = 'messages_payment_preference_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_payment_preference_id_fkey
      foreign key (payment_preference_id)
      references public.payment_preferences (id)
      on delete set null;
  end if;
end
$migration$;

create unique index if not exists sales_conversation_id_uidx
  on public.sales (conversation_id)
  where conversation_id is not null;

-- Negotiation alone does not reserve an artwork. Once checkout starts, every
-- subsequent state keeps it protected from a simultaneous or accidental sale.
create unique index if not exists sales_one_active_per_artwork_uidx
  on public.sales (artwork_id)
  where sale_status in (
    'awaiting_payment',
    'paid',
    'preparing_delivery',
    'shipped',
    'delivered',
    'completed'
  );

create unique index if not exists payments_provider_payment_id_uidx
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists payment_preferences_provider_id_uidx
  on public.payment_preferences (provider, provider_preference_id)
  where provider_preference_id is not null;

create unique index if not exists payment_preferences_one_open_per_sale_uidx
  on public.payment_preferences (sale_id)
  where status in ('creating', 'active');

create index if not exists payment_preferences_conversation_id_idx
  on public.payment_preferences (conversation_id);

create index if not exists payment_preferences_message_id_idx
  on public.payment_preferences (message_id)
  where message_id is not null;

create index if not exists messages_payment_preference_id_idx
  on public.messages (payment_preference_id)
  where payment_preference_id is not null;

create or replace function public.set_financial_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := now();
  return new;
end
$function$;

do $migration$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.sales'::regclass
      and tgname = 'sales_set_updated_at'
      and not tgisinternal
  ) then
    create trigger sales_set_updated_at
      before update on public.sales
      for each row execute function public.set_financial_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.payments'::regclass
      and tgname = 'payments_set_updated_at'
      and not tgisinternal
  ) then
    create trigger payments_set_updated_at
      before update on public.payments
      for each row execute function public.set_financial_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.payment_preferences'::regclass
      and tgname = 'payment_preferences_set_updated_at'
      and not tgisinternal
  ) then
    create trigger payment_preferences_set_updated_at
      before update on public.payment_preferences
      for each row execute function public.set_financial_updated_at();
  end if;
end
$migration$;

-- Avoid recursive user_roles policies while allowing RLS predicates to share a
-- single, server-owned admin check.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.user_roles as user_role
      where user_role.user_id = auth.uid()
        and user_role.role::text = 'admin'
    );
$function$;

revoke all privileges on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;

alter table public.sales enable row level security;
alter table public.payments enable row level security;
alter table public.payment_preferences enable row level security;

-- Replace policies on these financial tables so a pre-existing permissive
-- policy cannot accidentally broaden access. Table grants below still prevent
-- all client-side mutation.
do $migration$
declare
  target_table text;
  existing_policy record;
begin
  foreach target_table in array array['sales', 'payments', 'payment_preferences']
  loop
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format(
        'drop policy %I on public.%I',
        existing_policy.policyname,
        target_table
      );
    end loop;
  end loop;
end
$migration$;

create policy sales_select_customer_or_admin
on public.sales
for select
to authenticated
using (
  customer_id = (select auth.uid())
  or (select public.is_admin())
);

create policy payments_select_customer_or_admin
on public.payments
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.sales as payment_sale
    where payment_sale.id = payments.sale_id
      and payment_sale.customer_id = (select auth.uid())
  )
);

create policy payment_preferences_select_customer_or_admin
on public.payment_preferences
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.sales as preference_sale
    where preference_sale.id = payment_preferences.sale_id
      and preference_sale.customer_id = (select auth.uid())
  )
);

revoke all privileges on table public.sales from public, anon, authenticated;
revoke all privileges on table public.payments from public, anon, authenticated;
revoke all privileges on table public.payment_preferences from public, anon, authenticated;

grant select on table public.sales to authenticated;
grant select on table public.payments to authenticated;
grant select on table public.payment_preferences to authenticated;

grant all privileges on table public.sales to service_role;
grant all privileges on table public.payments to service_role;
grant all privileges on table public.payment_preferences to service_role;

-- Canonical, idempotent application of a payment fetched from Mercado Pago.
-- The webhook body itself must never supply amount/status without first fetching
-- the payment resource from Mercado Pago after signature validation.
create or replace function public.record_mercadopago_payment(
  p_preference_id uuid,
  p_provider_payment_id text,
  p_amount numeric,
  p_currency text,
  p_payment_method text,
  p_status text,
  p_provider_status text,
  p_status_detail text,
  p_live_mode boolean,
  p_paid_at timestamptz
)
returns public.payments
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  locked_preference public.payment_preferences%rowtype;
  locked_sale public.sales%rowtype;
  stored_payment public.payments%rowtype;
  existing_sale_id uuid;
  existing_amount numeric;
  existing_currency text;
  normalized_payment_id text := btrim(p_provider_payment_id);
  normalized_currency text := upper(btrim(p_currency));
  normalized_status text := lower(btrim(p_status));
begin
  if p_preference_id is null then
    raise exception using
      errcode = '22023',
      message = 'payment preference id is required';
  end if;

  if normalized_payment_id is null or normalized_payment_id = '' then
    raise exception using
      errcode = '22023',
      message = 'provider payment id is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception using
      errcode = '22023',
      message = 'payment amount must be positive';
  end if;

  if normalized_currency is null or normalized_currency !~ '^[A-Z]{3}$' then
    raise exception using
      errcode = '22023',
      message = 'payment currency must be a three-letter ISO code';
  end if;

  if normalized_status is null or normalized_status not in (
    'pending',
    'approved',
    'rejected',
    'refunded'
  ) then
    raise exception using
      errcode = '22023',
      message = 'unsupported normalized payment status';
  end if;

  if p_live_mode is null then
    raise exception using
      errcode = '22023',
      message = 'payment live_mode is required';
  end if;

  select *
  into locked_preference
  from public.payment_preferences
  where id = p_preference_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'payment preference was not found';
  end if;

  if locked_preference.provider <> 'mercadopago' then
    raise exception using
      errcode = '22023',
      message = 'payment preference provider is not Mercado Pago';
  end if;

  if p_amount * 100 <> locked_preference.amount_cents::numeric then
    raise exception using
      errcode = '22003',
      message = 'payment amount does not match the preference amount';
  end if;

  if normalized_currency <> upper(btrim(locked_preference.currency)) then
    raise exception using
      errcode = '22023',
      message = 'payment currency does not match the preference currency';
  end if;

  select *
  into locked_sale
  from public.sales
  where id = locked_preference.sale_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'sale for payment preference was not found';
  end if;

  if locked_preference.conversation_id is distinct from locked_sale.conversation_id then
    raise exception using
      errcode = '23514',
      message = 'payment preference does not belong to the sale conversation';
  end if;

  select payment.sale_id, payment.amount, payment.currency
  into existing_sale_id, existing_amount, existing_currency
  from public.payments as payment
  where payment.provider = 'mercadopago'
    and payment.provider_payment_id = normalized_payment_id
  for update;

  if found then
    if existing_sale_id <> locked_sale.id then
      raise exception using
        errcode = '23505',
        message = 'provider payment id is already attached to another sale';
    end if;

    if existing_amount <> p_amount
      or upper(btrim(existing_currency)) <> normalized_currency then
      raise exception using
        errcode = '23514',
        message = 'provider payment id has conflicting amount or currency';
    end if;
  end if;

  insert into public.payments as current_payment (
    sale_id,
    provider,
    provider_payment_id,
    amount,
    currency,
    payment_method,
    status,
    provider_status,
    status_detail,
    live_mode,
    paid_at
  ) values (
    locked_sale.id,
    'mercadopago',
    normalized_payment_id,
    p_amount,
    normalized_currency,
    nullif(btrim(p_payment_method), ''),
    normalized_status,
    coalesce(nullif(btrim(p_provider_status), ''), normalized_status),
    nullif(btrim(p_status_detail), ''),
    p_live_mode,
    p_paid_at
  )
  on conflict (provider, provider_payment_id)
    where provider_payment_id is not null
  do update set
    payment_method = coalesce(excluded.payment_method, current_payment.payment_method),
    status = case
      when excluded.status = 'refunded' then 'refunded'
      when current_payment.status = 'refunded' then current_payment.status
      when current_payment.status = 'approved'
        and excluded.status in ('pending', 'rejected') then current_payment.status
      else excluded.status
    end,
    provider_status = excluded.provider_status,
    status_detail = coalesce(excluded.status_detail, current_payment.status_detail),
    live_mode = excluded.live_mode,
    paid_at = coalesce(current_payment.paid_at, excluded.paid_at),
    updated_at = now()
  where current_payment.sale_id = excluded.sale_id
    and current_payment.amount = excluded.amount
    and upper(btrim(current_payment.currency)) = upper(btrim(excluded.currency))
  returning * into stored_payment;

  -- Covers the race where two different sales attempt to claim the same
  -- provider payment id after both observed it as absent above.
  if not found then
    raise exception using
      errcode = '23505',
      message = 'provider payment id conflicts with another sale or amount';
  end if;

  if normalized_status = 'approved' then
    update public.payment_preferences
    set status = case
      when status = 'refunded' then status
      else 'paid'
    end
    where id = locked_preference.id;

    -- Repeated or out-of-order pending/rejected webhooks can never downgrade a
    -- paid sale. Later fulfilment states are likewise preserved.
    update public.sales
    set sale_status = 'paid'
    where id = locked_sale.id
      and sale_status in ('negotiating', 'awaiting_payment');
  elsif normalized_status = 'refunded' then
    update public.payment_preferences
    set status = 'refunded'
    where id = locked_preference.id;

    -- A refund before fulfilment releases the artwork. Once fulfilment has
    -- started, preserve its state so the admin can resolve the return manually.
    update public.sales
    set sale_status = 'cancelled'
    where id = locked_sale.id
      and sale_status in ('negotiating', 'awaiting_payment', 'paid');
  end if;

  return stored_payment;
end
$function$;

revoke all privileges on function public.record_mercadopago_payment(
  uuid,
  text,
  numeric,
  text,
  text,
  text,
  text,
  text,
  boolean,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.record_mercadopago_payment(
  uuid,
  text,
  numeric,
  text,
  text,
  text,
  text,
  text,
  boolean,
  timestamptz
) to service_role;
