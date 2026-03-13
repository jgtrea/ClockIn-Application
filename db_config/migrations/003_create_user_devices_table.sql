-- Create user_devices table
create table public.user_devices (
  "deviceId" text not null,
  "employeeId" uuid not null,
  "deviceInfo" text not null,
  "registeredAt" timestamp with time zone null default now(),
  "lastLogin" timestamp with time zone null default now(),
  constraint user_devices_pkey primary key ("deviceId"),
  constraint user_devices_employeeId_fkey foreign key ("employeeId") references user_employee_data ("employeeId")
) TABLESPACE pg_default;

-- Create index on employeeId for faster lookups
create index if not exists idx_user_devices_employee on public.user_devices using btree ("employeeId") TABLESPACE pg_default;
