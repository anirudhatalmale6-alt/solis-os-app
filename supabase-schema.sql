-- Solis OS Database Schema for Supabase

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT DEFAULT 'salon',
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  duration INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  monday JSONB DEFAULT '{"open":"09:00","close":"17:00","enabled":true}',
  tuesday JSONB DEFAULT '{"open":"09:00","close":"17:00","enabled":true}',
  wednesday JSONB DEFAULT '{"open":"09:00","close":"17:00","enabled":true}',
  thursday JSONB DEFAULT '{"open":"09:00","close":"17:00","enabled":true}',
  friday JSONB DEFAULT '{"open":"09:00","close":"17:00","enabled":true}',
  saturday JSONB DEFAULT '{"open":"09:00","close":"17:00","enabled":false}',
  sunday JSONB DEFAULT '{"open":"09:00","close":"17:00","enabled":false}',
  UNIQUE(business_id)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  service_id UUID REFERENCES services(id),
  staff_id UUID REFERENCES staff(id),
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER DEFAULT 30,
  status TEXT DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own business data
CREATE POLICY "Users can manage own businesses" ON businesses FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Users can manage own services" ON services FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own staff" ON staff FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own customers" ON customers FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own schedules" ON schedules FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own bookings" ON bookings FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Public booking access (for the public booking page)
CREATE POLICY "Public can view businesses for booking" ON businesses FOR SELECT USING (true);
CREATE POLICY "Public can view services for booking" ON services FOR SELECT USING (true);
CREATE POLICY "Public can view staff for booking" ON staff FOR SELECT USING (true);
CREATE POLICY "Public can view schedules for booking" ON schedules FOR SELECT USING (true);
CREATE POLICY "Public can create bookings" ON bookings FOR INSERT WITH CHECK (true);
