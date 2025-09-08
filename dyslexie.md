# Dyslexia Assessment and Management System - Project Overview

## Project Purpose
This is a comprehensive web-based system designed to assess, track, and manage dyslexia interventions for students. The system facilitates collaboration between teachers, doctors (specialists), and parents through a structured **7-stage assessment and intervention process**.

---

## Technology Stack

### Backend
- **Framework**: Django REST Framework (Python)  
- **Database**: PostgreSQL  
- **Authentication**: JWT (JSON Web Tokens) using `rest_framework_simplejwt`  
- **API**: RESTful API architecture  

### Frontend
- **Framework**: React.js  
- **Routing**: React Router DOM  
- **HTTP Client**: Axios  
- **Styling**: Tailwind CSS  
- **State Management**: React Hooks (`useState`, `useEffect`)  

---

## System Architecture

### User Roles
The system supports three distinct user roles:
- **Teacher** – Initiates assessments, manages handwriting samples, assigns marks  
- **Doctor/Specialist** – Defines tasks, sets cutoffs, assigns therapy activities, provides evaluations  
- **Parent** – Tracks activities, monitors progress  

### Core Models

#### User Management
- **User**: Base user model with roles (teacher, doctor, parent)  
- **Student**: Student profiles managed by teachers  
- **StudentUserLink**: Many-to-many relationship linking students to multiple users (teachers, doctors, parents)  

#### Assessment System
- **StageProgress**: Tracks current stage and completed stages for each student  
- **HandwritingSample**: Stores handwriting samples uploaded by teachers  
- **StudentTask**: Manages tasks and scoring for students  

---

## 7-Stage Assessment Workflow

1. **Stage 1: Handwriting Sample (Teacher)**  
   - Teachers upload handwriting samples  
   - Initial assessment entry point  

2. **Stage 2: Define Tasks (Doctor)**  
   - Doctors/specialists define assessment tasks  
   - Task parameters and criteria setup  

3. **Stage 3: Assign Marks (Teacher)**  
   - Teachers evaluate and score the defined tasks  
   - Quantitative assessment phase  

4. **Stage 4: Cutoff & Summary (Doctor)**  
   - Doctors set scoring thresholds  
   - Generate assessment summaries  

5. **Stage 5: Assign Activities (Doctor)**  
   - Prescription of intervention activities  
   - Customized therapy recommendations  

6. **Stage 6: Activity Tracking (Teacher/Parent)**  
   - Monitor activity completion  
   - Progress tracking and reporting  

7. **Stage 7: Evaluation Summary (Doctor)**  
   - Final assessment and recommendations  
   - Comprehensive evaluation report  

---

## Key Features

### Role-Based Access Control
- Each stage is restricted to specific user roles  
- Dynamic UI based on user permissions  
- Stage progression controls  

### Progress Management
- Sequential stage unlocking  
- Completion tracking  
- Visual progress indicators  

### Multi-User Collaboration
- Students can be linked to multiple doctors and parents  
- Email-based user assignment system  
- Collaborative workflow management  

### Authentication System
- JWT-based authentication  
- Role information embedded in tokens  
- Secure API endpoints  

---

## File Structure

### Backend (`users`)
- **models.py** – Database models  
- **serializers.py** – API serializers with custom JWT token handling  
- **views.py** – API endpoints (implied)  

