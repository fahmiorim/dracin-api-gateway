# 🚀 Production Deployment Guide

## 📋 **Deployment Checklist**

### **✅ Pre-Deployment Requirements**

1. **Environment Setup**
   - [ ] Node.js 18+ installed
   - [ ] PostgreSQL 14+ or MongoDB 5.0+
   - [ ] Redis for caching (optional but recommended)
   - [ ] SSL certificates
   - [ ] Domain name configured

2. **Security Configuration**
   - [ ] API keys generated for admin
   - [ ] CORS origins configured
   - [ ] Rate limits set appropriately
   - [ ] Security headers configured
   - [ ] Database credentials secured

3. **Database Setup**
   - [ ] Database created
   - [ ] Schema migrated
   - [ ] Indexes created
   - [ ] Backup strategy implemented
   - [ ] Connection pooling configured

## 🏗️ **Production Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   API Gateway   │────│   Database      │
│   (Nginx/HAProxy)│    │   (Node.js)     │    │   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Static    │    │   Redis Cache   │    │   Backup Storage│
│   (CloudFlare)  │    │   (Optional)    │    │   (S3/Local)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 **Environment Configuration**

### **Production .env**
```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dracin_api_gateway
DB_USER=api_user
DB_PASSWORD=secure_password_here

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# API Configuration
API_KEY=your_admin_api_key_here
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_MAX=1000

# Logging
LOG_LEVEL=warn
LOG_FILE_PATH=/var/log/dracin-api/app.log

# External API Timeouts
REQUEST_TIMEOUT=30000
EXTERNAL_TIMEOUT=15000

# Security
SSL_CERT_PATH=/etc/ssl/certs/yourdomain.crt
SSL_KEY_PATH=/etc/ssl/private/yourdomain.key
```

## 🐳 **Docker Deployment**

### **Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

### **docker-compose.yml**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=dracin_api_gateway
      - DB_USER=api_user
      - DB_PASSWORD=secure_password
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - app-network

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=dracin_api_gateway
      - POSTGRES_USER=api_user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/ssl
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

## 🌐 **Nginx Configuration**

### **nginx.conf**
```nginx
upstream api_backend {
    server app:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/ssl/yourdomain.crt;
    ssl_certificate_key /etc/ssl/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # API routes
    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://api_backend;
    }

    # Static files (if any)
    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔄 **CI/CD Pipeline**

### **GitHub Actions (.github/workflows/deploy.yml)**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/dracin-api-gateway
            git pull origin main
            docker-compose down
            docker-compose build
            docker-compose up -d
            docker system prune -f
```

## 📊 **Monitoring & Logging**

### **PM2 Configuration (ecosystem.config.js)**
```javascript
module.exports = {
  apps: [{
    name: 'dracin-api-gateway',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/dracin-api/error.log',
    out_file: '/var/log/dracin-api/out.log',
    log_file: '/var/log/dracin-api/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### **Log Rotation (logrotate)**
```bash
# /etc/logrotate.d/dracin-api
/var/log/dracin-api/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reload dracin-api-gateway
    endscript
}
```

## 🔒 **Security Hardening**

### **1. System Security**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Create dedicated user
sudo useradd -m -s /bin/bash apiuser
sudo usermod -aG sudo apiuser

# Set permissions
sudo chown -R apiuser:apiuser /opt/dracin-api-gateway
sudo chmod 750 /opt/dracin-api-gateway
```

### **2. Application Security**
```bash
# Set proper file permissions
chmod 600 .env
chmod 600 config/ssl/*
chmod 755 scripts/*.sh

# Use process manager
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## 📈 **Performance Optimization**

### **1. Database Optimization**
```sql
-- PostgreSQL performance settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

### **2. Application Optimization**
```javascript
// Enable compression
import compression from 'compression';
app.use(compression());

// Enable clustering
import cluster from 'cluster';
import os from 'os';

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Start application
}
```

## 🚨 **Backup Strategy**

### **Database Backup Script**
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
DB_NAME="dracin_api_gateway"

# Create backup
pg_dump -h localhost -U api_user $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### **Cron Job**
```bash
# Add to crontab
0 2 * * * /opt/dracin-api-gateway/scripts/backup.sh
```

## 🎯 **Post-Deployment Verification**

### **Health Check Script**
```bash
#!/bin/bash
# health-check.sh

# Check if server is running
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Server is healthy"
else
    echo "❌ Server is not responding"
    exit 1
fi

# Check database connection
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "✅ Database is healthy"
else
    echo "❌ Database is not responding"
    exit 1
fi

# Check SSL certificate
if openssl x509 -checkend 86400 -noout -in /etc/ssl/yourdomain.crt > /dev/null 2>&1; then
    echo "✅ SSL certificate is valid"
else
    echo "❌ SSL certificate is expiring soon"
    exit 1
fi

echo "✅ All systems operational"
```

## 📞 **Support & Maintenance**

### **Monitoring Commands**
```bash
# Check application status
pm2 status
pm2 logs dracin-api-gateway

# Check system resources
htop
df -h
free -m

# Check database
sudo -u postgres psql -c "SELECT count(*) FROM api_clients;"

# Check logs
tail -f /var/log/dracin-api/combined.log
```

### **Emergency Procedures**
```bash
# Restart application
pm2 restart dracin-api-gateway

# Emergency rollback
git checkout previous_stable_tag
docker-compose down
docker-compose up -d

# Database recovery
psql -h localhost -U api_user dracin_api_gateway < backup_20260305_020000.sql
```

---

## 🎉 **Deployment Complete!**

Your API Gateway is now production-ready with:
- ✅ Multi-tenant authentication
- ✅ Rate limiting per client
- ✅ Secure database integration
- ✅ Monitoring and logging
- ✅ SSL/TLS encryption
- ✅ Performance optimization
- ✅ Backup and recovery

**Next Steps:**
1. Test all endpoints with production API keys
2. Set up monitoring alerts
3. Configure billing system
4. Launch to customers!

---

*Last updated: March 5, 2026*
