# Installation & Setup Guide

This guide covers installing and configuring the Request Management System for development, testing, and production environments.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Start (Development)](#quick-start-development)
3. [Configuration](#configuration)
4. [Database Setup](#database-setup)
5. [Docker Deployment](#docker-deployment)
6. [Production Setup](#production-setup)
7. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **SQLite3**: (included via npm dependencies)
- **Storage**: At least 1 GB for file uploads
- **RAM**: 512 MB (1 GB recommended for production)
- **Disk I/O**: SSD recommended for optimal performance

### Supported Platforms
- Linux (Ubuntu 18.04+, CentOS 7+)
- macOS (10.14+)
- Windows (10/11 with WSL2 or native Node)
- Docker (Linux containers)

## Quick Start (Development)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd request-management-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example configuration file and customize as needed:

```bash
cp .env.example .env
```

Edit `.env` with your settings (see [Configuration](#configuration) section).

### 4. Initialize Database

```bash
npm run migrate
npm run seed
```

This creates the SQLite database and populates nomenclature and test data.

### 5. Start the Server

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

The server starts on the port specified in `.env` (default: 3000).

### 6. Verify Installation

Check the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok"}
```

Access the dashboard at: `http://localhost:3000`

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./data/requests.sqlite

# File Upload
UPLOAD_DIR=./uploads
MAX_ATTACHMENTS=5
MAX_FILE_SIZE=10485760

# JWT Authentication
JWT_SECRET=your-very-secure-secret-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Bcrypt
BCRYPT_ROUNDS=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Notifications & Cron
NOTIFICATION_HOURS_BEFORE_DEADLINE=24
NOTIFICATION_CRON_SCHEDULE=0 * * * *

# SMTP for Email Notifications
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=noreply@requests.local
```

### Key Configuration Notes

- **JWT_SECRET**: Use a strong random string (minimum 32 characters) in production
- **NODE_ENV**: Set to `production` for live deployments
- **UPLOAD_DIR**: Must be writable by the Node process; automatically created if missing
- **SMTP_***: Optional; if not configured, email notifications are skipped gracefully
- **RATE_LIMIT_WINDOW_MS**: Time window in milliseconds for rate limiting (default: 15 minutes)
- **RATE_LIMIT_MAX_REQUESTS**: Maximum requests per IP in the time window

## Database Setup

### SQLite Database

The application uses SQLite3 for data persistence. The database is automatically created on first run.

#### Manual Database Creation

If you need to manually set up the database:

```bash
npm run migrate
```

This script:
1. Creates all required tables (requests, users, files, audit_log, etc.)
2. Applies any pending migrations
3. Creates necessary indexes for performance

#### Seeding with Sample Data

```bash
npm run seed
```

This populates:
- Nomenclature tables (request types, topics, social groups, intake forms)
- Sample test users (citizen, operator, executor, supervisor, admin)
- Example requests for testing

**Warning**: In production, run `npm run seed` only once to populate initial nomenclature.

#### Database Backups

To back up your SQLite database:

```bash
# Simple file copy (ensure application is stopped)
cp ./data/requests.sqlite ./backups/requests.sqlite.$(date +%Y%m%d_%H%M%S)

# Or use SQLite's backup command
sqlite3 ./data/requests.sqlite ".backup './backups/requests.sqlite.backup'"
```

To restore from backup:

```bash
cp ./backups/requests.sqlite.backup ./data/requests.sqlite
```

## Docker Deployment

### Docker Build

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD npm run health || exit 1

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

### Docker Compose Setup

Create a `docker-compose.yml` for local development:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      PORT: 3000
      DB_PATH: /app/data/requests.sqlite
      UPLOAD_DIR: /app/uploads
      JWT_SECRET: dev-secret-key-change-in-production
      SMTP_HOST: mailhog
      SMTP_PORT: 1025
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    depends_on:
      - mailhog
    networks:
      - app-network

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"
      - "8025:8025"
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Running with Docker Compose

```bash
# Start services
docker-compose up -d

# Initialize database
docker-compose exec app npm run migrate
docker-compose exec app npm run seed

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Docker Production Deployment

For production, use environment-specific compose files:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    image: request-management:latest
    restart: always
    environment:
      NODE_ENV: production
      JWT_SECRET: ${PROD_JWT_SECRET}
      SMTP_HOST: ${PROD_SMTP_HOST}
      SMTP_USER: ${PROD_SMTP_USER}
      SMTP_PASS: ${PROD_SMTP_PASS}
    volumes:
      - /data/requests:/app/data
      - /data/uploads:/app/uploads
    networks:
      - app-network
```

## Production Setup

### Pre-Production Checklist

- [ ] Change `JWT_SECRET` to a strong, random value
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper SMTP settings for email notifications
- [ ] Set appropriate `RATE_LIMIT_*` values
- [ ] Configure firewall rules (allow port 3000 or reverse proxy)
- [ ] Set up SSL/TLS with a reverse proxy (nginx, Apache, or CloudFlare)
- [ ] Configure log rotation and monitoring
- [ ] Plan backup strategy and test recovery

### Reverse Proxy Configuration

#### Nginx Example

```nginx
upstream request_app {
  server localhost:3000;
}

server {
  listen 443 ssl http2;
  server_name requests.example.com;

  ssl_certificate /etc/ssl/certs/cert.pem;
  ssl_certificate_key /etc/ssl/private/key.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;

  # Compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;

  location / {
    proxy_pass http://request_app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
  location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://request_app;
  }
}

server {
  listen 80;
  server_name requests.example.com;
  return 301 https://$server_name$request_uri;
}
```

### Scheduled Jobs Configuration

The application runs scheduled jobs for deadline monitoring and notifications.

#### Deadline Refresh Job

- **Frequency**: Every hour (default)
- **Purpose**: Recalculates deadline control statuses
- **Configuration**: Automatic, runs once on startup and then hourly

#### Notification Job

- **Frequency**: Configurable via `NOTIFICATION_CRON_SCHEDULE`
- **Default**: Every hour at minute 0
- **Purpose**: Sends deadline approaching notifications

#### Custom Cron Schedules

Set `NOTIFICATION_CRON_SCHEDULE` to a cron expression:

```env
# Every day at 9 AM
NOTIFICATION_CRON_SCHEDULE=0 9 * * *

# Every 6 hours
NOTIFICATION_CRON_SCHEDULE=0 */6 * * *

# Every Monday at 8 AM
NOTIFICATION_CRON_SCHEDULE=0 8 * * 1
```

### Performance Optimization

#### Database Optimization

- Indexes are automatically created on tables
- Use pagination when listing large datasets (default: 20 items per page)
- Archive old requests periodically

#### File Upload Optimization

- Maximum file size: 10 MB (configurable)
- Stored in the configured `UPLOAD_DIR`
- Clean up old files periodically

#### Caching Strategy

- The application does not use persistent caching
- Implement a reverse proxy cache (e.g., Varnish, Redis) for static assets
- Consider CDN for file downloads

### Monitoring & Logging

The application logs to console and can integrate with external logging services:

```bash
# View application logs (with npm)
npm start 2>&1 | tee logs/app.log

# Tail logs in real-time
tail -f logs/app.log

# Parse logs with grep
grep "ERROR" logs/app.log
```

#### Integration with Logging Services

For production, pipe logs to external services:

```bash
# ELK Stack
npm start | logstash-cli

# Datadog
npm start 2>&1 | dd-agent
```

## Troubleshooting

### Common Issues

#### Port 3000 Already in Use

```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

#### Database Locked Error

Ensure only one instance of the application is running:

```bash
ps aux | grep "node src/server.js"
```

For SQLite recovery:

```bash
# Check database integrity
sqlite3 ./data/requests.sqlite "PRAGMA integrity_check;"

# Rebuild database if corrupted
sqlite3 ./data/requests.sqlite ".recover" | sqlite3 ./data/requests.sqlite.recovered
```

#### File Upload Failures

Check directory permissions:

```bash
# Ensure uploads directory is writable
chmod 755 uploads
chown -R <app-user>:<app-group> uploads
```

#### SMTP Connection Issues

Test SMTP configuration:

```bash
npm test -- --testNamePattern="notification"
```

For local testing, run Mailhog:

```bash
# Docker
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Access UI at http://localhost:8025
```

#### JWT Token Issues

If users report login failures:

1. Verify `JWT_SECRET` hasn't changed unexpectedly
2. Check token expiry settings
3. Clear browser sessionStorage and retry login

#### Memory Leaks in Long-Running Deployments

Monitor memory usage:

```bash
# Check Node process memory
ps aux | grep node

# Restart application if memory exceeds threshold
```

## Getting Help

- Check logs: `npm start 2>&1 | tee logs/app.log`
- Review configuration: `cat .env` (redact secrets)
- Run tests: `npm test`
- Check health: `curl http://localhost:3000/health`

For detailed troubleshooting, see the main README and API documentation.
