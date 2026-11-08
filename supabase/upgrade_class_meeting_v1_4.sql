-- EDUCANVAS v1.4 - Sinh hoat lop so (MIGRATION CHO DATABASE DANG SU DUNG)
-- Chay 1 lan / co the chay lai; khong xoa du lieu hien co.
-- Can public.rooms, public.room_members, public.profiles va cac helper is_room_teacher/is_room_member.

create table if not exists public.class_meetings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  theme text not null default '' check (char_length(theme) <= 180),
  status text not null default 'open' check (status in ('open','closed')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists class_meetings_room_date on public.class_meetings(room_id,created_at desc);

create table if not exists public.class_meeting_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.class_meetings(id) on delete cascade,
  role_key text not null check (role_key in ('class_leader','vice_leader','secretary','team_1','team_2','team_3')),
  assigned_to uuid references public.profiles(id) on delete set null,
  general text not null default '' check (char_length(general) <= 4000),
  strengths text not null default '' check (char_length(strengths) <= 4000),
  limitations text not null default '' check (char_length(limitations) <= 4000),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (meeting_id, role_key)
);
create index if not exists class_meeting_reports_meeting on public.class_meeting_reports(meeting_id);

-- Tu dong tao DU 6 mau bao cao khi giao vien tao buoi sinh hoat.
create or replace function public.class_meeting_create_reports() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.class_meeting_reports(meeting_id,role_key)
  select new.id, x.role_key
  from (values ('class_leader'),('vice_leader'),('secretary'),('team_1'),('team_2'),('team_3')) as x(role_key)
  on conflict (meeting_id,role_key) do nothing;
  return new;
end;
$$;
drop trigger if exists class_meeting_seed_reports on public.class_meetings;
create trigger class_meeting_seed_reports after insert on public.class_meetings
for each row execute function public.class_meeting_create_reports();

-- Bao ve id/so huu va viec phan cong nguoi viet. Hoc sinh khong the tu chi dinh lai minh.
create or replace function public.class_meeting_guard_meeting() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.room_id is distinct from old.room_id
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
      raise exception 'Khong duoc doi thong tin so huu buoi sinh hoat';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists class_meeting_guard on public.class_meetings;
create trigger class_meeting_guard before update on public.class_meetings
for each row execute function public.class_meeting_guard_meeting();

create or replace function public.class_meeting_guard_report() returns trigger
language plpgsql set search_path = '' as $$
declare v_room uuid;
begin
  select room_id into v_room from public.class_meetings where id=old.meeting_id;
  if new.id is distinct from old.id or new.meeting_id is distinct from old.meeting_id
      or new.role_key is distinct from old.role_key then
    raise exception 'Khong duoc thay doi danh tinh phieu bao cao';
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    if not public.is_room_teacher(v_room) then
      raise exception 'Chi giao vien duoc phan cong nguoi bao cao';
    end if;
    if new.assigned_to is not null and not exists (
      select 1 from public.room_members
      where room_id=v_room and user_id=new.assigned_to
    ) then
      raise exception 'Nguoi duoc phan cong phai la hoc sinh trong lop';
    end if;
    new.submitted_at = null;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists class_meeting_guard_report on public.class_meeting_reports;
create trigger class_meeting_guard_report before update on public.class_meeting_reports
for each row execute function public.class_meeting_guard_report();

alter table public.class_meetings enable row level security;
alter table public.class_meeting_reports enable row level security;

-- Chinh sach duoc tao lai de co the chay migration nhieu lan ma khong mat du lieu.
drop policy if exists class_meetings_read on public.class_meetings;
create policy class_meetings_read on public.class_meetings for select to authenticated
using (public.is_room_member(room_id));
drop policy if exists class_meetings_create on public.class_meetings;
create policy class_meetings_create on public.class_meetings for insert to authenticated
with check (created_by=auth.uid() and public.is_room_teacher(room_id));
drop policy if exists class_meetings_update on public.class_meetings;
create policy class_meetings_update on public.class_meetings for update to authenticated
using (public.is_room_teacher(room_id)) with check (public.is_room_teacher(room_id));

drop policy if exists class_meeting_reports_read on public.class_meeting_reports;
create policy class_meeting_reports_read on public.class_meeting_reports for select to authenticated
using (exists (
  select 1 from public.class_meetings m
  where m.id=meeting_id and public.is_room_member(m.room_id)
));
drop policy if exists class_meeting_reports_edit on public.class_meeting_reports;
create policy class_meeting_reports_edit on public.class_meeting_reports for update to authenticated
using (exists (
  select 1 from public.class_meetings m
  where m.id=meeting_id and (
    public.is_room_teacher(m.room_id) or
    (m.status='open' and assigned_to=auth.uid() and submitted_at is null)
  )
))
with check (exists (
  select 1 from public.class_meetings m
  where m.id=meeting_id and (
    public.is_room_teacher(m.room_id) or
    (m.status='open' and assigned_to=auth.uid())
  )
));

revoke all on public.class_meetings, public.class_meeting_reports from public, anon, authenticated;
grant select, insert, update on public.class_meetings to authenticated;
grant select, update on public.class_meeting_reports to authenticated;
-- Khong co INSERT/DELETE truc tiep cho bao cao: 6 phieu duoc tao boi trigger.

-- Chi them vao publication neu chua duoc bat.
do $$ begin
 if exists (select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='class_meetings') then
   alter publication supabase_realtime add table public.class_meetings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='class_meeting_reports') then
   alter publication supabase_realtime add table public.class_meeting_reports;
  end if;
 end if;
end $$;
