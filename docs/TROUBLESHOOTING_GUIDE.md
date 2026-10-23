# OpenSuite Document Editor - Troubleshooting Guide

## Overview

This guide helps you diagnose and resolve common issues with OpenSuite Document Editor. Follow the systematic approach below to identify and fix problems quickly.

## Quick Diagnostic Checklist

Before diving into specific issues, run through this checklist:

```bash
# 1. Check application status
curl http://localhost:3000/health

# 2. Check database connection
curl http://localhost:3000/health/db

# 3. Check Redis connection
curl http://localhost:3000/health/redis

# 4. Check recent logs
docker-compose logs --tail=50 app
# or
journalctl -u opensuite --since="5 minutes ago"

# 5. Check system resources
top -p $(pgrep -f "node.*opensuite")
df -h
free -h
```

## Common Issues

### 1. Application Won't Start

**Symptoms:**
- Service fails to start
- Port already in use
- Immediate crash after start

**Diagnosis:**

```bash
# Check if port is in use
sudo lsof -i :3000
# or
netstat -tulpn | grep 3000

# Check application logs
docker-compose logs app
journalctl -u opensuite -n 100 --no-pager

# Verify environment variables
docker-compose exec app env | grep -E "DATABASE_URL|REDIS_URL|JWT_SECRET"
```

**Solutions:**

**Port already in use:**
```bash
# Kill process using the port
sudo kill -9 $(sudo lsof -t -i:3000)

# Or change port in configuration
export PORT=3001
```

**Missing environment variables:**
```bash
# Check .env file
cat .env | grep -E "DATABASE_URL|REDIS_URL|JWT_SECRET"

# Set missing variables
export DATABASE_URL="postgresql://user:pass@localhost:5432/opensuite"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="your-secret-key-min-32-chars"
```

**Database connection failed:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify database exists
psql -U postgres -l | grep opensuite

# Create database if missing
createdb -U postgres opensuite
```

**Redis connection failed:**
```bash
# Test Redis connection
redis-cli ping

# Check Redis is running
sudo systemctl status redis

# Start Redis if stopped
sudo systemctl start redis
```

### 2. Slow Performance

**Symptoms:**
- Editor responds slowly
- High CPU/memory usage
- Long page load times
- Delayed collaboration updates

**Diagnosis:**

```bash
# Check system resources
top
htop
free -h
df -h

# Check application metrics
curl http://localhost:3000/metrics

# Check database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
psql $DATABASE_URL -c "SELECT * FROM pg_stat_database;"

# Check slow queries
psql $DATABASE_URL -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check Redis performance
redis-cli info stats
redis-cli info memory
```

**Solutions:**

**High CPU usage:**
```bash
# Enable clustering
pm2 start dist/server.js -i max --name opensuite

# Or increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Profile application
node --inspect dist/server.js
# Then use Chrome DevTools to analyze
```

**High memory usage:**
```bash
# Check for memory leaks
node --expose-gc --inspect dist/server.js

# Increase heap size
export NODE_OPTIONS="--max-old-space-size=8192"

# Restart application periodically (temporary fix)
0 */6 * * * systemctl restart opensuite
```

**Slow database queries:**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_documents_user_id ON documents(user_id);
CREATE INDEX CONCURRENTLY idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX CONCURRENTLY idx_comments_document_id ON comments(document_id);

-- Analyze tables
ANALYZE documents;
ANALYZE comments;
ANALYZE versions;

-- Vacuum database
VACUUM ANALYZE;

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM documents WHERE user_id = '123' ORDER BY created_at DESC LIMIT 10;
```

**Slow Redis operations:**
```bash
# Check Redis memory
redis-cli info memory

# Set memory limit
redis-cli config set maxmemory 2gb
redis-cli config set maxmemory-policy allkeys-lru

# Check slow logs
redis-cli slowlog get 10
```

**Large document performance:**
```typescript
// Enable virtualization in editor config
const editor = new Editor({
  virtualization: {
    enabled: true,
    itemHeight: 24,
    overscan: 5
  }
});
```

### 3. Collaboration Not Working

**Symptoms:**
- Can't see other users' cursors
- Changes don't sync in real-time
- WebSocket connection fails
- "Disconnected" message appears

**Diagnosis:**

```bash
# Check WebSocket connection
curl -I -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: editor.example.com" \
  -H "Origin: https://editor.example.com" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  https://editor.example.com/ws

# Check Nginx WebSocket configuration
nginx -T | grep -A 10 "location /ws"

# Check Redis pub/sub
redis-cli subscribe opensuite:collaboration

# Check application logs for WebSocket errors
docker-compose logs app | grep -i websocket
```

**Solutions:**

**WebSocket connection fails:**
```nginx
# Update Nginx configuration
location /ws {
    proxy_pass http://opensuite;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

**Changes not syncing:**
```bash
# Check Redis pub/sub
redis-cli publish opensuite:collaboration "test"

