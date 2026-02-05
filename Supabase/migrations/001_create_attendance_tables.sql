create table if not exists public.attendance (  "attendId" uuid not null default gen_random_uuid (),
  "timeIn" timestamp with time zone null,
  "timeOut" timestamp with time zone null,
  status text null,
  "schedId" uuid null,
  "employeeId" uuid null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) null,
  constraint attendance_pkey primary key ("attendId"),
  constraint attendance_employeeId_fkey foreign KEY ("employeeId") references public.user_employee_data ("employeeId") on delete CASCADE,
  constraint attendance_schedId_fkey foreign KEY ("schedId") references public.schedule ("schedId") on delete CASCADE
) TABLESPACE pg_default;

alter table public.attendance enable row level security;

create policy "Authenticated users can view all attendance records"
  on public.attendance for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert attendance records"
  on public.attendance for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update attendance records"
  on public.attendance for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete attendance records"
  on public.attendance for delete
  using (auth.role() = 'authenticated');

alter table public.user_employee_data enable row level security;

create policy "Authenticated users can view user employee data"
  on public.user_employee_data for select
  using (auth.role() = 'authenticated');

create table if not exists public.schedule (
  "schedId" uuid not null default gen_random_uuid (),
  "schedName" text null,
  "timeStart" time with time zone null,
  "timeEnd" time with time zone null,
  "schedDate" date null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) null,
  constraint schedule_pkey primary key ("schedId")
) TABLESPACE pg_default;

alter table public.schedule enable row level security;

create policy "Authenticated users can view schedule"
  on public.schedule for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert schedule"
  on public.schedule for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update schedule"
  on public.schedule for update
  using (auth.role() = 'authenticated');
