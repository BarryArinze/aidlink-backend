# AidLink Backend Architecture

## Overview

AidLink Backend is a production-grade, scalable backend system powering the AidLink humanitarian aid platform. It's built on modern technologies with a focus on security, performance, and blockchain integration.

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis with BullMQ
- **Real-time**: WebSockets (Socket.io)
- **Blockchain**: Soroban/Stellar
- **Containerization**: Docker & Docker Compose

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│                    (Frontend, Mobile Apps)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTPS / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Express    │  │   Rate Limit │  │   Security   │      │
│  │   Server     │  │   Middleware │  │   Middleware │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Auth Service│  │Campaign Svc  │  │Beneficiary   │      │
│  └──────────────┘  └──────────────┘  │   Service    │      │
│  ┌──────────────┐  ┌──────────────┐  └──────────────┘      │
│  │ Donation Svc │  │Distribution  │  ┌──────────────┐      │
│  └──────────────┘  │   Service    │  │Notification  │      │
│  ┌──────────────┐  └──────────────┘  │   Service    │      │
│  │Blockchain Idx│                      └──────────────┘      │
│  └──────────────┘                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│   PostgreSQL    │ │    Redis     │ │   BullMQ     │
│   (Prisma)      │ │   (Cache)    │ │   (Queues)   │
└──────────────────┘ └──────────────┘ └──────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Soroban    │  │   Email      │  │   KYC        │      │
│  │   Network    │  │   Service    │  │   Provider   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Core Systems

### 1. Authentication System

**Components:**
- JWT-based authentication
- Wallet-based authentication (Stellar/Soroban)
- Role-based access control (RBAC)
- Session management with Redis

**Flow:**
```
Client → Login Request → Auth Service → Validate Credentials → Generate JWT → Store Session → Return Token
```

### 2. Campaign Engine

**Components:**
- Campaign creation and management
- Real-time fund tracking
- Beneficiary assignment
- Distribution tracking
- Milestone management

**Flow:**
```
Organization → Create Campaign → Assign Beneficiaries → Receive Donations → Track Funds → Distribute to Beneficiaries
```

### 3. Beneficiary Verification

**Components:**
- KYC workflow integration
- Fraud detection algorithms
- Verification queue with BullMQ
- Risk scoring system

**Flow:**
```
Beneficiary → Submit KYC → Queue for Review → Risk Assessment → Manual/Auto Review → Approve/Reject
```

### 4. Blockchain Indexer

**Components:**
- Soroban event listeners
- Transaction indexing
- Contract synchronization
- Real-time blockchain monitoring

**Flow:**
```
Soroban Network → Event Listener → Index Transaction → Store in DB → Trigger Notifications
```

### 5. Notification System

**Components:**
- Email notifications (Nodemailer)
- Real-time alerts (WebSockets)
- Push notification support
- Notification preferences

**Flow:**
```
Event → Create Notification → Queue Email Job → Send Email → WebSocket Update → Mark as Read
```

## Database Schema

### Key Entities

- **Users**: User accounts with roles and authentication
- **Organizations**: Aid organizations managing campaigns
- **Campaigns**: Fundraising campaigns with milestones
- **Donations**: Transaction records for contributions
- **Beneficiaries**: Aid recipients with verification status
- **Distributions**: Fund transfers to beneficiaries
- **KYCSubmissions**: Verification documents and status
- **BlockchainTransactions**: Indexed blockchain transactions
- **ContractEvents**: Smart contract events
- **Notifications**: User notifications
- **AuditLogs**: System audit trail

### Relationships

```
User (1) ──< Session (N)
User (1) ──< Organization (1)
User (1) ──< Beneficiary (1)
User (1) ──< Donation (N)
User (1) ──< Campaign (N)
Organization (1) ──< Campaign (N)
Campaign (1) ──< Donation (N)
Campaign (1) ──< BeneficiaryAssignment (N)
Campaign (1) ──< Distribution (N)
Beneficiary (1) ──< BeneficiaryAssignment (N)
Beneficiary (1) ──< Distribution (N)
Beneficiary (1) ──< KYCSubmission (N)
```

## API Design

### RESTful Endpoints