### Frontend (`src`)
- **pages/StudentProgressWindow.jsx** – Main progress tracking interface  
- **components/spw_stages/** – Individual stage components  
  - **Stage1.jsx** – Handwriting sample component  
  - **Stage2.jsx** – Task definition component  
  - *(Additional stages implied)*  

---

## System Workflow

1. **Student Registration**: Teachers create student profiles and assign doctors/parents  
2. **Stage Progression**: Users complete stages in sequence based on their roles  
3. **Collaborative Assessment**: Multiple professionals contribute to each student's assessment  
4. **Progress Tracking**: Real-time progress monitoring across all stages  
5. **Intervention Management**: Structured activity assignment and tracking  
6. **Final Evaluation**: Comprehensive assessment summary and recommendations  

---

## Security Features
- JWT token authentication  
- Role-based authorization  
- Protected API endpoints  
- User session management  

---

## Current Development Status
The system appears to be in active development with:
- Core authentication and user management implemented  
- Basic stage progression logic in place  
- Frontend-backend integration established  
- Stage 1 and 2 components developed  
- Remaining stages (3-7) likely in development  

This system represents a comprehensive solution for dyslexia assessment and management, facilitating structured collaboration between educational and medical professionals while keeping parents informed and involved in the intervention process.

---

# Complete User Flow for Dyslexia Assessment System

## 1. User Registration

### User Registration Setup
- **Initial User Creation**: Users can register with their email, phone, name, password, etc.  
- **Role Assignment**: Each user should select their specific role during registration  

### User Authentication Flow
- **Login Process**:  
  - User enters username/password  
  - System validates credentials  
  - JWT token generated with user role embedded  
  - Token stored in localStorage  
  - User redirected to role-specific dashboard  

---

## 2. Teacher User Flow

### A. Student Registration & Setup
- Access Teacher Dashboard (`/teacher/students`)  
- **Create New Student**:  
  - Enter student details (name, birthday, school, grade, gender)  
  - Assign doctor(s) by email addresses  
  - Assign parent(s) by email addresses  
  - System creates `StudentUserLink` relationships  
- **Student Profile Created**:  
  - Initial `StageProgress` created (stage 1, no completed stages)  
  - Student appears in teacher's student list  

### B. Stage 1: Handwriting Sample Upload
- Select Student from dashboard  
- Navigate to Student Progress Window (`/student-progress/{student_id}`)  
- **Upload Handwriting Sample**:  
  - Access Stage 1 (only unlocked stage initially)  
  - Upload handwriting sample files  
  - Add assessment notes  
  - Mark Stage 1 as complete  
- **Stage Progression**:  
  - Stage 1 marked as completed  
  - Stage 2 unlocked for doctor access  
  - Teacher can no longer edit Stage 1  

### C. Stage 3: Assign Marks (After Doctor Completes Stage 2)
- Receive Notification (implied) that Stage 2 is complete  
- **Access Stage 3**:  
  - View tasks defined by doctor in Stage 2  
  - Assign scores for each task  
  - Provide assessment comments  
  - Mark Stage 3 as complete  
- **Progress Update**:  
  - Stage 3 completed  
  - Stage 4 unlocked for doctor  

### D. Stage 6: Activity Tracking (Shared with Parents)
- Access Stage 6 after doctor completes Stage 5  
- **Monitor Student Activities**:  
  - View activities assigned by doctor  
  - Track completion status  
  - Update progress notes  
  - Coordinate with parents for home activities  
- **Progress Reporting**:  
  - Regular updates on activity completion  
  - Prepare for final evaluation stage  

---

## 3. Doctor User Flow

### A. Initial Access
- Login to Doctor Dashboard (`/doctor/students`)  
- **View Assigned Students**:  
  - See students assigned by teachers  
  - Check current stage progress  
  - Access students ready for doctor intervention  

### B. Stage 2: Define Tasks
- Access Student Progress when Stage 1 is completed  
- **Define Assessment Tasks**:  
  - Review handwriting sample from Stage 1  
  - Create specific assessment tasks  
  - Set task parameters and criteria  
  - Define scoring methodology  
  - Mark Stage 2 as complete  
- **Workflow Progression**:  
  - Stage 2 completed  
  - Stage 3 unlocked for teacher  

### C. Stage 4: Cutoff & Summary
- Access Stage 4 after teacher completes Stage 3  
- **Set Assessment Thresholds**:  
  - Review scores from Stage 3  
  - Set cutoff points for dyslexia indicators  
  - Generate preliminary assessment summary  
  - Make initial diagnostic determinations  
  - Mark Stage 4 as complete  
- **Progress Update**:  
  - Stage 4 completed  
  - Stage 5 unlocked  

### D. Stage 5: Assign Activities
- Access Stage 5 immediately after Stage 4  
- **Prescribe Interventions**:  
  - Based on Stage 4 assessment results  
  - Assign specific therapeutic activities  
  - Set activity schedules and targets  
  - Provide instructions for teachers/parents  
  - Mark Stage 5 as complete  
- **Workflow Progression**:  
  - Stage 5 completed  
  - Stage 6 unlocked for teachers/parents  

### E. Stage 7: Final Evaluation
- Access Stage 7 after Stage 6 completion  
- **Comprehensive Assessment**:  
  - Review all previous stages  
  - Analyze activity completion data  
  - Generate final diagnostic report  
  - Provide long-term recommendations  
  - Create intervention plan  
  - Mark Stage 7 as complete  
- **Case Closure**:  
  - Complete assessment cycle  
  - Generate final reports for all stakeholders  

---

## 4. Parent User Flow

### A. Initial Access
- Login to Parent Dashboard (`/parent/students`)  
- **View Child's Progress**:  
  - See assigned children  
  - Check current assessment stage  
  - Access progress details  

### B. Monitoring Throughout Process
- **Stages 1-5 (View-Only)**:  
  - Monitor progress through professional stages  
  - View completed assessments  
  - Receive updates on child's status  

### C. Stage 6: Activity Tracking (Shared Role)
- Access Stage 6 when unlocked  
- **Home Activity Management**:  
  - View activities assigned by doctor  
  - Track home-based interventions  
  - Update completion status  
  - Coordinate with teacher for school activities  
  - Provide feedback on child's response  
- **Progress Collaboration**:  
  - Regular communication with teacher  
  - Report on home progress  
  - Prepare for final evaluation  

### D. Final Review
- Access Stage 7 Results (view-only)  
- **Review Final Assessment**:  
  - Understand diagnostic conclusions  
  - Review intervention recommendations  
  - Plan future support strategies  

---

## 5. System-Wide Flow Features

### Stage Progression Logic
- Sequential Unlocking: Stages unlock only when previous stage is completed  
- Role-Based Access: Each stage restricted to appropriate user roles  
- Completion Tracking: System tracks which stages are completed vs. in-progress  

### Navigation Flow
- Role-Based Dashboards: Users land on appropriate dashboard after login  
- Dynamic Navigation: Back buttons route to correct dashboard based on user role  
- Progress Indicators: Visual stage progress shown to all users  

### Data Flow
- **Stage 1**: Teacher uploads → handwriting data stored  
- **Stage 2**: Doctor reviews → tasks defined  
- **Stage 3**: Teacher scores → assessment data collected  
- **Stage 4**: Doctor analyzes → cutoffs and summary generated  
- **Stage 5**: Doctor prescribes → activities assigned  
- **Stage 6**: Teacher/Parent execute → activity completion tracked  
- **Stage 7**: Doctor evaluates → final assessment completed  

### Collaboration Points
- Teacher-Doctor: Stages 1→2→3→4→5  
- Doctor-Teacher: Stages 2→3 and 5→6  
- Teacher-Parent: Stage 6 collaboration  
- All Stakeholders: Stage 7 final review  

---

## 6. Error Handling & Edge Cases

### Access Control
- Users cannot access stages not assigned to their role  
- Locked stages prevent premature progression  
- Completed stages become view-only  

### Authentication Issues
- Token expiration redirects to login  
- Invalid roles prevent system access  
- Missing permissions show appropriate messages  

### Data Validation
- Required fields prevent stage completion  
- File upload validation for handwriting samples  
- Score validation in marking stages  
