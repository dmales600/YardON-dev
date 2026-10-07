-- Allow the server-side Supplier delivery Edge Function to persist the canonical
-- live notification created when a Supplier sends a new announcement.
-- The RPC remains executable only by service_role/postgres; browser users do not
-- receive direct permission to write notification state.

create or replace function public.yardivo_edge_put_state(
  p_auth_user_id uuid,
  p_key text,
  p_value text,
  p_client_id text default ''::text
)
returns bigint
language plpgsql
security definer
set search_path to 'public', 'yardivo_private'
as $function$
declare
  v_rev bigint:=nextval('public.yardivo_revision_seq');
  v_user text;
  v_role text;
  v_audit_value text;
begin
  select username,app_role into v_user,v_role
  from public.yardivo_user_access
  where auth_user_id=p_auth_user_id and active=true;

  if v_user is null then
    raise exception 'YARDIVO inactive or unknown user';
  end if;

  if v_role='admin' then null;

  elsif v_role in ('manager','inventory') then
    if not (
      p_key like 'yardivo_yms_announcements%' or
      p_key like 'yardivo_yms_incidents%' or
      p_key like 'yardivo_live_notifications%' or
      p_key like 'yardivo_master_notifications%' or
      p_key like 'yardivo_notification%' or
      p_key like 'yardivo_supplier_%' or
      p_key like 'yardivo_unannounced_%' or
      p_key like 'yardivo_replanning_%' or
      p_key like 'yardivo_auto_replan_log%' or
      p_key like 'yms_trucks_%'
    ) then
      raise exception 'YARDIVO authorization denied';
    end if;

  elsif v_role='reception' then
    if not (
      p_key like 'yardivo_yms_announcements%' or
      p_key like 'yardivo_yms_incidents%' or
      p_key like 'yardivo_live_notifications%' or
      p_key like 'yardivo_master_notifications%' or
      p_key like 'yardivo_notification%' or
      p_key like 'yardivo_incident_%' or
      p_key like 'yardivo_pallet_%' or
      p_key like 'yardivo_unannounced_%' or
      p_key like 'yms_trucks_%'
    ) then
      raise exception 'YARDIVO authorization denied';
    end if;

  elsif v_role='gate' then
    if not (
      p_key like 'yardivo_yms_announcements%' or
      p_key like 'yardivo_live_notifications%' or
      p_key like 'yardivo_master_notifications%' or
      p_key like 'yardivo_notification%' or
      p_key like 'yardivo_unannounced_%' or
      p_key like 'yms_trucks_%'
    ) then
      raise exception 'YARDIVO authorization denied';
    end if;

  elsif v_role='supplier' then
    if p_key <> 'yardivo_live_notifications_v1' then
      raise exception 'YARDIVO authorization denied';
    end if;

  else
    raise exception 'YARDIVO authorization denied';
  end if;

  insert into public.yardivo_app_state(
    key,value_json,revision,updated_at,updated_by,client_id,deleted
  )
  values(
    p_key,p_value,v_rev,now(),v_user,p_client_id,false
  )
  on conflict(key) do update set
    value_json=excluded.value_json,
    previous_revision=public.yardivo_app_state.revision,
    revision=excluded.revision,
    updated_at=excluded.updated_at,
    updated_by=excluded.updated_by,
    client_id=excluded.client_id,
    deleted=false;

  v_audit_value :=
    case
      when p_key like 'yardivo_supplier_attachment_%'
        then json_build_object(
          'redacted', true,
          'kind', 'supplier_attachment',
          'bytes', octet_length(coalesce(p_value,''))
        )::text
      else p_value
    end;

  insert into public.yardivo_audit_log(
    auth_user_id,username,client_id,action,state_key,revision,value_json
  )
  values(
    p_auth_user_id,v_user,p_client_id,'EDGE_SET',p_key,v_rev,v_audit_value
  );

  return v_rev;
end
$function$;

revoke all on function public.yardivo_edge_put_state(uuid,text,text,text)
from public, anon, authenticated;
grant execute on function public.yardivo_edge_put_state(uuid,text,text,text)
to service_role;
