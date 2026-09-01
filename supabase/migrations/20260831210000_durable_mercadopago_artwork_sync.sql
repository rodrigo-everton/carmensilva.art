-- Keep the Supabase financial state and the Sanity artwork state eventually
-- consistent. The timestamps are durable acknowledgements: an operation is
-- retried until Sanity succeeds and only then is its acknowledgement stored.

alter table public.payment_preferences
  add column if not exists sanity_sync_required boolean not null default false,
  add column if not exists sanity_reserved_at timestamptz,
  add column if not exists sanity_sold_at timestamptz,
  add column if not exists sanity_released_at timestamptz,
  add column if not exists creation_lease_token uuid,
  add column if not exists creation_lease_expires_at timestamptz;

create index if not exists payment_preferences_sanity_sync_idx
  on public.payment_preferences (status, expires_at)
  where sanity_sync_required;

-- Expire due checkouts, release sales that no longer have financial protection,
-- and return every still-unacknowledged Sanity operation. Calling this function
-- repeatedly is safe; the application acknowledges each job only after Sanity
-- commits it.
create or replace function public.get_mercadopago_artwork_sync_jobs(
  p_conversation_id uuid default null,
  p_limit integer default 100
)
returns table (
  action text,
  preference_id uuid,
  sale_id uuid,
  conversation_id uuid,
  artwork_id text,
  expires_at timestamptz,
  provider_payment_id text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception using
      errcode = '22023',
      message = 'limit must be between 1 and 500';
  end if;

  update public.payment_preferences as preference
  set
    status = 'expired',
    creation_lease_token = null,
    creation_lease_expires_at = null
  where preference.provider = 'mercadopago'
    and preference.status in ('creating', 'active')
    and preference.expires_at <= now()
    and (
      p_conversation_id is null
      or preference.conversation_id = p_conversation_id
    );

  update public.sales as sale
  set sale_status = 'negotiating'
  where sale.sale_status = 'awaiting_payment'
    and (
      p_conversation_id is null
      or sale.conversation_id = p_conversation_id
    )
    and exists (
      select 1
      from public.payment_preferences as terminal_preference
      where terminal_preference.sale_id = sale.id
        and terminal_preference.provider = 'mercadopago'
        and terminal_preference.status in ('expired', 'failed', 'superseded')
    )
    and not exists (
      select 1
      from public.payment_preferences as open_preference
      where open_preference.sale_id = sale.id
        and open_preference.provider = 'mercadopago'
        and open_preference.status in ('creating', 'active')
        and open_preference.expires_at > now()
    )
    and not exists (
      select 1
      from public.payments as protected_payment
      where protected_payment.sale_id = sale.id
        and protected_payment.status::text in ('pending', 'approved')
    );

  return query
  with candidates as (
    select
      case
        when preference.status = 'paid'
          and sale.sale_status in (
            'paid',
            'preparing_delivery',
            'shipped',
            'delivered',
            'completed'
          )
          and preference.sanity_sold_at is null
          and approved_payment.provider_payment_id is not null
          then 'sell'
        when preference.status = 'refunded'
          and sale.sale_status = 'cancelled'
          and preference.sanity_released_at is null
          and approved_payment.provider_payment_id is null
          then 'refund'
        when preference.status in ('expired', 'failed', 'superseded')
          and sale.sale_status in ('negotiating', 'cancelled')
          and preference.sanity_released_at is null
          and approved_payment.provider_payment_id is null
          and not exists (
            select 1
            from public.payments as pending_payment
            where pending_payment.sale_id = sale.id
              and pending_payment.status::text = 'pending'
          )
          and not exists (
            select 1
            from public.payment_preferences as open_preference
            where open_preference.sale_id = sale.id
              and open_preference.id <> preference.id
              and open_preference.provider = 'mercadopago'
              and open_preference.status in ('creating', 'active')
              and open_preference.expires_at > now()
          )
          then 'release'
        when preference.status in ('creating', 'active')
          and preference.expires_at > now()
          and sale.sale_status = 'awaiting_payment'
          and preference.sanity_reserved_at is null
          then 'reserve'
        else null
      end as job_action,
      preference.id as job_preference_id,
      preference.sale_id as job_sale_id,
      preference.conversation_id as job_conversation_id,
      sale.artwork_id as job_artwork_id,
      preference.expires_at as job_expires_at,
      approved_payment.provider_payment_id as job_provider_payment_id
    from public.payment_preferences as preference
    join public.sales as sale
      on sale.id = preference.sale_id
    left join lateral (
      select payment.provider_payment_id
      from public.payments as payment
      where payment.sale_id = sale.id
        and payment.status::text = 'approved'
        and payment.provider_payment_id is not null
      order by payment.paid_at asc nulls last, payment.created_at asc
      limit 1
    ) as approved_payment on true
    where preference.provider = 'mercadopago'
      and preference.sanity_sync_required
      and (
        p_conversation_id is null
        or preference.conversation_id = p_conversation_id
      )
  )
  select
    candidate.job_action,
    candidate.job_preference_id,
    candidate.job_sale_id,
    candidate.job_conversation_id,
    candidate.job_artwork_id,
    candidate.job_expires_at,
    candidate.job_provider_payment_id
  from candidates as candidate
  where candidate.job_action is not null
  order by
    case candidate.job_action
      when 'sell' then 1
      when 'refund' then 2
      when 'release' then 3
      when 'reserve' then 4
      else 5
    end,
    candidate.job_expires_at asc
  limit p_limit;
end
$function$;

revoke all privileges on function public.get_mercadopago_artwork_sync_jobs(
  uuid,
  integer
) from public, anon, authenticated;
grant execute on function public.get_mercadopago_artwork_sync_jobs(uuid, integer)
  to service_role;

-- Preserve a paid sale while any payment for it remains approved. A refund
-- only makes the artwork available after the last approved payment disappears.
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
  normalized_payment_status public.payments.status%type;
  existing_sale_id uuid;
  existing_amount numeric;
  existing_currency text;
  has_approved_payment boolean;
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

  normalized_payment_status := (
    jsonb_populate_record(
      null::public.payments,
      jsonb_build_object('status', normalized_status)
    )
  ).status;

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
    normalized_payment_status,
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
      when excluded.status::text = 'refunded' then excluded.status
      when current_payment.status::text = 'refunded' then current_payment.status
      when current_payment.status::text = 'approved'
        and excluded.status::text in ('pending', 'rejected') then current_payment.status
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

  if not found then
    raise exception using
      errcode = '23505',
      message = 'provider payment id conflicts with another sale or amount';
  end if;

  select exists (
    select 1
    from public.payments as approved_payment
    where approved_payment.sale_id = locked_sale.id
      and approved_payment.status::text = 'approved'
  )
  into has_approved_payment;

  -- Any canonical webhook opts the preference into durable Sanity syncing,
  -- including preferences created before these acknowledgement columns existed.
  update public.payment_preferences
  set sanity_sync_required = true
  where id = locked_preference.id;

  if has_approved_payment then
    update public.payment_preferences
    set
      status = 'paid',
      creation_lease_token = null,
      creation_lease_expires_at = null
    where id = locked_preference.id;

    update public.sales
    set sale_status = 'paid'
    where id = locked_sale.id
      and sale_status in ('negotiating', 'awaiting_payment', 'cancelled');
  elsif stored_payment.status::text = 'refunded' then
    update public.payment_preferences
    set
      status = 'refunded',
      creation_lease_token = null,
      creation_lease_expires_at = null
    where id = locked_preference.id;

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
