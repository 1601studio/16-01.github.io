create table if not exists public.studio_site_settings (
  id text primary key check (id = 'palette'),
  palette jsonb not null check (jsonb_typeof(palette) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.studio_site_settings enable row level security;

grant select on public.studio_site_settings to anon, authenticated;
grant insert, update on public.studio_site_settings to authenticated;

drop policy if exists "Public can read the website palette" on public.studio_site_settings;
create policy "Public can read the website palette"
  on public.studio_site_settings
  for select
  to anon, authenticated
  using (id = 'palette');

drop policy if exists "Active studio admins can insert the website palette" on public.studio_site_settings;
create policy "Active studio admins can insert the website palette"
  on public.studio_site_settings
  for insert
  to authenticated
  with check (
    id = 'palette'
    and exists (
      select 1
      from public.studio_staff
      where studio_staff.id = auth.uid()
        and studio_staff.is_active is true
        and studio_staff.role = 'admin'
    )
  );

drop policy if exists "Active studio admins can update the website palette" on public.studio_site_settings;
create policy "Active studio admins can update the website palette"
  on public.studio_site_settings
  for update
  to authenticated
  using (
    id = 'palette'
    and exists (
      select 1
      from public.studio_staff
      where studio_staff.id = auth.uid()
        and studio_staff.is_active is true
        and studio_staff.role = 'admin'
    )
  )
  with check (
    id = 'palette'
    and exists (
      select 1
      from public.studio_staff
      where studio_staff.id = auth.uid()
        and studio_staff.is_active is true
        and studio_staff.role = 'admin'
    )
  );

insert into public.studio_site_settings (id, palette)
values (
  'palette',
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
on conflict (id) do nothing;
