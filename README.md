# TruthLens AI – Fake News & Deepfake Detection

An enterprise multi-platform artificial intelligence system designed for detecting fake news articles, image deepfakes, video frame manipulation, and domain phishing verification.

---

## 🌟 Tech Stack

### Web Application
- **Frontend**: React.js, Tailwind CSS, HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js REST API
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: Email/Password, Google OAuth 2.0, JWT Tokens

### Mobile Application
- **Framework**: React Native (Expo SDK)
- **Platforms**: Android (API 30 - 34)

### AI & Computer Vision Models
- **Fake News Classifier**: NLP Claim Evaluation & Sentiment Analysis Engine
- **Image Deepfake Detector**: Error Level Analysis (ELA) & Frequency Domain Heatmaps
- **Video Deepfake Analyzer**: Temporal Frame Extraction & Spatial Manipulation Check
- **URL Verification**: WHOIS Domain Reputation & Phishing Risk Scoring

### DevOps & Infrastructure
- **Containerization**: Docker, Docker Compose
- **Container Registry**: Docker Hub (`maniyar123/truthlens-backend`, `maniyar123/truthlens-frontend`)
- **CI/CD Pipeline**: GitHub Actions (`.github/workflows/docker-pipeline.yml`)
- **Orchestration**: Kubernetes Manifests (`k8s/`)

---

## 📂 Repository Structure

```
PDD/
├── truthlens-ai-web/
│   ├── backend/             # Node.js Express REST API & AI Pipelines
│   ├── frontend/            # React.js Web Portal UI
│   ├── k8s/                 # Kubernetes Deployments & Services
│   ├── Dockerfile           # Web Root Dockerfile
│   ├── docker-compose.yml   # Multi-container Docker Compose setup
│   └── package.json
│
├── truthlens-ai-mobile/     # React Native / Expo Android App
│   ├── src/                 # Application Screens & Components
│   ├── android/             # Android Native Build Settings
│   ├── assets/              # App Branding Assets
│   ├── app.json             # Expo Configuration
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── docker-pipeline.yml # Automated CI/CD GitHub Actions
│
├── TruthLens_AI_Test_Report.xlsx # 4,500 Test Cases Automated QA Master Report
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Backend Server
```bash
cd truthlens-ai-web/backend
npm install
npm run dev
```

### 2. Frontend Web Portal
```bash
cd truthlens-ai-web/frontend
npm install
npm start
```

### 3. Mobile App (Android Expo)
```bash
cd truthlens-ai-mobile
npm install
npx expo start
```

### 4. Docker Compose
```bash
cd truthlens-ai-web
docker-compose up --build
```

### 5. Kubernetes Deployment
```bash
kubectl apply -f truthlens-ai-web/k8s/
```