# Verify Redis is accessible from all nodes
redis-cli -h redis-host ping

# Check network connectivity
telnet redis-host 6379
```

**Multiple users see different versions:**
```bash
# Check Operational Transformation logs
docker-compose logs app | grep -i "OT\|transform"

# Verify document version consistency
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/documents/{id}/version
```

### 4. File Upload Issues

**Symptoms:**
- Upload fails
- Upload hangs
- File corrupted after upload
- Size limit errors

**Diagnosis:**

```bash
# Check upload logs
docker-compose logs app | grep -i upload

# Check disk space
df -h /var/www/opensuite/uploads

# Check file permissions
ls -la /var/www/opensuite/uploads

# Check Nginx upload limits
nginx -T | grep client_max_body_size
```

**Solutions:**

**Upload size limit:**
```nginx
# Increase Nginx upload limit
client_max_body_size 100M;
```

```bash
# Increase application limit
export MAX_FILE_SIZE=104857600  # 100MB
```

**Permission denied:**
```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/opensuite/uploads
sudo chmod -R 755 /var/www/opensuite/uploads
```

**S3 upload fails:**
```bash
# Verify AWS credentials
aws s3 ls

# Check bucket permissions
aws s3api get-bucket-policy --bucket your-bucket-name

# Test upload manually
echo "test" > test.txt
aws s3 cp test.txt s3://your-bucket-name/test.txt
```

### 5. Authentication Issues

**Symptoms:**
- Can't login
- Token expired
- Invalid credentials
- Session lost

**Diagnosis:**

```bash
# Check JWT secret
echo $JWT_SECRET | wc -c  # Should be >= 32

# Check token expiration
echo $TOKEN | cut -d '.' -f 2 | base64 -d | jq .

# Check user exists in database
psql $DATABASE_URL -c "SELECT * FROM users WHERE email = 'user@example.com';"
```

**Solutions:**

**Invalid JWT secret:**
```bash
# Generate new secret
export JWT_SECRET=$(openssl rand -base64 32)

# Update .env file
echo "JWT_SECRET=$JWT_SECRET" >> .env

# Restart application
sudo systemctl restart opensuite
```

**Token expired:**
```bash
# Increase token expiration
export JWT_EXPIRATION=86400  # 24 hours

# Implement token refresh
# See API documentation for refresh token endpoint
```

**User not found:**
```sql
-- Check if user exists
SELECT * FROM users WHERE email = 'user@example.com';

-- Create user if missing
INSERT INTO users (email, password_hash, created_at)
VALUES ('user@example.com', '$2b$10$...', NOW());
```

### 6. Document Corruption

**Symptoms:**
- Document won't open
- Content missing
- Formatting lost
- Save fails

**Diagnosis:**

```bash
# Check document in database
psql $DATABASE_URL -c "SELECT id, name, content_size, updated_at FROM documents WHERE id = 'doc_123';"

# Check document versions
psql $DATABASE_URL -c "SELECT * FROM versions WHERE document_id = 'doc_123' ORDER BY created_at DESC LIMIT 5;"

# Check file storage
ls -lh /var/www/opensuite/uploads/documents/
```

**Solutions:**

**Restore from version history:**
```bash
# Get latest valid version
psql $DATABASE_URL -c "SELECT content FROM versions WHERE document_id = 'doc_123' ORDER BY created_at DESC LIMIT 1;"

# Restore version
curl -X POST http://localhost:3000/api/documents/doc_123/versions/ver_abc/restore \
  -H "Authorization: Bearer $TOKEN"
```

**Database corruption:**
```bash
# Backup current state
pg_dump $DATABASE_URL > backup_before_repair.sql

# Check database integrity
psql $DATABASE_URL -c "REINDEX DATABASE opensuite;"
psql $DATABASE_URL -c "VACUUM FULL;"

# Restore from backup if needed
psql $DATABASE_URL < backup_before_repair.sql
```

### 7. Browser Compatibility Issues

**Symptoms:**
- Features don't work in certain browsers
- UI looks broken
- JavaScript errors in console

**Diagnosis:**

```bash
# Check browser console
# Open DevTools (F12) and check Console tab

# Check browser version
navigator.userAgent

# Test in different browsers
```

**Solutions:**

**Unsupported browser:**
```javascript
// Add browser check
const browser = detectBrowser();
if (!isBrowserSupported()) {
  showAlert('Please use a modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)');
}
```

**Polyfills needed:**
```html
<!-- Add to index.html -->
<script src="https://cdn.polyfill.io/v3/polyfill.min.js"></script>
```

### 8. Email Notifications Not Sending

**Symptoms:**
- Invitation emails not received
- Notification emails not sent
- Email errors in logs

**Diagnosis:**

```bash
# Check email configuration
env | grep SMTP

# Check email logs
docker-compose logs app | grep -i email
journalctl -u opensuite | grep -i email

