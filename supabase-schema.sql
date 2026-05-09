-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (handled by Supabase Auth, but we store profile data)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  created_at timestamptz default now()
);

-- Businesses
create table businesses (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  industry text default 'other',
  phone text,
  email text,
  address text,
  city text,
  country text,
  timezone text default 'UTC',
  currency text default 'USD',
  created_at timestamptz default now()
);

-- Services
create table services (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  price numeric(10,2) default 0,
  duration integer default 30,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Staff
create table staff (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  role text,
  email text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Customers
create table customers (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  phone text,
  email text,
  visits integer default 0,
  total_spent numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- Schedules
create table schedules (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references businesses(id) on delete cascade unique not null,
  monday jsonb default '{"open":"09:00","close":"17:00","enabled":true}',
  tuesday jsonb default '{"open":"09:00","close":"17:00","enabled":true}',
  wednesday jsonb default '{"open":"09:00","close":"17:00","enabled":true}',
  thursday jsonb default '{"open":"09:00","close":"17:00","enabled":true}',
  friday jsonb default '{"open":"09:00","close":"17:00","enabled":true}',
  saturday jsonb default '{"open":"09:00","close":"17:00","enabled":false}',
  sunday jsonb default '{"open":"09:00","close":"17:00","enabled":false}'
);

-- Bookings
create table bookings (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  service_id uuid references services(id) on delete set null,
  service_name text not null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  date date not null,
  time text not null,
  duration integer default 30,
  status text default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table businesses enable row level security;
alter table services enable row level security;
alter table staff enable row level security;
alter table customers enable row level security;
alter table schedules enable row level security;
alter table bookings enable row level security;

-- RLS Policies

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Businesses: owners can CRUD their own business
create policy "Owners can manage their business" on businesses for all using (auth.uid() = owner_id);
-- Anyone can read a business by ID (for public booking page)
create policy "Public can view businesses" on businesses for select using (true);

-- Services: business owner can CRUD, public can read
create policy "Owners can manage services" on services for all using (
  business_id in (select id from businesses where owner_id = auth.uid())
);
create policy "Public can view services" on services for select using (true);

-- Staff: owner only
create policy "Owners can manage staff" on staff for all using (
  business_id in (select id from businesses where owner_id = auth.uid())
);

-- Customers: owner only
create policy "Owners can manage customers" on customers for all using (
  business_id in (select id from businesses where owner_id = auth.uid())
);

-- Schedules: owner CRUD, public read
create policy "Owners can manage schedule" on schedules for all using (
  business_id in (select id from businesses where owner_id = auth.uid())
);
create policy "Public can view schedules" on schedules for select using (true);

-- Bookings: owner can manage, public can insert (create bookings) and read
create policy "Owners can manage bookings" on bookings for all using (
  business_id in (select id from businesses where owner_id = auth.uid())
);
create policy "Public can create bookings" on bookings for insert with check (true);
create policy "Public can view bookings" on bookings for select using (true);

-- Create profile on signup (trigger)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
