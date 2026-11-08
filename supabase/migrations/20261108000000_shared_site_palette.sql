alter table public.studio_site_settings enable row level security;

grant select on public.studio_site_settings to anon, authenticated;
grant insert, update on public.studio_site_settings to authenticated;

drop policy if exists studio_settings_staff_insert on public.studio_site_settings;
drop policy if exists studio_settings_staff_update on public.studio_site_settings;
drop policy if exists studio_settings_admin_insert on public.studio_site_settings;
create policy studio_settings_admin_insert
  on public.studio_site_settings
  for insert
  to authenticated
  with check (
    updated_by = auth.uid()
    and exists (
      select 1
      from public.studio_staff
      where studio_staff.id = auth.uid()
        and studio_staff.is_active is true
        and studio_staff.role = 'admin'
    )
  );

drop policy if exists studio_settings_admin_update on public.studio_site_settings;
create policy studio_settings_admin_update
  on public.studio_site_settings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.studio_staff
      where studio_staff.id = auth.uid()
        and studio_staff.is_active is true
        and studio_staff.role = 'admin'
    )
  )
  with check (
    updated_by = auth.uid()
    and exists (
      select 1
      from public.studio_staff
      where studio_staff.id = auth.uid()
        and studio_staff.is_active is true
        and studio_staff.role = 'admin'
    )
  );

insert into public.studio_site_settings (setting_key, setting_value)
values (
  'colors',
  '{
    "background": "#111310",
    "secondaryBackground": "#171914",
    "card": "#191B17",
    "accent": "#C64B35",
    "headingText": "#F5F2EB",
    "boxText": "#B0ADA5",
    "text": "#F5F2EB",
    "secondaryText": "#B0ADA5",
    "border": "#34352F"
  }'::jsonb
)
on conflict (setting_key) do nothing;
