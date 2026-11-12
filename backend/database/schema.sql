CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  company VARCHAR(100),
  material VARCHAR(100),
  category VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  old_price NUMERIC(10,2),
  badge VARCHAR(80),
  rating NUMERIC(3,1) DEFAULT 4.8,
  stock_quantity INTEGER NOT NULL DEFAULT 20 CHECK (stock_quantity >= 0),
  image VARCHAR(255) DEFAULT '/product-sample.png',
  images TEXT[] DEFAULT ARRAY['/product-sample.png'],
  models TEXT[] NOT NULL DEFAULT '{}',
  desc TEXT
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS models TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254),
  password_hash TEXT,
  phone VARCHAR(16),
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  cart JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customers_email UNIQUE (email)
);

ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(16);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cart JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_phone ON customers(phone);

CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  message TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_messages_customer_id ON contact_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);
