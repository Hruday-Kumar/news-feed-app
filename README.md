# 📱 Briefly - TikTok-Style News App

> A modern, vertical-scrolling news feed application with personalization features. Built with Next.js 16 + FastAPI.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/yourusername/news-tiktok-app)

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-20.x-brightgreen.svg)
![Python](https://img.shields.io/badge/python-3.11-blue.svg)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📰 **Vertical News Feed** | TikTok-style swipe navigation |
| 🔄 **Infinite Scroll** | Auto-loads more content as you scroll |
| 🔐 **User Authentication** | Sign up, login with JWT tokens |
| 📌 **Save Topics** | Personalize your news feed |
| ⭐ **Favorites** | Bookmark articles for later |
| 🎨 **Modern UI** | Glass-morphism design with smooth animations |
| 📱 **Mobile First** | Responsive design for all devices |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                    │
│  React 19 • Zustand • Framer Motion • Tailwind CSS         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                        │
│  Python 3.11 • JWT Auth • bcrypt • httpx                   │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼                           ▼
┌─────────────────────┐       ┌─────────────────────┐
│   JSON File Storage │       │     GNews API       │
│   (users.json)      │       │   (News Source)     │
└─────────────────────┘       └─────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x
- Python 3.11+
- npm or yarn
- GNews API Key ([Get free key](https://gnews.io))

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/news-tiktok-app.git
cd news-tiktok-app

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Edit with your API keys
uvicorn main:app --reload --port 8000

# Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env.local  # Edit with backend URL
npm run dev
```

Visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📁 Project Structure

```
news-tiktok-app/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment template
│   └── data/
│       └── users.json       # User data storage
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/api/    # API clients
│   │   ├── store/           # Zustand stores
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── .env.example
├── render.yaml              # Render deployment config
└── README.md
```

---

## 🔧 Environment Variables

### Backend (.env)

```env
# Required
GNEWS_API_KEY=your_gnews_api_key_here

# Security (auto-generated in production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Optional
PORT=8000
ENVIRONMENT=development
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🌐 Deployment (Render.com)

### One-Click Deploy

1. Fork this repository
2. Click the "Deploy to Render" button above
3. Connect your GitHub account
4. Set environment variables:
   - `GNEWS_API_KEY`: Your GNews API key
5. Deploy!

### Manual Deploy

1. Create a new **Blueprint** on Render
2. Connect your GitHub repository
3. Render will auto-detect `render.yaml`
4. Set the required environment variables
5. Deploy both services

### Environment Variables on Render

| Service | Variable | Value |
|---------|----------|-------|
| Backend | `GNEWS_API_KEY` | Your GNews API key |
| Backend | `JWT_SECRET` | Auto-generated |
| Backend | `ENVIRONMENT` | `production` |
| Frontend | `NEXT_PUBLIC_API_URL` | Auto-linked to backend |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Create account |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Get profile |

### Topics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/topics` | Get saved topics |
| POST | `/topics` | Save a topic |
| DELETE | `/topics/{topic}` | Remove topic |

### Favorites
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/favorites` | Get favorites |
| POST | `/favorites` | Add to favorites |
| DELETE | `/favorites?url=` | Remove favorite |

### News
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/news?q=&page=` | Search news |
| GET | `/feed/personalized` | Personalized feed |

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **State**: Zustand 5
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion 12
- **Validation**: Zod 4
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI
- **Runtime**: Python 3.11
- **Auth**: JWT (python-jose)
- **Password**: bcrypt
- **HTTP**: httpx (async)
- **Server**: Uvicorn + Gunicorn

---

## 📈 Version History

### v2.0.0 (Current)
- ✅ User authentication (signup/login)
- ✅ Personalized news feed
- ✅ Save topics & favorites
- ✅ Infinite scroll pagination
- ✅ JSON file-based storage
- ✅ Render.com deployment ready

### v1.0.0
- Basic news feed
- Search functionality
- TikTok-style UI

---

## 🔒 Security Notes

⚠️ **For Production:**

1. **JWT Secret**: Use a strong, random secret (auto-generated on Render)
2. **CORS**: Update allowed origins for your domain
3. **HTTPS**: Render provides free SSL certificates
4. **Rate Limiting**: Consider adding for API protection
5. **Database**: Migrate to PostgreSQL/MongoDB for production scale

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [GNews API](https://gnews.io) for news data
- [Render](https://render.com) for hosting
- [Vercel](https://vercel.com) for Next.js

---

<p align="center">
  Made with ❤️ by Your Name
</p>
