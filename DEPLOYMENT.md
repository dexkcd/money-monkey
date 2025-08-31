# Production Deployment Guide

This guide covers the complete production deployment process for the Expense Tracker application.

## Prerequisites

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+ recommended) or Windows 10/11
- **Docker**: Version 20.10+ with Docker Compose
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: Minimum 10GB free space
- **Network**: Internet connection for pulling images and API access

### Required Services
- **OpenAI API**: Valid API key with GPT-4 Vision access
- **Domain**: (Optional) Custom domain with SSL certificate
- **Email**: (Optional) SMTP service for notifications

## Quick Start

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd expense-tracker

# Generate production secrets
./scripts/generate-secrets.sh    # Linux/macOS
# OR
scripts\generate-secrets.bat     # Windows
```

### 2. Configure Environment
Edit the generated `.env.prod` file:
```bash
# Required: Add your OpenAI API key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Required: Update with your domain
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
REACT_APP_API_URL=https://yourdomain.com

# Optional: Customize other settings
HTTP_PORT=80
HTTPS_PORT=443
```

### 3. Deploy
```bash
# Full deployment
./scripts/deploy-prod.sh         # Linux/macOS
# OR
scripts\deploy-prod.bat          # Windows
```

### 4. Verify Deployment
- Frontend: http://localhost (or your domain)
- API: http://localhost/api/v1
- Health Check: http://localhost/health

## Detailed Configuration

### Environment Variables

#### Database Configuration
```bash
POSTGRES_DB=expense_tracker_prod          # Database name
POSTGRES_USER=expense_user                # Database user
POSTGRES_PASSWORD=generated_secure_pass   # Auto-generated secure password
```

#### Backend Configuration
```bash
OPENAI_API_KEY=sk-your-key-here          # Required: OpenAI API key
JWT_SECRET_KEY=generated_secret          # Auto-generated JWT secret
JWT_ALGORITHM=HS256                      # JWT signing algorithm
JWT_EXPIRE_MINUTES=30                    # Token expiration time

# File Upload Settings
UPLOAD_DIR=/app/uploads                  # Upload directory path
MAX_FILE_SIZE=10485760                   # Max file size (10MB)
ALLOWED_EXTENSIONS=jpg,jpeg,png,pdf      # Allowed file types

# Security Settings
CORS_ORIGINS=https://yourdomain.com      # Allowed origins for CORS
LOG_LEVEL=INFO                           # Logging level
```

#### Frontend Configuration
```bash
REACT_APP_API_URL=https://yourdomain.com # Backend API URL
```

#### Port Configuration
```bash
HTTP_PORT=80                             # HTTP port
HTTPS_PORT=443                           # HTTPS port (if using SSL)
FRONTEND_PORT=3000                       # Internal frontend port
```

### SSL/HTTPS Configuration

To enable HTTPS:

1. **Obtain SSL Certificate**
   ```bash
   # Using Let's Encrypt (recommended)
   sudo apt install certbot
   sudo certbot certonly --standalone -d yourdomain.com
   
   # Copy certificates
   mkdir -p nginx/ssl
   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
   ```

2. **Update Nginx Configuration**
   Uncomment the HTTPS server block in `nginx/nginx.conf` and update the domain name.

3. **Update Environment Variables**
   ```bash
   CORS_ORIGINS=https://yourdomain.com
   REACT_APP_API_URL=https://yourdomain.com
   ```

## Architecture Overview

### Services
- **nginx**: Reverse proxy and load balancer
- **frontend**: React application served by nginx
- **backend**: FastAPI application with Gunicorn
- **postgres**: PostgreSQL database

### Network Flow
```
Internet → Nginx (Port 80/443) → Frontend (Port 3000) / Backend (Port 8000) → PostgreSQL (Port 5432)
```

### Data Persistence
- **Database**: PostgreSQL data in `postgres_data` volume
- **Uploads**: File uploads in `uploads` volume

## Management Commands

### Deployment Commands
```bash
# Full deployment
./scripts/deploy-prod.sh

# Check health only
./scripts/deploy-prod.sh health

