# Dyslexia Assessment and Management System

A comprehensive web-based platform for collaborative dyslexia assessment, intervention planning, and progress tracking. This system facilitates structured collaboration between teachers, doctors, and parents in the assessment and management of dyslexia cases.

## 🎯 Overview

The Dyslexia Assessment and Management System is designed to streamline the process of dyslexia diagnosis and intervention through a structured 7-stage workflow:

1. **Handwriting Sample Upload** (Teacher)
2. **Task Definition** (Doctor) 
3. **Assessment Scoring** (Teacher)
4. **Cutoff Analysis & Summary** (Doctor)
5. **Activity Assignment** (Doctor)
6. **Activity Tracking** (Teacher/Parent)
7. **Final Evaluation** (Doctor)

## ✨ Key Features

### 🔐 **Role-Based Access Control**
- **Teachers**: Student management, handwriting uploads, assessment scoring, activity tracking
- **Doctors**: Medical supervision, task definition, cutoff analysis, activity prescription, final evaluation
- **Parents**: Progress monitoring, home activity tracking, collaboration with teachers

### 📊 **Assessment & Analytics**
- AI-powered handwriting analysis using CNN models
- Structured assessment workflow with stage progression
- Real-time progress tracking and reporting
- Comprehensive therapy session management
- Statistical dashboards for all user roles

### 🤝 **Collaborative Features**
- Multi-user student assignments (teachers, doctors, parents)
- Email-based user linking system
- Real-time session management with auto-expiration alerts
- Secure JWT-based authentication

### 📱 **Modern UI/UX**
- Responsive design with Tailwind CSS
- Intuitive stage-based navigation
- Real-time notifications and alerts
- Comprehensive reporting system

## 🏗️ System Architecture

### **Backend**
- **Framework**: Django REST Framework
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT with refresh token support
- **API**: RESTful APIs with role-based permissions

### **Frontend** 
- **Framework**: React 18 with Vite
- **UI Library**: Tailwind CSS
- **State Management**: Context API
- **Routing**: React Router DOM

### **AI/ML Component**
- **Framework**: FastAPI
- **Model**: Custom CNN for dyslexia prediction
- **Image Processing**: PIL, OpenCV
- **Model Format**: PyTorch (.pth)

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### 1. Clone Repository
```bash
git clone https://github.com/ghstkillrD/dyslexie.git
cd dyslexie
```

### 2. Backend Setup (Django)
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\\Scripts\\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```
The Django backend will be available at `http://127.0.0.1:8000`

### 3. Frontend Setup (React)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
The React frontend will be available at `http://localhost:5173`

### 4. AI/ML Service Setup (FastAPI)
```bash
# Navigate to ML service directory
cd fastapi-ml

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --port 8001
```
The FastAPI service will be available at `http://127.0.0.1:8001`

## 📁 Project Structure

```
dyslexie/
├── backend/                 # Django configuration
│   ├── settings.py         # Django settings
│   ├── urls.py            # URL routing
│   └── wsgi.py            # WSGI configuration
├── users/                  # Main Django app
│   ├── models.py          # Database models
│   ├── views.py           # API endpoints
│   ├── serializers.py     # API serializers
│   └── urls.py            # App URLs
├── chat/                   # WebSocket chat functionality
├── frontend/               # React application
│   ├── src/
│   │   ├── pages/         # Main pages
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   └── store/         # Context providers
│   └── public/            # Static assets
├── fastapi-ml/            # AI/ML service
│   ├── main.py           # FastAPI application
│   ├── models/           # ML models and schemas
│   └── utils/            # Utility functions
├── scripts/              # Utility scripts
│   ├── create_sample_data.py
│   ├── migrate_to_cloudinary.py
│   └── test_cloudinary.py
├── media/                # User uploaded files
├── manage.py             # Django management
└── requirements.txt      # Python dependencies
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Django Settings
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (for production)
DATABASE_URL=your-database-url

# Cloudinary (for production file storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# JWT Settings
JWT_ACCESS_TOKEN_LIFETIME=60  # minutes
JWT_REFRESH_TOKEN_LIFETIME=7  # days
```

### Development vs Production
- **Development**: Uses SQLite database and local file storage
- **Production**: Recommended to use PostgreSQL and Cloudinary for file storage

## 👥 User Roles & Permissions

### Teacher
- Create and manage student profiles
- Upload handwriting samples (Stage 1)
- Assign assessment scores (Stage 3)
- Track student activities (Stage 6)
- View therapy reports

### Doctor  
- Define assessment tasks (Stage 2)
- Perform cutoff analysis (Stage 4)
- Assign therapeutic activities (Stage 5)
- Conduct final evaluations (Stage 7)
- Complete therapy sessions

### Parent
- Monitor child's progress
- Track home-based activities (Stage 6)
- View assessment reports
- Collaborate with teachers

## 🔗 API Endpoints

### Authentication
- `POST /api/users/register/` - User registration
- `POST /api/users/token/` - Login (obtain tokens)
- `POST /api/users/token/refresh/` - Refresh access token
- `POST /api/users/token/extend/` - Extend session

### Students
- `GET /api/users/students/` - List assigned students
- `POST /api/users/students/` - Create new student
- `GET /api/users/students/{id}/` - Student details
- `POST /api/users/students/{id}/link_user/` - Link user to student

### Assessment Stages
- `GET /api/users/students/{id}/stage-progress/` - Get stage progress
- `POST /api/users/students/{id}/handwriting-samples/` - Upload handwriting (Stage 1)
- `POST /api/users/students/{id}/tasks/` - Create tasks (Stage 2)
- `POST /api/users/students/{id}/assessment-summary/` - Assessment summary (Stage 4)
- `POST /api/users/students/{id}/activity-assignments/` - Assign activities (Stage 5)

## 🧪 Testing

### Run Backend Tests
```bash
python manage.py test
```

### Run Frontend Tests
```bash
cd frontend
npm test
```

### Load Sample Data
```bash
python scripts/create_sample_data.py
```

## 🚀 Deployment

### Production Checklist
1. Set `DEBUG=False` in settings
2. Configure production database (PostgreSQL)
3. Set up Cloudinary for file storage
4. Configure proper `ALLOWED_HOSTS`
5. Set up HTTPS
6. Configure static file serving
7. Set up proper logging

### Environment Setup
Refer to `scripts/cloud_storage_config.py` for production cloud storage configuration.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint and Prettier for JavaScript/React code
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📋 Requirements

### Backend Dependencies
- Django 4.2+
- Django REST Framework
- django-cors-headers
- djangorestframework-simplejwt
- Pillow (for image processing)
- python-decouple (for environment variables)

### Frontend Dependencies
- React 18
- React Router DOM
- Axios (for API calls)
- Tailwind CSS
- Vite (build tool)

### AI/ML Dependencies
- FastAPI
- PyTorch
- OpenCV
- Pillow
- NumPy

## 📞 Support

For questions, issues, or contributions, please:
1. Check existing [GitHub Issues](https://github.com/ghstkillrD/dyslexie/issues)
2. Create a new issue with detailed description
3. Contact the development team

## 📄 License

This project is part of a research initiative for dyslexia assessment and management. Please refer to the license file for usage terms.

## 🙏 Acknowledgments

- Research team at University of Kelaniya
- Contributors to the dyslexia assessment methodology
- Open source community for the tools and frameworks used

---

**Note**: This system is designed for educational and research purposes. Always consult with qualified medical professionals for dyslexia diagnosis and treatment decisions.
