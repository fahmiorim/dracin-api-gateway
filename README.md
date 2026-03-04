# Dracin API Gateway

API Gateway untuk Dracin content platform (Dramabox + ReelShort + Dramabite + Melolo)

## 🚀 Fitur

- **API Gateway** untuk multiple content platforms
- **Rate Limiting** untuk mencegah abuse
- **Security Headers** dengan Helmet
- **CORS Configuration** yang fleksibel
- **Structured Logging** dengan Winston
- **Health Check** endpoint
- **API Documentation** dengan Swagger UI
- **Environment Configuration** yang aman
- **Request Timeout** handling
- **API Key Authentication** (optional)

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

## 🛠️ Instalasi

1. Clone repository
```bash
git clone <repository-url>
cd dracin-api-gateway
```

2. Install dependencies
```bash
npm install
```

3. Copy environment configuration
```bash
cp .env.example .env
```

4. Konfigurasi environment variables di `.env`

## ⚙️ Environment Variables

```bash
# Server Configuration
PORT=4343
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info

# API Keys (optional)
API_KEY=your-api-key-here

# External Service Timeouts (milliseconds)
REQUEST_TIMEOUT=30000
EXTERNAL_TIMEOUT=15000
```

## 🚀 Menjalankan Aplikasi

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📚 API Endpoints

### Base URLs
- **Dramabox**: `/dramabox`
- **ReelShort**: `/reelshort`
- **Melolo**: `/melolo`
- **Dramabite**: `/dramabite`

### Health Check
- **GET** `/health` - Health check endpoint
- **GET** `/` - Redirect ke documentation

### Documentation
- **Swagger UI**: `/docs`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔧 Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 📁 Struktur Proyek

```
dracin-api-gateway/
├── src/
│   ├── config/          # Konfigurasi aplikasi
│   ├── controllers/     # Route controllers
│   ├── lib/            # Service libraries
│   ├── middleware/     # Express middleware
│   ├── routes/         # API routes
│   └── utils/          # Utility functions
├── lib/                # External API libraries
├── logs/               # Log files
├── tests/              # Test files
└── docs/               # Documentation
```

## 🔒 Security Features

- **Helmet**: Security headers
- **Rate Limiting**: Mencegah DDoS
- **CORS**: Cross-origin resource sharing
- **API Key Authentication**: Optional API key validation
- **Request Timeout**: Mencegah hanging requests
- **Input Validation**: Joi validation schemas

## 📊 Monitoring & Logging

- **Winston**: Structured logging
- **Request ID**: Tracking requests
- **Health Checks**: Monitoring service status
- **Memory Usage**: Memory monitoring

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 Development Guidelines

- Gunakan ES6+ syntax
- Follow ESLint rules
- Write tests untuk fitur baru
- Update documentation
- Use semantic versioning

## 📄 License

MIT License - lihat file [LICENSE](LICENSE) untuk detail

## 🆘 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port
   npx kill-port 4343
   ```

2. **Environment variables not loaded**
   - Pastikan `.env` file ada di root directory
   - Check variable names di `.env`

3. **CORS issues**
   - Check `ALLOWED_ORIGINS` di `.env`
   - Pastikan origin terdaftar

## 📞 Support

Untuk support atau questions:
- Create issue di GitHub
- Email: support@dracin.com
