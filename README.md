# EduLearn 🎓  
AI-Powered Learning & Practice Platform with Secure API Integration  

📺 **Demo Video**: [Watch here](https://youtu.be/RM3YPz_LqAE?feature=shared)  
🌍 **Live Deployment**: [EduLearn on Render](https://edulearn-48sl.onrender.com)  

---

## ✨ Overview  
EduLearn is a full-stack learning platform that makes Data Structures & Algorithms (DSA) education engaging and accessible.  
It combines **AI-powered quizzes**, **practice problems**, and **progress tracking** into one seamless platform.  

The entire application (frontend + backend) is hosted on **Render** via a single Express.js server.  

### 🌍 Real-World Impact  
EduLearn addresses the struggles faced by students in preparing for coding interviews and competitive exams.  
It helps learners build strong problem-solving habits, track their progress visually, and practice with AI-generated quizzes that simulate real interview questions.  
By integrating **secure authentication with Descope**, it ensures a safe and seamless experience, making it practical for both individual learners and institutions.  

---

## 🌟 Key Features  
- 📚 **Topic Explorer** – Learn JavaScript, Python, Algorithms, DSA  
- 🎯 **Streak Tracking** – Build daily coding habits  
- 🤖 **AI-Powered Quizzes** – Auto-generated quizzes with instant feedback (via Perplexity API)  
- 📊 **Progress Dashboard** – Visualize learning journey with charts  
- 🧩 **Practice Page** – Hands-on problem solving  
- 🔐 **Secure Authentication** – JWT + Descope Outbound Apps  
- 🌍 **Deployment** – One-click hosting on Render  

---
## 🏗 Architecture

```plaintext
EduLearn/
 ├── public/                # Frontend: HTML, CSS, JS
 │   ├── css/               # Stylesheets
 │   ├── js/                # Client-side logic
 │   └── index.html         # Main entry page
 ├── server/                # Backend
 │   └── server.js          # Express server (all routes & logic here)
 ├── package.json
 ├── package-lock.json
 ├── .env.example
 ├── .gitignore
 └── README.md
```


## 🛠 Technology Stack  
- **Frontend**: HTML, CSS, JavaScript (Vanilla + Chart.js)  
- **Backend**: Node.js, Express.js (single `server.js`)  
- **Database**: MongoDB Atlas  
- **Authentication**: JWT + Descope Outbound Apps  
- **AI Integration**: Perplexity API  
- **Deployment**: Render (serves both frontend & backend)  

---
## 🚀 Setup & Running Guide  

### Step 1: Clone Repository  
```bash
git clone https://github.com/v-ijay-krishna/EduLearn.git
cd EduLearn
```
Step 2: Install Dependencies
npm install

Step 3: Environment Variables

PORT=3000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

PERPLEXITY_API_KEY=your_api_key

RATE_LIMIT_WINDOW=15

RATE_LIMIT_MAX=100

JWT_EXPIRES_IN=1d

Step 4: Run Locally
npm run dev

App available at: http://localhost:3000

📊 API Endpoints

POST /api/auth/register → Register new user

POST /api/auth/login → Login and get JWT

POST /api/quiz/generate → Generate AI quiz (Perplexity)

POST /api/quiz/submit → Submit quiz results

GET /api/user/progress → Fetch user progress

GET /api/practice → Fetch practice problems

🧪 Testing Checklist

✅ Backend starts without errors

✅ Frontend loads (served by Express from /public)

✅ User register/login works

✅ Quizzes generate dynamically via AI

✅ Progress/streak dashboard updates

✅ Practice Page loads successfully

🎯 Hackathon Compliance

✅ Theme 1: Agent that addresses a real-world need with secure API integration

✅ Uses Descope Outbound Apps to authenticate with external API (Perplexity)

✅ No hardcoded API keys/tokens

✅ Solves a real-world problem: helping students practice DSA effectively

✅ Seamless experience with minimal setup for end-users

🔮 Roadmap

🏆 Add leaderboards & competitive mode

📚 Expand to System Design, DBMS, OS modules

📱 Create mobile-friendly PWA version

🔗 Add GitHub integration for practice suggestions

📄 License

This project is licensed under the MIT License – free to use and modify.

🏆 Achievement Summary

🥇 Secure API integration with Descope

🤖 AI-driven quizzes & progress tracking

📊 Visual learning dashboard

🔒 JWT authentication

⚡ Single Render deployment (backend + frontend)

Built with ❤️ to make DSA learning engaging & fun 🚀
 






