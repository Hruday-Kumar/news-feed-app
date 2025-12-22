# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-22

### Added
- **User Authentication**: Sign up and login with JWT tokens
- **Personalized Feed**: News based on user's saved topics
- **Topic Management**: Save, remove, and manage news topics
- **Favorites System**: Bookmark articles for later reading
- **Infinite Scroll**: Auto-load more articles with pagination
- **Production Deployment**: Render.com configuration with health checks
- **Environment Configuration**: Proper env file setup for dev/prod
- **Global Error Handling**: Consistent error responses
- **Logging System**: Structured logging for debugging

### Changed
- Upgraded to Next.js 16 with React 19
- Migrated to Zustand 5 for state management
- Updated Tailwind CSS to v4
- Improved CORS configuration for production
- Enhanced API response formats

### Security
- JWT token authentication with configurable expiry
- bcrypt password hashing (12 rounds)
- Configurable CORS origins
- Production-safe error messages

### Infrastructure
- Render.com blueprint configuration
- Health check endpoints (/health, /ready)
- Gunicorn production server with Uvicorn workers
- Auto-deploy on push to main branch

## [1.0.0] - 2024-11-15

### Added
- Initial release
- TikTok-style vertical news feed
- News search functionality
- Swipe navigation with Framer Motion
- Basic GNews API integration
- Mobile-first responsive design

---

## Upgrade Guide

### From 1.x to 2.x

1. **Environment Variables**: Create `.env` files from `.env.example`
2. **Backend**: Install new dependencies with `pip install -r requirements.txt`
3. **Frontend**: Run `npm install` to update packages
4. **Database**: User data is now stored in `backend/data/users.json`

### Breaking Changes
- API endpoints restructured for authentication
- Feed response format updated with pagination
- Store structure changed for auth state