# Test SMTP connection
telnet smtp.example.com 587
```

**Solutions:**

**SMTP configuration:**
```bash
# Update .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@opensuite.com
SMTP_SECURE=true
```

**Gmail specific:**
```bash
# Use App Password (not regular password)
# 1. Enable 2FA on Google account
# 2. Generate App Password: https://myaccount.google.com/apppasswords
# 3. Use App Password in SMTP_PASSWORD
```

## Debugging Tools

### Enable Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
export DEBUG=opensuite:*

# Restart application
sudo systemctl restart opensuite
```

### Network Inspection

```bash
# Monitor network traffic
sudo tcpdump -i any port 3000 -w capture.pcap

# Analyze WebSocket frames
wscat -c wss://editor.example.com/ws

# Check HTTP requests
curl -v http://localhost:3000/api/documents
```

### Database Debugging

```bash
# Enable query logging
psql $DATABASE_URL -c "ALTER SYSTEM SET log_statement = 'all';"
psql $DATABASE_URL -c "SELECT pg_reload_conf();"

# Monitor active queries
watch -n 1 'psql $DATABASE_URL -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = '\''active'\'';"'

# Check locks
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

### Performance Profiling

```bash
# Node.js profiling
node --prof dist/server.js

# Analyze profile
node --prof-process isolate-*.log > profile.txt

# Chrome DevTools profiling
node --inspect dist/server.js
# Then open chrome://inspect in Chrome
```

## Error Codes Reference

### Application Errors

| Code | Description | Solution |
|------|-------------|----------|
| `AUTH_001` | Invalid credentials | Check username/password |
| `AUTH_002` | Token expired | Refresh token or re-login |
| `AUTH_003` | Insufficient permissions | Check user role |
| `DOC_001` | Document not found | Verify document ID |
| `DOC_002` | Document locked | Wait for lock release |
| `DOC_003` | Invalid document format | Check file format |
| `COLLAB_001` | WebSocket connection failed | Check network/firewall |
| `COLLAB_002` | Conflict detected | Refresh document |
| `STORAGE_001` | Upload failed | Check disk space/permissions |
| `STORAGE_002` | File too large | Check size limits |
| `DB_001` | Database connection failed | Check database status |
| `DB_002` | Query timeout | Optimize query/indexes |
| `CACHE_001` | Redis connection failed | Check Redis status |
| `EMAIL_001` | Email send failed | Check SMTP configuration |

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Check authentication |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Verify resource exists |
| 409 | Conflict | Refresh and retry |
| 413 | Payload Too Large | Reduce file size |
| 429 | Too Many Requests | Wait and retry |
| 500 | Internal Error | Check logs |
| 503 | Service Unavailable | Check service status |

## Getting Help

### Log Files

```bash
# Application logs
/var/log/opensuite/app.log
docker-compose logs app
journalctl -u opensuite

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# Database logs
/var/log/postgresql/postgresql.log

# Redis logs
/var/log/redis/redis.log
```

### Support Channels

- **Documentation:** https://docs.opensuite.com
- **Status Page:** https://status.opensuite.com
- **Community Forum:** https://community.opensuite.com
- **Email Support:** support@opensuite.com
- **Emergency Support:** emergency@opensuite.com (24/7 for Enterprise)

### Providing Information for Support

When contacting support, include:

```bash
# System information
uname -a
node --version
npm --version
docker --version

# Application version
curl http://localhost:3000/version

# Recent logs (last 100 lines)
docker-compose logs --tail=100 app > logs.txt

# Configuration (remove sensitive data)
env | grep -v "PASSWORD\|SECRET\|KEY" > env.txt

# Database status
psql $DATABASE_URL -c "SELECT version();" > db_status.txt

# System resources
top -b -n 1 > system_resources.txt
df -h > disk_usage.txt
free -h > memory_usage.txt
```

## Prevention Best Practices

### Monitoring

Set up monitoring for:
- Application health checks
- Database performance
- Redis performance
- Disk space usage
- Memory usage
- CPU usage
- Error rates
- Response times
- WebSocket connections

### Backups

```bash
# Daily database backup
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Weekly full backup
0 3 * * 0 tar -czf /backups/full_$(date +\%Y\%m\%d).tar.gz /var/www/opensuite

# Test restore monthly
0 4 1 * * /scripts/test-restore.sh
```

### Updates

```bash
# Keep system updated
sudo apt-get update && sudo apt-get upgrade -y

# Update application
cd /var/www/opensuite
git pull origin main
npm ci --production
npm run build
sudo systemctl restart opensuite

# Update dependencies monthly
npm audit fix
```

### Documentation

Maintain documentation for:
- System architecture
- Configuration details
- Custom modifications
- Backup procedures
- Recovery procedures
- Contact information

---

**Version:** 1.0  
**Last Updated:** 2024-01-20  
**© OpenSuite 2024**
