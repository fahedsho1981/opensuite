# OpenSuite Document Editor - Deployment Guide

## Overview

This guide covers deployment options, system requirements, configuration, and best practices for deploying OpenSuite Document Editor in production environments.

## System Requirements

### Minimum Requirements

**Server:**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- Network: 100 Mbps

**Database:**
- PostgreSQL 13+ or MySQL 8.0+
- Redis 6+ (for caching and real-time features)

**Software:**
- Node.js 18+ or Docker
- Nginx or Apache (reverse proxy)
- SSL/TLS certificate

### Recommended Requirements

**Server:**
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 100+ GB SSD
- Network: 1 Gbps

**Database:**
- PostgreSQL 15+ with connection pooling
- Redis 7+ with clustering

**Additional:**
- Load balancer (for high availability)
- CDN (for static assets)
- Object storage (S3, GCS, or Azure Blob)

## Deployment Options

### 1. Docker Deployment (Recommended)

#### Prerequisites

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    image: opensuite/document-editor:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/opensuite
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-secret-key
      - STORAGE_TYPE=s3
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_S3_BUCKET=your-bucket-name
      - AWS_REGION=us-east-1
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=opensuite
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

Create `.env` file:

```bash
# Database
POSTGRES_USER=opensuite
POSTGRES_PASSWORD=secure-password-here
POSTGRES_DB=opensuite

# Application
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NODE_ENV=production

# AWS S3 (if using S3 storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-smtp-password

# Analytics (optional)
ANALYTICS_ID=your-analytics-id
```

#### Deployment Steps

```bash
# 1. Clone repository
git clone https://github.com/opensuite/document-editor.git
cd document-editor

# 2. Configure environment
cp .env.example .env
nano .env  # Edit with your values

# 3. Start services
docker-compose up -d

# 4. Initialize database
docker-compose exec app npm run db:migrate
docker-compose exec app npm run db:seed

# 5. Check logs
docker-compose logs -f app

# 6. Verify deployment
curl http://localhost:3000/health
```

### 2. Kubernetes Deployment

#### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

#### Helm Chart

Create `values.yaml`:

```yaml
replicaCount: 3

image:
  repository: opensuite/document-editor
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: editor.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: editor-tls
      hosts:
        - editor.example.com

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

env:
  NODE_ENV: production
  DATABASE_URL: postgresql://user:pass@postgres:5432/opensuite
  REDIS_URL: redis://redis:6379

postgresql:
  enabled: true
  auth:
    username: opensuite
    password: secure-password
    database: opensuite

redis:
  enabled: true
  architecture: standalone
```

#### Deployment Steps

```bash
# 1. Add Helm repository
helm repo add opensuite https://charts.opensuite.com
helm repo update

# 2. Install chart
helm install editor opensuite/document-editor \
  -f values.yaml \
  --namespace opensuite \
  --create-namespace

# 3. Check deployment status
kubectl get pods -n opensuite
kubectl get services -n opensuite
kubectl get ingress -n opensuite

# 4. View logs
kubectl logs -f deployment/editor -n opensuite
```

### 3. Traditional Server Deployment

#### Prerequisites

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Redis
sudo apt-get install -y redis-server

# Install Nginx
sudo apt-get install -y nginx
```

#### Application Setup

```bash
# 1. Clone repository
git clone https://github.com/opensuite/document-editor.git
cd document-editor

# 2. Install dependencies
npm ci --production

# 3. Build application
npm run build

# 4. Configure environment
cp .env.example .env
nano .env  # Edit with your values

# 5. Setup database
sudo -u postgres psql
CREATE USER opensuite WITH PASSWORD 'secure-password';
CREATE DATABASE opensuite OWNER opensuite;
\q

