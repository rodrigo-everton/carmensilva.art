-- Harden Checkout Pro preferences with a finite validity window and an
-- explicit account/environment snapshot. Existing rows are classified as
-- unclassified until the controlled cleanup assigns their real origin.

alter table public.payment_preferences
  add column if not exists expires_at timestamptz,
  add column if not exists provider_expiration_configured_at timestamptz,
  add column if not exists environment text not null default 'unclassified',
  add column if not exists seller_id text;

update public.payment_preferences
set expires_at = created_at + interval '24 hours'
where expires_at is null;

alter table public.payment_preferences
  alter column expires_at set default (now() + interval '24 hours'),
  alter column expires_at set not null;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payment_preferences'::regclass
      and conname = 'payment_preferences_expiry_after_creation_check'
  ) then
    alter table public.payment_preferences
      add constraint payment_preferences_expiry_after_creation_check
      check (expires_at > created_at) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payment_preferences'::regclass
      and conname = 'payment_preferences_environment_check'
  ) then
    alter table public.payment_preferences
      add constraint payment_preferences_environment_check
      check (environment in ('test', 'production', 'unclassified')) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payment_preferences'::regclass
      and conname = 'payment_preferences_seller_identity_check'
  ) then
    alter table public.payment_preferences
      add constraint payment_preferences_seller_identity_check
      check (
        (environment = 'unclassified' and seller_id is null)
        or (
          environment in ('test', 'production')
          and seller_id is not null
          and seller_id ~ '^[0-9]+$'
        )
      ) not valid;
  end if;
end
$migration$;

alter table public.payment_preferences
  validate constraint payment_preferences_expiry_after_creation_check;

alter table public.payment_preferences
  validate constraint payment_preferences_environment_check;

alter table public.payment_preferences
  validate constraint payment_preferences_seller_identity_check;

create index if not exists payment_preferences_open_expiry_idx
  on public.payment_preferences (expires_at)
  where status in ('creating', 'active');

-- Expire every due preference for a conversation and release its sale only
-- when no newer checkout and no pending/approved payment still protects it.
create or replace function public.expire_mercadopago_preferences(
  p_conversation_id uuid
)
returns table (
  preference_id uuid,
  sale_id uuid,
  artwork_id text,
  reservation_released boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  expired_preference record;
begin
  if p_conversation_id is null then
    raise exception using
      errcode = '22023',
      message = 'conversation id is required';
  end if;

  for expired_preference in
    update public.payment_preferences as preference
    set status = 'expired'
    where preference.conversation_id = p_conversation_id
      and preference.provider = 'mercadopago'
      and preference.status in ('creating', 'active')
      and preference.expires_at <= now()
    returning preference.id, preference.sale_id
  loop
    preference_id := expired_preference.id;
    sale_id := expired_preference.sale_id;
    reservation_released := false;

    select sale.artwork_id
    into artwork_id
    from public.sales as sale
    where sale.id = expired_preference.sale_id;

    update public.sales as sale
    set sale_status = 'negotiating'
    where sale.id = expired_preference.sale_id
      and sale.sale_status = 'awaiting_payment'
      and not exists (
        select 1
        from public.payment_preferences as open_preference
        where open_preference.sale_id = sale.id
          and open_preference.status in ('creating', 'active')
          and open_preference.expires_at > now()
      )
      and not exists (
        select 1
        from public.payments as payment
        where payment.sale_id = sale.id
          and payment.status::text in ('pending', 'approved')
      );

    reservation_released := found;
    return next;
  end loop;
end
$function$;

revoke all privileges on function public.expire_mercadopago_preferences(uuid)
  from public, anon, authenticated;
grant execute on function public.expire_mercadopago_preferences(uuid)
  to service_role;

-- Safe counterpart for creation failures and concurrency losers. A request
-- can never release a sale that another open preference or payment owns.
create or replace function public.release_mercadopago_sale_if_unreserved(
  p_sale_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  released boolean := false;
begin
  if p_sale_id is null then
    raise exception using
      errcode = '22023',
      message = 'sale id is required';
  end if;

  perform 1
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    return false;
  end if;

  update public.sales as sale
  set sale_status = 'negotiating'
  where sale.id = p_sale_id
    and sale.sale_status = 'awaiting_payment'
    and not exists (
      select 1
      from public.payment_preferences as preference
      where preference.sale_id = sale.id
        and preference.status in ('creating', 'active')
        and preference.expires_at > now()
    )
    and not exists (
      select 1
      from public.payments as payment
      where payment.sale_id = sale.id
        and payment.status::text in ('pending', 'approved')
    );

  released := found;
  return released;
end
$function$;

revoke all privileges on function public.release_mercadopago_sale_if_unreserved(uuid)
  from public, anon, authenticated;
grant execute on function public.release_mercadopago_sale_if_unreserved(uuid)
  to service_role;
