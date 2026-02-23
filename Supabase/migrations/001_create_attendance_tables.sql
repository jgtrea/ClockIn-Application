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

create policy "Authenticated users can insert user employee data"
  on public.user_employee_data for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update user employee data"
  on public.user_employee_data for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete user employee data"
  on public.user_employee_data for delete
  using (auth.role() = 'authenticated');

create table if not exists public.schedule (
  "schedId" uuid not null default gen_random_uuid (),
  "schedName" text null,
  "timeStart" time with time zone null,
  "timeEnd" time with time zone null,
  "schedDate" date null,
  "weekday" text null,
  "startTime" text null,
  "endTime" text null,
  "subject" text null,
  "room" text null,
  "sectId" uuid null,
  "employeeId" uuid null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) null,
  constraint schedule_pkey primary key ("schedId"),
  constraint schedule_employeeId_fkey foreign KEY ("employeeId") references public.user_employee_data ("employeeId") on delete set null
) TABLESPACE pg_default;

create table if not exists public.sections (
  "sectId" uuid not null default gen_random_uuid (),
  "sectionName" text null,
  "advisor" text null,
  "yearLevel" text null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) null,
  constraint sections_pkey primary key ("sectId")
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

create policy "Authenticated users can delete schedule"
  on public.schedule for delete
  using (auth.role() = 'authenticated');

-- Sections table
alter table public.sections enable row level security;

create policy "Authenticated users can view sections"
  on public.sections for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert sections"
  on public.sections for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update sections"
  on public.sections for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete sections"
  on public.sections for delete
  using (auth.role() = 'authenticated');
