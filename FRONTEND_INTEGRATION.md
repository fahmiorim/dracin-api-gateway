# 🚀 Frontend Integration Guide

## 🔐 **Cara Menghubungkan Frontend dengan Backend yang Aman**

### **1. Environment Setup**

**Frontend (.env):**
```bash
# Development
VITE_API_BASE_URL=http://localhost:3000
VITE_API_KEY=your_api_key_here

# Production  
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_KEY=your_production_api_key
```

### **2. API Client Configuration**

**React/Vue Example:**
```javascript
// src/services/api.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': import.meta.env.VITE_API_KEY
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### **3. Usage Examples**

**React Component:**
```jsx
// src/components/DramaList.jsx
import { useState, useEffect } from 'react';
import apiClient from '../services/api';

function DramaList() {
  const [dramas, setDramas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDramas = async () => {
      try {
        const response = await apiClient.get('/dramabite/homepage');
        setDramas(response.data.data);
      } catch (error) {
        console.error('Error fetching dramas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDramas();
  }, []);

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="drama-grid">
          {dramas.map((drama) => (
            <div key={drama.cid} className="drama-card">
              <img src={drama.cover_url} alt={drama.title} />
              <h3>{drama.title}</h3>
              <p>{drama.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DramaList;
```

### **4. Security Best Practices**

**✅ DO:**
- Store API keys in environment variables
- Use HTTPS in production
- Implement rate limiting on frontend
- Validate responses before using data
- Handle errors gracefully

**❌ DON'T:**
- Hardcode API keys in frontend code
- Expose sensitive data in browser storage
- Make requests without proper error handling
- Ignore CORS policies

---

## 💰 **API Gateway untuk Penyewa (Multi-Tenant)**

### **1. Cara Kerja Sistem Penyewaan**

**Flow:**
1. **Admin** membuat API client untuk penyewa
2. **Penyewa** mendapatkan API key unik
3. **Penyewa** menggunakan API key untuk request
4. **Backend** mengautentikasi dan membatasi akses
5. **System** melacak usage dan billing

### **2. API Client Management**

**Create New Client:**
```bash
curl -X POST http://localhost:3000/admin/clients \
  -H "Content-Type: application/json" \
  -H "X-API-Key: admin_key" \
  -d '{
    "name": "PT. Streaming Indonesia",
    "email": "contact@streaming.id",
    "rateLimit": 1000,
    "allowedEndpoints": ["*"],
    "expiresAt": "2026-12-31"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "API client created successfully",
  "data": {
    "clientId": "client_1672531200000",
    "name": "PT. Streaming Indonesia",
    "email": "contact@streaming.id",
    "apiKey": "dk_a1b2c3d4e5f6...",
    "rateLimit": 1000,
    "allowedEndpoints": ["*"],
    "expiresAt": "2026-12-31T00:00:00.000Z"
  }
}
```

### **3. Penyewa Usage**

**Penyewa menggunakan API:**
```javascript
// Penyewa's frontend
const apiClient = axios.create({
  baseURL: 'https://api.gateway.com',
  headers: {
    'X-API-Key': 'dk_a1b2c3d4e5f6...' // API key yang didapat
  }
});

// Get dramas
const response = await apiClient.get('/dramabite/homepage');
```

### **4. Monitoring & Billing**

**Get Client Stats:**
```bash
curl -X GET http://localhost:3000/admin/clients/client_1672531200000/stats \
  -H "X-API-Key: admin_key"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientId": "client_1672531200000",
    "name": "PT. Streaming Indonesia",
    "totalRequests": 15420,
    "lastUsed": "2026-03-05T06:15:30.000Z",
    "rateLimit": 1000,
    "isActive": true,
    "expiresAt": "2026-12-31T00:00:00.000Z"
  }
}
```

### **5. Pricing Tiers**

**Basic Tier:**
- Rate Limit: 100 requests/15min
- All endpoints access
- Email support
- $10/month

**Premium Tier:**
- Rate Limit: 1000 requests/15min
- All endpoints access
- Priority support
- Custom endpoints
- $50/month

**Enterprise Tier:**
- Rate Limit: 10000 requests/15min
- All endpoints access
- Dedicated support
- Custom features
- SLA guarantee
- $200/month

### **6. Security Features**

**✅ Built-in Security:**
- API key authentication
- Rate limiting per client
- Endpoint access control
- Expiration management
- Usage monitoring
- Request logging

**🔧 Advanced Security:**
- IP whitelisting
- Request signing
- Webhook notifications
- Audit logs
- Automatic key rotation

---

## 🛠 **Implementation Checklist**

### **Frontend Setup:**
- [ ] Environment variables configured
- [ ] API client created
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] CORS configured

### **Backend Setup:**
- [ ] Multi-tenant auth middleware
- [ ] Rate limiting per client
- [ ] Client management API
- [ ] Usage monitoring
- [ ] Security headers

### **Production Deployment:**
- [ ] HTTPS certificates
- [ ] Environment separation
- [ ] Database backup
- [ ] Monitoring setup
- [ ] Log rotation

---

## 📞 **Support**

For technical support and API key requests:
- Email: api-support@yourdomain.com
- Documentation: https://docs.yourdomain.com
- Status Page: https://status.yourdomain.com

---

*Last updated: March 5, 2026*
