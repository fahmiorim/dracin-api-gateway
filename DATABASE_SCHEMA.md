# 🗄️ Database Schema for Production

## 📋 **Overview**

Untuk production deployment, disarankan menggunakan database yang proper daripada in-memory Map. Berikut schema yang direkomendasikan.

## 🏗️ **PostgreSQL Schema**

### **1. api_clients Table**

```sql
CREATE TABLE api_clients (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    rate_limit INTEGER DEFAULT 100,
    allowed_endpoints JSONB DEFAULT '["*"]',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    role VARCHAR(50) DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP,
    total_requests INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_api_clients_api_key ON api_clients(api_key);
CREATE INDEX idx_api_clients_client_id ON api_clients(client_id);
CREATE INDEX idx_api_clients_email ON api_clients(email);
CREATE INDEX idx_api_clients_is_active ON api_clients(is_active);
CREATE INDEX idx_api_clients_expires_at ON api_clients(expires_at);
```

### **2. api_usage_logs Table**

```sql
CREATE TABLE api_usage_logs (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER, -- in milliseconds
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES api_clients(client_id)
);

-- Indexes
CREATE INDEX idx_api_usage_logs_client_id ON api_usage_logs(client_id);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX idx_api_usage_logs_status_code ON api_usage_logs(status_code);
```

### **3. rate_limits Table**

```sql
CREATE TABLE rate_limits (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    window_start TIMESTAMP NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_duration INTEGER DEFAULT 900, -- 15 minutes in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES api_clients(client_id),
    UNIQUE(client_id, window_start)
);

-- Indexes
CREATE INDEX idx_rate_limits_client_window ON rate_limits(client_id, window_start);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);
```

### **4. billing_plans Table**

```sql
CREATE TABLE billing_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(50) NOT NULL, -- 'monthly', 'yearly'
    rate_limit INTEGER NOT NULL,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default plans
INSERT INTO billing_plans (name, description, price, billing_cycle, rate_limit, features) VALUES
('Basic', 'Perfect for small projects', 10.00, 'monthly', 100, '{"support": "email", "endpoints": "all"}'),
('Premium', 'For growing businesses', 50.00, 'monthly', 1000, '{"support": "priority", "endpoints": "all", "custom": true}'),
('Enterprise', 'For large organizations', 200.00, 'monthly', 10000, '{"support": "24/7", "endpoints": "all", "custom": true, "sla": true}');
```

### **5. subscriptions Table**

```sql
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    plan_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'active', 'cancelled', 'expired', 'suspended'
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES api_clients(client_id),
    FOREIGN KEY (plan_id) REFERENCES billing_plans(id)
);

-- Indexes
CREATE INDEX idx_subscriptions_client_id ON subscriptions(client_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_ends_at ON subscriptions(ends_at);
```

## 🐬 **MongoDB Schema**

### **1. api_clients Collection**

```javascript
{
  _id: ObjectId,
  clientId: String, // unique
  apiKey: String, // unique, hashed
  name: String,
  email: String, // unique
  rateLimit: Number,
  allowedEndpoints: [String],
  isActive: Boolean,
  expiresAt: Date,
  role: String, // 'admin', 'client'
  createdAt: Date,
  lastUsed: Date,
  totalRequests: Number,
  metadata: Object,
  subscription: {
    planId: ObjectId,
    status: String,
    endsAt: Date
  }
}

// Indexes
db.api_clients.createIndex({ apiKey: 1 }, { unique: true });
db.api_clients.createIndex({ clientId: 1 }, { unique: true });
db.api_clients.createIndex({ email: 1 }, { unique: true });
db.api_clients.createIndex({ isActive: 1 });
db.api_clients.createIndex({ expiresAt: 1 });
```

### **2. api_usage_logs Collection**

```javascript
{
  _id: ObjectId,
  clientId: String,
  endpoint: String,
  method: String,
  statusCode: Number,
  responseTime: Number,
  ipAddress: String,
  userAgent: String,
  requestId: String,
  createdAt: Date
}

// Indexes
db.api_usage_logs.createIndex({ clientId: 1, createdAt: -1 });
db.api_usage_logs.createIndex({ createdAt: -1 });
db.api_usage_logs.createIndex({ endpoint: 1 });
```

## 🔧 **Database Connection Setup**

### **PostgreSQL Setup**

```javascript
// src/database/postgres.js
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

### **MongoDB Setup**

```javascript
// src/database/mongodb.js
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db('dracin_api_gateway');

export default db;
```

## 📊 **Migration Scripts**

### **PostgreSQL Migration**

```sql
-- Migration: 001_create_initial_tables.sql
-- Run this script to create initial database structure

BEGIN;

-- Create api_clients table
CREATE TABLE api_clients (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    rate_limit INTEGER DEFAULT 100,
    allowed_endpoints JSONB DEFAULT '["*"]',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    role VARCHAR(50) DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP,
    total_requests INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_api_clients_api_key ON api_clients(api_key);
CREATE INDEX idx_api_clients_client_id ON api_clients(client_id);
CREATE INDEX idx_api_clients_email ON api_clients(email);
CREATE INDEX idx_api_clients_is_active ON api_clients(is_active);
CREATE INDEX idx_api_clients_expires_at ON api_clients(expires_at);

-- Insert admin client
INSERT INTO api_clients (client_id, api_key, name, email, rate_limit, role) VALUES
('admin_client', 'admin_key_2026', 'Administrator', 'admin@dracin-api.com', 10000, 'admin');

COMMIT;
```

## 🚀 **Environment Variables**

```bash
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dracin_api_gateway
DB_USER=postgres
DB_PASSWORD=your_password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/dracin_api_gateway

# Database Type (postgres, mongodb, memory)
DB_TYPE=postgres
```

## 🔄 **Data Access Layer**

### **Repository Pattern**

```javascript
// src/repositories/ClientRepository.js
export class ClientRepository {
  constructor(db) {
    this.db = db;
  }

  async findByApiKey(apiKey) {
    // Implementation based on database type
  }

  async create(clientData) {
    // Implementation
  }

  async update(clientId, updates) {
    // Implementation
  }

  async delete(clientId) {
    // Implementation
  }

  async list(filters = {}) {
    // Implementation
  }
}
```

## 📈 **Performance Considerations**

### **1. Connection Pooling**
- PostgreSQL: Use connection pool (max 20 connections)
- MongoDB: Use built-in connection pooling

### **2. Indexing Strategy**
- Index on frequently queried fields
- Composite indexes for complex queries
- Regular index maintenance

### **3. Caching Layer**
- Redis for session storage
- Application-level caching for frequent lookups
- CDN for static assets

### **4. Monitoring**
- Database performance metrics
- Query performance analysis
- Connection pool monitoring

---

*Last updated: March 5, 2026*
