-- Keep payment reconciliation compatible with projects where payments.status
-- predates the Checkout Pro migration and is a payment_status enum. Fresh
-- projects use text with a check constraint. jsonb_populate_record converts the
-- validated normalized value to the actual column type in either schema.
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

    update public.sales
    set sale_status = 'paid'
    where id = locked_sale.id
      and sale_status in ('negotiating', 'awaiting_payment');
  elsif normalized_status = 'refunded' then
    update public.payment_preferences
    set status = 'refunded'
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
