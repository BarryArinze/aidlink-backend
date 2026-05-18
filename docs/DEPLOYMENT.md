# AidLink Backend Deployment Guide

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 7+
- Domain name with SSL certificate

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/aidlink-backend.git
cd aidlink-backend
```

### 2. Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL="postgresql://user:password@host:5432/aidlink?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_password

# Soroban/Stellar
SOROBAN_NETWORK_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
```

## Local Development

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Without Docker

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed

# Start development server
npm run dev
```

## Production Deployment

### Option 1: Docker Compose (Simple)

```bash
# Build and start
docker-compose -f docker-compose.yml up -d

# Scale workers
docker-compose up -d --scale email-worker=3 --scale blockchain-worker=2
```

### Option 2: Kubernetes (Recommended)

#### 1. Create Kubernetes Secrets

```bash
kubectl create secret generic aidlink-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="your-secret" \
  --from-literal=redis-password="your-password"
```

#### 2. Deploy PostgreSQL

```bash
kubectl apply -f k8s/postgres/
```

#### 3. Deploy Redis

```bash
kubectl apply -f k8s/redis/
```

#### 4. Deploy Application

```bash
kubectl apply -f k8s/api/
kubectl apply -f k8s/workers/
```

#### 5. Configure Ingress

```bash
kubectl apply -f k8s/ingress/
```

### Option 3: Cloud Services (AWS/GCP/Azure)

#### AWS Deployment

1. **RDS PostgreSQL**
   - Create PostgreSQL instance
   - Configure security groups
   - Get connection string

2. **ElastiCache Redis**
   - Create Redis cluster
   - Configure security groups
   - Get endpoint

3. **ECS/EKS**
   - Push Docker image to ECR
   - Create task definition
   - Deploy to ECS/EKS

4. **Load Balancer**
   - Configure ALB/NLB
   - SSL certificate
   - Health checks

#### Google Cloud Deployment

1. **Cloud SQL**
   - Create PostgreSQL instance
   - Configure connections
   - Get connection string

2. **Memorystore**
   - Create Redis instance
   - Configure VPC peering
   - Get endpoint

3. **Cloud Run/GKE**
   - Build and push to GCR
   - Deploy to Cloud Run or GKE
   - Configure environment variables

4. **Cloud Load Balancing**
   - Configure load balancer
   - SSL certificate
   - Health checks

## Database Migrations

### Running Migrations

```bash
# Development
npm run prisma:migrate

# Production
npx prisma migrate deploy
```

### Creating New Migration

```bash
npx prisma migrate dev --name migration_name
```

### Resetting Database (Development Only)

```bash
npx prisma migrate reset
```

## Monitoring & Logging

### Application Logs

```bash
# Docker logs
docker-compose logs -f api

# Kubernetes logs
kubectl logs -f deployment/aidlink-api
```

### Health Checks

```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

### Monitoring Stack

Recommended tools:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Loki**: Log aggregation
- **Alertmanager**: Alerting

## SSL/TLS Configuration

### Using Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d api.aidlink.org

# Copy certificates
sudo cp /etc/letsencrypt/live/api.aidlink.org/fullchain.pem /path/to/certs/
sudo cp /etc/letsencrypt/live/api.aidlink.org/privkey.pem /path/to/certs/
```

### Using Cloud Provider SSL

- AWS: ACM (Certificate Manager)
- GCP: Cloud SSL certificates
- Azure: App Service certificates

## Scaling Strategies

### Horizontal Scaling

```bash
# Scale API servers
kubectl scale deployment aidlink-api --replicas=3

# Scale workers
kubectl scale deployment aidlink-email-worker --replicas=5
```

### Vertical Scaling

- Increase CPU/memory limits in deployment configuration
- Monitor resource usage and adjust accordingly

### Database Scaling

- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)
- Query optimization

## Backup & Recovery

### Database Backups

```bash
# Manual backup
pg_dump -U aidlink aidlink > backup.sql

# Automated backup (cron)
0 2 * * * pg_dump -U aidlink aidlink > /backups/aidlink_$(date +\%Y\%m\%d).sql
```

### Restore from Backup

```bash
psql -U aidlink aidlink < backup.sql
```

### Disaster Recovery

1. **RPO (Recovery Point Objective)**: 1 hour
2. **RTO (Recovery Time Objective)**: 4 hours
3. **Backup Retention**: 30 days
4. **Off-site Backup**: Yes

## Security Hardening

### Firewall Rules

```bash
# Allow only necessary ports
- 80 (HTTP)
- 443 (HTTPS)
- 22 (SSH - restricted IPs)
```

### Security Headers

Already configured via Helmet.js:
- HSTS
- X-Frame-Options
- X-Content-Type-Options
- CSP

### Rate Limiting

Configured in application:
- API: 100 requests per 15 minutes
- Auth: 5 requests per 15 minutes

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check PostgreSQL status
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection
psql -h localhost -U aidlink -d aidlink
```

#### Redis Connection Failed

```bash
# Check Redis status
docker-compose ps redis

# Test connection
redis-cli ping
```

#### Workers Not Processing Jobs

```bash
# Check worker logs
docker-compose logs email-worker

# Check Redis queue
redis-cli
> KEYS bullmq:*
```

### Performance Issues

#### Slow Database Queries

```bash
# Enable query logging
# Check slow query log
# Add indexes as needed
```

#### High Memory Usage

```bash
# Check memory usage
docker stats

# Adjust container limits
# Optimize connection pooling
```

## Rollback Procedure

### Docker Compose

```bash
# Stop current version
docker-compose down

# Start previous version
docker-compose up -d --scale api=3
```

### Kubernetes

```bash
# Rollback to previous revision
kubectl rollout undo deployment/aidlink-api

# Check rollback status
kubectl rollout status deployment/aidlink-api
```

## Maintenance Windows

### Scheduled Maintenance

- **Frequency**: Monthly
- **Duration**: 2 hours
- **Notification**: 48 hours in advance
- **Time**: Sunday 2:00 AM UTC

### Maintenance Checklist

- [ ] Backup database
- [ ] Notify users
- [ ] Deploy updates
- [ ] Run migrations
- [ ] Verify health checks
- [ ] Monitor logs
- [ ] Clear cache
- [ ] Update documentation

## Support & Contact

- **Documentation**: https://docs.aidlink.org
- **Issues**: https://github.com/your-org/aidlink-backend/issues
- **Email**: support@aidlink.org
- **Slack**: #aidlink-backend