- **Authentication**: `/api/v1/auth/*`
- **Campaigns**: `/api/v1/campaigns/*`
- **Donations**: `/api/v1/donations/*`
- **Beneficiaries**: `/api/v1/beneficiaries/*`
- **Distributions**: `/api/v1/distributions/*`
- **Notifications**: `/api/v1/notifications/*`

### API Versioning

All endpoints are versioned using the `/api/v1/` prefix to support future API evolution without breaking changes.

### Documentation

Interactive API documentation is available at `/api/docs` using Swagger/OpenAPI.

## Security Architecture

### Security Layers

1. **Transport Layer**: HTTPS/TLS encryption
2. **Application Layer**: Helmet.js security headers
3. **Authentication**: JWT with short-lived access tokens
4. **Authorization**: Role-based access control
5. **Rate Limiting**: Request throttling per endpoint
6. **Input Validation**: Zod schema validation
7. **Audit Logging**: All actions logged for compliance

### Data Protection

- Passwords hashed with bcrypt
- Sensitive data encrypted at rest
- PII stored securely with access controls
- Regular security audits

## Scalability Architecture

### Horizontal Scaling

- Stateless API servers
- Redis for shared session storage
- Database connection pooling
- Load balancer ready

### Background Processing

- BullMQ for job queues
- Separate worker processes
- Redis-backed job persistence
- Automatic retry mechanism

### Caching Strategy

- Redis for session caching
- Query result caching
- API response caching
- Cache invalidation on updates

## Deployment Architecture

### Docker Compose (Development)

```
┌─────────────────────────────────────┐
│         Docker Network              │
│  ┌──────────┐  ┌──────────┐       │
│  │  API     │  │  Redis   │       │
│  │  Server  │  │          │       │
│  └──────────┘  └──────────┘       │
│  ┌──────────┐  ┌──────────┐       │
│  │  Email   │  │  KYC     │       │
│  │  Worker  │  │  Worker  │       │
│  └──────────┘  └──────────┘       │
│  ┌──────────┐  ┌──────────┐       │
│  │ Blockchain│  │  Postgres│      │
│  │  Worker   │  │          │      │
│  └──────────┘  └──────────┘       │
└─────────────────────────────────────┘
```

### Production Deployment

- Container orchestration (Kubernetes recommended)
- Managed PostgreSQL (AWS RDS, Google Cloud SQL)
- Managed Redis (AWS ElastiCache, Google Cloud Memorystore)
- CDN for static assets
- Load balancer with SSL termination
- Monitoring and alerting (Prometheus, Grafana)

## Monitoring & Observability

### Logging

- Structured logging with Winston
- Log levels: error, warn, info, debug
- Log aggregation in production
- Sensitive data redaction

### Health Checks

- `/health` endpoint for liveness
- Database connectivity checks
- Redis connectivity checks
- Worker process monitoring

### Metrics

- Request/response times
- Error rates
- Queue lengths
- Database query performance
- Blockchain sync status

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration

# Run load tests
npm run test:load
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## CI/CD Pipeline

### GitHub Actions

1. **Test Stage**: Run unit and integration tests
2. **Build Stage**: Build Docker image
3. **Push Stage**: Push to Docker registry
4. **Deploy Stage**: Deploy to production

### Branch Strategy

- `main`: Production branch
- `develop`: Development branch
- Feature branches: `feature/*`
- Hotfix branches: `hotfix/*`

## Performance Optimization

### Database

- Indexed queries
- Connection pooling
- Query optimization
- Read replicas for scaling

### API

- Response compression
- Pagination
- Field selection
- Caching headers

### Caching

- Redis for hot data
- CDN for static content
- Browser caching
- Edge caching

## Disaster Recovery

### Backup Strategy

- Daily database backups
- Point-in-time recovery
- Backup encryption
- Off-site backup storage

### High Availability

- Multi-region deployment
- Database failover
- Redis clustering
- Load balancer redundancy

## Compliance

### Data Protection

- GDPR compliance
- Data retention policies
- Right to be forgotten
- Data portability

### Audit Trail

- All user actions logged
- Immutable audit logs
- Regular audit reviews
- Compliance reporting
