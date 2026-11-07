-- NÉTCHUNG: chạy một lần trên SQL Editor của Supabase (dự án MỚI).
-- Chú ý: giáo viên KHÔNG được tự nhận vai trò teacher từ giao diện.
-- Quản trị viên cấp quyền giáo viên bằng câu lệnh riêng trong README.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Học sinh' check (char_length(full_name) between 1 and 100),
  role text not null default 'student' check (role in ('teacher','student')),
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  join_code text not null unique default upper(substr(encode(gen_random_bytes(8),'hex'),1,8)),
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  kind text not null check (kind in ('shared','private')),
  owner_id uuid references public.profiles(id) on delete cascade,
  title text not null default 'Bảng trắng',
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint board_owner_by_kind check ((kind='shared' and owner_id is null) or (kind='private' and owner_id is not null))
);
create unique index one_shared_board_per_room on public.boards(room_id) where kind='shared';
create unique index one_private_board_per_user on public.boards(room_id,owner_id) where kind='private';

create table public.board_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('pen','highlighter','line','rect','ellipse','text')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index board_items_board_active on public.board_items(board_id,created_at) where deleted_at is null;
create index room_members_user on public.room_members(user_id);
create index rooms_teacher on public.rooms(teacher_id);
create index boards_room on public.boards(room_id);

-- SECURITY DEFINER chỉ dùng để kiểm tra quan hệ. search_path rỗng để tránh shadowing.
create function public.is_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role='teacher')
$$;
create function public.is_room_teacher(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.rooms where id=p_room and teacher_id=auth.uid())
$$;
create function public.is_room_member(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_room_teacher(p_room)
    or exists(select 1 from public.room_members where room_id=p_room and user_id=auth.uid())
$$;
create function public.is_teacher_for_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.room_members m join public.rooms r on r.id=m.room_id
    where m.user_id=p_student and r.teacher_id=auth.uid()
  )
$$;
create function public.can_view_board(p_board uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.boards b where b.id=p_board and
      (public.is_room_teacher(b.room_id) or
       (public.is_room_member(b.room_id) and (b.kind='shared' or b.owner_id=auth.uid())))
  )
$$;
create function public.can_edit_board(p_board uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.boards b where b.id=p_board and
      (public.is_room_teacher(b.room_id) or
       (public.is_room_member(b.room_id) and not b.is_locked and
        (b.kind='shared' or b.owner_id=auth.uid())))
  )
$$;

create function public.create_profile_on_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,full_name,role)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''), 'Học sinh'),100), 'student');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.create_profile_on_signup();

create function public.create_shared_board() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.boards(room_id,kind,title)
  values (new.id,'shared','Bảng chung của lớp');
  return new;
end;
$$;
create trigger room_auto_board after insert on public.rooms
for each row execute function public.create_shared_board();

-- Chỉ thành viên đăng nhập mới tham gia phòng bằng mã. Tạo bảng cá nhân đồng thời.
create function public.join_room_by_code(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_room uuid;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and role='student') then
    raise exception 'Chỉ tài khoản học sinh được tham gia bằng mã lớp.';
  end if;
  select id into v_room from public.rooms where join_code=upper(btrim(p_code)) limit 1;
  if v_room is null then raise exception 'Mã lớp không tồn tại.'; end if;
  insert into public.room_members(room_id,user_id) values(v_room,auth.uid()) on conflict do nothing;
  insert into public.boards(room_id,kind,owner_id,title)
  values(v_room,'private',auth.uid(), 'Bảng của ' ||
    (select full_name from public.profiles where id=auth.uid()))
  on conflict do nothing;
  return v_room;
end;
$$;

create function public.protect_room_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.teacher_id is distinct from old.teacher_id or new.id is distinct from old.id then
    raise exception 'Không thể đổi chủ sở hữu lớp.';
  end if;
  return new;
end;
$$;
create trigger prevent_room_owner_change before update on public.rooms
for each row execute function public.protect_room_identity();

create function public.protect_board_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.room_id is distinct from old.room_id or new.owner_id is distinct from old.owner_id
     or new.kind is distinct from old.kind or new.id is distinct from old.id then
     raise exception 'Không thể chuyển bảng sang lớp hoặc chủ sở hữu khác.';
  end if;
  return new;