# 6. Run migrations
npm run db:migrate
npm run db:seed
```

#### Systemd Service

Create `/etc/systemd/system/opensuite.service`:

```ini
[Unit]
Description=OpenSuite Document Editor
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/opensuite
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/opensuite/.env

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable opensuite
sudo systemctl start opensuite
sudo systemctl status opensuite
```

#### Nginx Configuration

Create `/etc/nginx/sites-available/opensuite`:

```nginx
upstream opensuite {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name editor.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name editor.example.com;

    ssl_certificate /etc/letsencrypt/live/editor.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/editor.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss://editor.example.com;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Static files
    location /static {
        alias /var/www/opensuite/dist/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket
    location /ws {
        proxy_pass http://opensuite;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Application
    location / {
        proxy_pass http://opensuite;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://opensuite/health;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/opensuite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d editor.example.com
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/production) | development | Yes |
| `PORT` | Application port | 3000 | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `REDIS_URL` | Redis connection string | - | Yes |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | - | Yes |
| `STORAGE_TYPE` | Storage backend (local/s3/gcs) | local | No |
| `AWS_ACCESS_KEY_ID` | AWS access key | - | If using S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - | If using S3 |
| `AWS_S3_BUCKET` | S3 bucket name | - | If using S3 |
| `AWS_REGION` | AWS region | us-east-1 | If using S3 |
| `SMTP_HOST` | SMTP server host | - | No |
| `SMTP_PORT` | SMTP server port | 587 | No |
| `SMTP_USER` | SMTP username | - | No |
| `SMTP_PASSWORD` | SMTP password | - | No |
| `ANALYTICS_ID` | Analytics tracking ID | - | No |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | info | No |
| `MAX_FILE_SIZE` | Maximum upload size (bytes) | 10485760 | No |
| `ALLOWED_ORIGINS` | CORS allowed origins | * | No |

### Database Configuration

#### PostgreSQL Optimization

```sql
-- Increase connection limits
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';

-- Create indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_comments_document_id ON comments(document_id);
CREATE INDEX idx_versions_document_id ON versions(document_id);

-- Enable connection pooling (pgbouncer)
```

#### Redis Configuration

```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

## Monitoring

### Health Checks

```bash
# Application health
curl http://localhost:3000/health

# Database health
curl http://localhost:3000/health/db

# Redis health
curl http://localhost:3000/health/redis

# Storage health
curl http://localhost:3000/health/storage
```

### Metrics

Prometheus metrics available at `/metrics`:

```bash
# Request metrics
curl http://localhost:3000/metrics

# Example output
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
http_requests_total{method="POST",status="201"} 567

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 1000
http_request_duration_seconds_bucket{le="0.5"} 1500
```

### Logging

Configure log aggregation:

```bash
# Docker logs
docker-compose logs -f app | jq .

# Systemd logs
sudo journalctl -u opensuite -f

# Application logs
tail -f /var/log/opensuite/app.log
```

### Alerting

Set up alerts for:
- High error rate (> 1%)
- High latency (p95 > 2s)
- Low disk space (< 10%)
- High CPU usage (> 80%)
- High memory usage (> 80%)
- Database connection failures
- WebSocket connection failures

## Backup and Recovery

### Database Backup

```bash
# Manual backup
pg_dump -U opensuite opensuite > backup_$(date +%Y%m%d).sql

# Automated backup (cron)
0 2 * * * pg_dump -U opensuite opensuite | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Restore
gunzip < backup.sql.gz | psql -U opensuite opensuite
```

### File Storage Backup

```bash
# S3 backup
aws s3 sync s3://your-bucket /backups/s3_$(date +%Y%m%d)

# Local storage backup
tar -czf /backups/files_$(date +%Y%m%d).tar.gz /var/www/opensuite/uploads
```

### Disaster Recovery

1. **RPO (Recovery Point Objective):** 1 hour
2. **RTO (Recovery Time Objective):** 4 hours

**Recovery Steps:**
1. Restore database from latest backup
2. Restore file storage from backup
3. Redeploy application
4. Verify health checks
5. Update DNS if needed

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      replicas: 3
    environment:
      - REDIS_URL=redis://redis:6379
```

### Load Balancing

```nginx
upstream opensuite {
    least_conn;
    server app1:3000;
    server app2:3000;
    server app3:3000;
    keepalive 64;
}
```

### Database Scaling

- Use read replicas for read-heavy workloads
- Implement connection pooling (PgBouncer)
- Partition large tables
- Use materialized views for complex queries

## Security

### SSL/TLS

```bash
# Generate strong Diffie-Hellman parameters
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048

# Add to nginx.conf
ssl_dhparam /etc/nginx/dhparam.pem;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### Firewall

```bash
# UFW configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Security Checklist

- [ ] Enable HTTPS everywhere
- [ ] Set secure HTTP headers
- [ ] Implement rate limiting
- [ ] Enable CORS properly
- [ ] Use strong JWT secrets
- [ ] Encrypt sensitive data at rest
- [ ] Regular security updates
- [ ] Monitor for suspicious activity
- [ ] Implement proper authentication
- [ ] Use prepared statements for SQL
- [ ] Sanitize all user inputs
- [ ] Implement CSRF protection
- [ ] Set up intrusion detection
- [ ] Regular security audits
- [ ] Backup encryption keys securely

## Performance Tuning

### Application

```bash
# Enable clustering
NODE_ENV=production node --max-old-space-size=4096 dist/server.js

# Or use PM2
pm2 start dist/server.js -i max --name opensuite
```

### Database

```sql
-- Analyze and vacuum
ANALYZE;
VACUUM FULL;

-- Monitor slow queries
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### Caching

```typescript
// Redis caching example
const cache = {
  get: async (key: string) => {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },
  set: async (key: string, value: any, ttl = 3600) => {
    await redis.setex(key, ttl, JSON.stringify(value));
  }
};
```

## Troubleshooting

### Common Issues

**Issue:** Application won't start
```bash
# Check logs
docker-compose logs app
journalctl -u opensuite -n 100

# Verify environment
env | grep -E "DATABASE_URL|REDIS_URL|JWT_SECRET"

# Check database connection
psql $DATABASE_URL -c "SELECT 1"
```

**Issue:** High memory usage
```bash
# Check memory
docker stats
free -h

# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096"
```

**Issue:** WebSocket connection fails
```bash
# Check Nginx configuration
nginx -t

# Verify WebSocket headers
curl -I -H "Upgrade: websocket" -H "Connection: Upgrade" https://editor.example.com/ws
```

## Support

- **Documentation:** https://docs.opensuite.com
- **Status Page:** https://status.opensuite.com
- **Support Email:** support@opensuite.com
- **Community:** https://community.opensuite.com

---

**Version:** 1.0  
**Last Updated:** 2024-01-20  
**© OpenSuite 2024**