# Run migrations only
./scripts/deploy-prod.sh migrate

# Seed data only
./scripts/deploy-prod.sh seed

# Show status
./scripts/deploy-prod.sh status
```

### Docker Compose Commands
```bash
# View running services
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Management
```bash
# Access database
docker-compose -f docker-compose.prod.yml exec postgres psql -U expense_user -d expense_tracker_prod

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U expense_user expense_tracker_prod > backup.sql

# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U expense_user -d expense_tracker_prod < backup.sql

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## Monitoring and Maintenance

### Health Checks
The application includes comprehensive health checks:
- **Application Health**: `GET /health`
- **Database Connectivity**: Included in health endpoint
- **System Resources**: CPU, memory, disk usage
- **Service Dependencies**: OpenAI API configuration

### Log Management
```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f postgres

# View last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### Performance Monitoring
Monitor these metrics:
- **Response Times**: Check `/health` endpoint response time
- **Database Performance**: Monitor PostgreSQL slow queries
- **Resource Usage**: CPU, memory, disk space
- **Error Rates**: Check application logs for errors

### Backup Strategy
1. **Database Backups**
   ```bash
   # Daily backup script
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U expense_user expense_tracker_prod > "backup_${DATE}.sql"
   ```

2. **File Uploads Backup**
   ```bash
   # Backup uploads directory
   tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
   ```

## Security Considerations

### Network Security
- All services run in isolated Docker network
- Only necessary ports are exposed
- Nginx handles SSL termination
- Rate limiting configured for API endpoints

### Application Security
- JWT tokens for authentication
- Password hashing with bcrypt
- Input validation with Pydantic
- File upload restrictions
- CORS configuration

### Data Security
- Database credentials in environment variables
- Secrets generated with cryptographically secure methods
- File uploads stored securely
- Regular security updates for base images

## Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

#### Database Connection Issues
```bash
# Check database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U expense_user

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Verify environment variables
docker-compose -f docker-compose.prod.yml exec backend env | grep DATABASE_URL
```

#### Application Not Responding
```bash
# Check health endpoint
curl -v http://localhost/health

# Check nginx logs
docker-compose -f docker-compose.prod.yml logs nginx

# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend
```

#### File Upload Issues
```bash
# Check upload directory permissions
docker-compose -f docker-compose.prod.yml exec backend ls -la /app/uploads

# Check disk space
docker-compose -f docker-compose.prod.yml exec backend df -h
```

### Performance Issues
- **High CPU Usage**: Check for inefficient queries or infinite loops
- **High Memory Usage**: Monitor for memory leaks in application code
- **Slow Response Times**: Check database query performance and network latency
- **Disk Space**: Monitor upload directory and database size

### Recovery Procedures

#### Complete System Recovery
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Remove containers and volumes (WARNING: This will delete data)
docker-compose -f docker-compose.prod.yml down -v

# Restore from backup
# ... restore database and uploads from backups ...

# Redeploy
./scripts/deploy-prod.sh
```

#### Database Recovery
```bash
# Stop backend service
docker-compose -f docker-compose.prod.yml stop backend

# Restore database from backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U expense_user -d expense_tracker_prod < backup.sql

# Start backend service
docker-compose -f docker-compose.prod.yml start backend
```

## Scaling Considerations

### Horizontal Scaling
- Use Docker Swarm or Kubernetes for multi-node deployment
- Configure load balancer for multiple backend instances
- Use external database service (AWS RDS, Google Cloud SQL)
- Implement Redis for session storage and caching

### Vertical Scaling
- Increase container resource limits
- Optimize database queries and indexes
- Implement caching strategies
- Use CDN for static assets

## Support and Maintenance

### Regular Maintenance Tasks
- **Weekly**: Check logs for errors and warnings
- **Monthly**: Update base Docker images
- **Quarterly**: Review and update dependencies
- **As Needed**: Apply security patches

### Update Procedure
1. Backup current deployment
2. Test updates in staging environment
3. Deploy updates during maintenance window
4. Verify functionality after deployment
5. Monitor for issues post-deployment

For additional support, check the application logs and health endpoints for diagnostic information.