end;
$$;
create trigger prevent_board_identity_change before update on public.boards
for each row execute function public.protect_board_identity();

create function public.protect_item_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.board_id is distinct from old.board_id or new.created_by is distinct from old.created_by
     or new.kind is distinct from old.kind or new.id is distinct from old.id then
    raise exception 'Không thể thay đổi thông tin sở hữu nét vẽ.';
  end if;
  new.created_at = old.created_at;
  new.updated_at = now();
  return new;
end;
$$;
create trigger prevent_item_identity_change before update on public.board_items
for each row execute function public.protect_item_identity();

create function public.limit_item_payload() returns trigger
language plpgsql set search_path = '' as $$
begin
  if pg_column_size(new.payload) > 65536 then
    raise exception 'Nét vẽ quá lớn (giới hạn 64 KB mỗi nét).';
  end if;
  return new;
end;
$$;
create trigger limit_board_item_size before insert or update on public.board_items
for each row execute function public.limit_item_payload();

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.boards enable row level security;
alter table public.board_items enable row level security;

create policy profile_read on public.profiles for select to authenticated
  using (id=auth.uid() or public.is_teacher_for_student(id));
-- Không tạo policy UPDATE profile: học sinh không thể tự nâng quyền.

create policy room_read on public.rooms for select to authenticated
  using (public.is_room_member(id));
create policy room_create on public.rooms for insert to authenticated
  with check (teacher_id=auth.uid() and public.is_teacher());
create policy room_update on public.rooms for update to authenticated
  using (public.is_room_teacher(id)) with check (public.is_room_teacher(id));
create policy room_delete on public.rooms for delete to authenticated
  using (public.is_room_teacher(id));

create policy members_read on public.room_members for select to authenticated
  using (user_id=auth.uid() or public.is_room_teacher(room_id));
-- INSERT vào memberships được kiểm soát qua RPC join_room_by_code; không cấp policy tự insert.

create policy boards_read on public.boards for select to authenticated
  using (public.can_view_board(id));
create policy boards_update on public.boards for update to authenticated
  using (public.is_room_teacher(room_id)) with check (public.is_room_teacher(room_id));
-- Chỉ trigger/RPC tạo bảng. Không có policy INSERT hoặc DELETE trực tiếp.

create policy items_read on public.board_items for select to authenticated
  using (public.can_view_board(board_id));
create policy items_create on public.board_items for insert to authenticated
  with check (created_by=auth.uid() and public.can_edit_board(board_id));
create policy items_update on public.board_items for update to authenticated
  using (public.can_edit_board(board_id) and (created_by=auth.uid() or
    (select public.is_room_teacher(b.room_id) from public.boards b where b.id=board_id)))
  with check (public.can_edit_board(board_id) and (created_by=auth.uid() or
    (select public.is_room_teacher(b.room_id) from public.boards b where b.id=board_id)));
-- Dùng deleted_at thay vì DELETE để đồng bộ dễ dàng hơn.

-- QUYỀN BẢNG: dùng grant tối thiểu, RLS kiểm soát từng bản ghi.
grant usage on schema public to authenticated;
revoke all on public.profiles, public.rooms, public.room_members, public.boards, public.board_items from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.rooms to authenticated;
grant select on public.room_members to authenticated;
grant select, update on public.boards to authenticated;
grant select, insert, update on public.board_items to authenticated;

-- Giới hạn EXECUTE cho RPC và helper. Mặc định Postgres có thể GRANT cho PUBLIC.
revoke all on function public.join_room_by_code(text) from public, anon;
grant execute on function public.join_room_by_code(text) to authenticated;

-- Kích hoạt Postgres Changes cho bảng cần theo dõi (không nhân bản mục nếu chạy lại đoạn này).
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='board_items') then
    alter publication supabase_realtime add table public.board_items;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='boards') then
    alter publication supabase_realtime add table public.boards;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='room_members') then
    alter publication supabase_realtime add table public.room_members;
  end if;
end $$;

-- Nếu có user tạo trước khi chạy schema: backfill profile của user hiện có.
insert into public.profiles(id, full_name)
select id, left(coalesce(nullif(btrim(raw_user_meta_data->>'full_name'),''), 'Học sinh'),100)
from auth.users
on conflict(id) do nothing;
