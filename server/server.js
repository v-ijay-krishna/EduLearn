import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import validator from 'validator';
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // will contain { id: user._id }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX),
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'your-domain.com' : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // ✅ Aggregated statistics
  stats: {
    totalQuizzes: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },

    topicStats: {
      type: Map,
      of: {
        attempts: { type: Number, default: 0 },
        totalScore: { type: Number, default: 0 },
        bestScore: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 }
      },
      default: {}
    }
  },

  // ✅ Detailed quiz history
  quizHistory: [
    {
      topic: { type: String, required: true },
      score: { type: Number, required: true },
      total: { type: Number, required: true },
      difficulty: { type: String, default: 'intermediate' },
      date: { type: Date, default: Date.now }
    }
  ]

}, {
  timestamps: true
});


const quizResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  timeSpent: {
    type: Number,
    required: true
  },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    userAnswer: Number,
    isCorrect: Boolean,
    explanation: String
  }]
}, {
  timestamps: true
});

// Create models
const User = mongoose.model('User', userSchema);
const QuizResult = mongoose.model('QuizResult', quizResultSchema);

// Perplexity API configuration
const PERPLEXITY_CONFIG = {
  apiKey: process.env.PERPLEXITY_API_KEY,
  model: process.env.PERPLEXITY_MODEL || 'sonar',
  baseURL: 'https://api.perplexity.ai'
};

// Enhanced topic configurations
const LEARNING_TOPICS = {
  javascript: {
    name: 'JavaScript Mastery',
    description: 'Modern JavaScript programming and web development',
    icon: '🟨',
    difficulty: ['beginner', 'intermediate', 'advanced'],
    subcategories: ['fundamentals', 'es6+', 'async', 'dom-manipulation']
  },
  python: {
    name: 'Python Programming',
    description: 'Learn Python for data science and web development',
    icon: '🐍',
    difficulty: ['beginner', 'intermediate', 'advanced'],
    subcategories: ['basics', 'oop', 'libraries', 'data-science']
  },
  algorithms: {
    name: 'Algorithms & Problem Solving',
    description: 'Master algorithmic thinking and problem-solving techniques',
    icon: '🧠',
    difficulty: ['beginner', 'intermediate', 'advanced'],
    subcategories: ['sorting', 'searching', 'graph-algorithms', 'dynamic-programming']
  },
  datastructures: {
    name: 'Data Structures',
    description: 'Learn essential data structures for efficient programming',
    icon: '📊',
    difficulty: ['beginner', 'intermediate', 'advanced'],
    subcategories: ['arrays', 'linked-lists', 'trees', 'hash-tables', 'heaps']
  },
  webdevelopment: {
    name: 'Web Development',
    description: 'Full-stack web development with modern frameworks',
    icon: '🌐',
    difficulty: ['beginner', 'intermediate', 'advanced'],
    subcategories: ['html-css', 'react', 'nodejs', 'databases']
  },
  machinelearning: {
    name: 'Machine Learning',
    description: 'AI and machine learning concepts and applications',
    icon: '🤖',
    difficulty: ['intermediate', 'advanced'],
    subcategories: ['supervised', 'unsupervised', 'neural-networks', 'deep-learning']
  }
};

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Perplexity API helper
async function callPerplexityAPI(messages, options = {}) {
  if (!PERPLEXITY_CONFIG.apiKey) {
    throw new Error('Perplexity API key not configured');
  }

  const response = await fetch(`${PERPLEXITY_CONFIG.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_CONFIG.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: PERPLEXITY_CONFIG.model,
      messages,
      temperature: options.temperature || 0.8,
      max_tokens: options.maxTokens || 3000,
      ...options
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data;
}

// Utility functions
function generateQuestionPrompt(topic, difficulty, questionCount) {
  const topicConfig = LEARNING_TOPICS[topic] || LEARNING_TOPICS.javascript;
  
  return `Create ${questionCount} multiple choice questions about ${topicConfig.name} at ${difficulty} difficulty level.

Topic Focus: ${topicConfig.description}

Difficulty Guidelines:
- beginner: Basic concepts, fundamental syntax, simple applications
- intermediate: Practical problem-solving, integration of concepts, real-world scenarios  
- advanced: Complex optimization, edge cases, architectural decisions, performance considerations

Requirements:
1. Each question must have exactly 4 answer choices
2. Randomize the position of correct answers (don't always put correct answer first)
3. Include practical, scenario-based questions when possible
4. Provide clear, educational explanations
5. Focus on understanding rather than memorization

${topic === 'algorithms' || topic === 'datastructures' ? `
Special focus for ${topic}:
- Include time/space complexity analysis
- Present real coding scenarios
- Test understanding of when to use specific approaches
- Include trade-offs between different solutions
` : ''}

Return response as valid JSON array only:
[
  {
    "question": "Question text here?",
    "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "correctAnswer": 2,
    "explanation": "Clear explanation of why this answer is correct and others are wrong.",
    "difficulty": "${difficulty}",
    "category": "${topic}"
  }
]

No markdown formatting, no extra text, just the JSON array.`;
}

function shuffleQuestionOptions(question) {
  const originalOptions = [...question.options];
  const correctIndex = question.correctAnswer;
  
  // Create shuffled indices
  const indices = [0, 1, 2, 3];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  // Apply shuffle to options
  const shuffledOptions = indices.map(index => originalOptions[index]);
  const newCorrectIndex = indices.indexOf(correctIndex);
  
  return {
    ...question,
    options: shuffledOptions,
    correctAnswer: newCorrectIndex
  };
}

// Helper function to update user stats
async function updateUserStats(userId, quizResult) {
  const user = await User.findById(userId);
  if (!user) return;

  // Update overall stats
  user.stats.totalQuizzes += 1;
  user.stats.totalQuestions += quizResult.totalQuestions;
  user.stats.correctAnswers += quizResult.correctAnswers;
  user.stats.averageScore = Math.round((user.stats.correctAnswers / user.stats.totalQuestions) * 100);

  // Update streak
  if (quizResult.score >= 70) {
    user.stats.streakCount += 1;
    user.stats.bestStreak = Math.max(user.stats.bestStreak, user.stats.streakCount);
  } else {
    user.stats.streakCount = 0;
  }

  // Update topic-specific stats
  const topicKey = quizResult.topic;
  if (!user.stats.topicStats.has(topicKey)) {
    user.stats.topicStats.set(topicKey, {
      attempts: 0,
      totalScore: 0,
      bestScore: 0,
      averageScore: 0
    });
  }

  const topicStat = user.stats.topicStats.get(topicKey);
  topicStat.attempts += 1;
  topicStat.totalScore += quizResult.score;
  topicStat.averageScore = Math.round(topicStat.totalScore / topicStat.attempts);
  topicStat.bestScore = Math.max(topicStat.bestScore, quizResult.score);
  user.stats.topicStats.set(topicKey, topicStat);

  await user.save();
  return user.stats;
}

// API Routes

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Full name, email, and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }



    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    console.log("🔍 Checking email:", email.toLowerCase(), "=>", existingUser);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Account with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      isActive: true
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Return user data (without password)
    const userResponse = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt
    };
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Account with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create account. Please try again.'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Return user data (without password)
    const userResponse = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
});

// Quiz generation endpoint
app.post('/api/quiz/generate', authenticateUser, async (req, res) => {
  try {
    const { topic, difficulty = 'intermediate', questionCount = 5 } = req.body;

    // Validate inputs
    if (!topic || !LEARNING_TOPICS[topic]) {
      return res.status(400).json({
        success: false,
        error: 'Valid topic is required'
      });
    }

    const validDifficulties = LEARNING_TOPICS[topic].difficulty;
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: `Invalid difficulty. Valid options: ${validDifficulties.join(', ')}`
      });
    }

    if (questionCount < 3 || questionCount > 20) {
      return res.status(400).json({
        success: false,
        error: 'Question count must be between 3 and 20'
      });
    }

    console.log(`Generating quiz: ${topic} (${difficulty}) - ${questionCount} questions for user ${req.user.fullName}`);

    // Generate prompt
    const prompt = generateQuestionPrompt(topic, difficulty, questionCount);

    // Call Perplexity API
    const aiResponse = await callPerplexityAPI([
      {
        role: "system",
        content: "You are an expert educator creating high-quality quiz questions. Always return valid JSON only."
      },
      {
        role: "user",
        content: prompt
      }
    ], {
      temperature: difficulty === 'advanced' ? 0.9 : 0.8
    });

    if (!aiResponse.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from AI service');
    }

    let questions = [];
    try {
      const content = aiResponse.choices[0].message.content.trim();
      const cleanContent = content.replace(/``````/g, '').trim();
      
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : cleanContent;
      
      questions = JSON.parse(jsonString);
      
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No valid questions generated');
      }

      // Validate and shuffle questions
      questions = questions.map((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
          throw new Error(`Invalid question format at index ${index}`);
        }
        
        // Shuffle options to randomize correct answer position
        return shuffleQuestionOptions(q);
      });

    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('AI Response:', aiResponse.choices[0].message.content);
      throw new Error('Failed to parse quiz questions from AI response');
    }

    console.log(`✅ Successfully generated ${questions.length} questions for ${topic}`);

    res.json({
      success: true,
      quiz: {
        id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        topic,
        difficulty,
        questionCount: questions.length,
        questions: questions,
        createdAt: new Date().toISOString(),
        timeLimit: questions.length * 60 // 1 minute per question
      }
    });

  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate quiz questions'
    });
  }
});

// Submit quiz results
app.post('/api/quiz/submit', authenticateUser, async (req, res) => {
  try {
    const { quizId, topic, difficulty, questions, userAnswers, timeSpent } = req.body;

    if (!questions || !userAnswers || questions.length !== userAnswers.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quiz submission data'
      });
    }

    // Calculate results
    let correctAnswers = 0;
    const questionResults = questions.map((question, index) => {
      const userAnswer = userAnswers[index];
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (isCorrect) correctAnswers++;

      return {
        question: question.question,
        options: question.options,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation
      };
    });

    const score = Math.round((correctAnswers / questions.length) * 100);

    // Save quiz result to database
    const quizResult = new QuizResult({
      userId: req.user._id,
      topic,
      difficulty,
      totalQuestions: questions.length,
      correctAnswers,
      score,
      timeSpent,
      questions: questionResults
    });

    await quizResult.save();

    // Update user stats
    const updatedStats = await updateUserStats(req.user._id, {
      topic,
      totalQuestions: questions.length,
      correctAnswers,
      score
    });

    console.log(`✅ Quiz completed: ${req.user.fullName} - ${topic} - ${score}%`);

    res.json({
      success: true,
      result: {
        id: quizResult._id,
        score,
        correctAnswers,
        totalQuestions: questions.length,
        percentage: score,
        timeSpent,
        detailedResults: questionResults
      },
      progress: updatedStats
    });

  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit quiz results'
    });
  }
});

// Get user dashboard data
app.get('/api/user/dashboard', authenticateUser, async (req, res) => {
  try {
    // Get recent quiz results
    const recentResults = await QuizResult.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('topic difficulty score createdAt totalQuestions correctAnswers')
      .lean();

    // Format recent results
    const formattedResults = recentResults.map(result => ({
      topic: result.topic,
      difficulty: result.difficulty,
      score: result.score,
      timestamp: result.createdAt,
      totalQuestions: result.totalQuestions,
      correctAnswers: result.correctAnswers
    }));

    res.json({
      success: true,
      dashboard: {
        user: {
          name: req.user.fullName,
          email: req.user.email,
          joinDate: req.user.createdAt
        },
        stats: req.user.stats,
        recentActivity: formattedResults,
        availableTopics: Object.keys(LEARNING_TOPICS).map(key => ({
          id: key,
          ...LEARNING_TOPICS[key]
        }))
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard data'
    });
  }
});

// AI Tutor endpoint
app.post('/api/tutor/chat', authenticateUser, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const systemPrompt = `You are EduLearn's expert programming tutor and educational assistant. Your role is to:

1. Provide clear, helpful explanations on programming and computer science topics
2. Break down complex concepts into understandable parts
3. Offer practical examples and code snippets when relevant
4. Encourage learning and critical thinking
5. Be patient and supportive

Guidelines:
- Keep responses focused and educational
- Use simple language but maintain technical accuracy
- Provide step-by-step explanations for complex topics
- Include relevant examples or analogies
- Be encouraging and positive
- Reference EduLearn platform features when appropriate

Student context: ${context || 'General programming questions'}`;

    const aiResponse = await callPerplexityAPI([
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: message
      }
    ], {
      temperature: 0.7,
      maxTokens: 1000
    });

    if (!aiResponse.choices?.[0]?.message?.content) {
      throw new Error('No response from AI tutor');
    }

    const tutorResponse = aiResponse.choices[0].message.content.trim();

    res.json({
      success: true,
      response: tutorResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Tutor error:', error);
    res.status(500).json({
      success: false,
      error: 'AI tutor is temporarily unavailable. Please try again.'
    });
  }
});

// Get available topics
app.get('/api/topics', (req, res) => {
  const topics = Object.keys(LEARNING_TOPICS).map(key => ({
    id: key,
    ...LEARNING_TOPICS[key]
  }));

  res.json({
    success: true,
    topics
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV,
    services: {
      perplexity: !!PERPLEXITY_CONFIG.apiKey,
      auth: !!process.env.JWT_SECRET,
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      mongodb: mongoose.connection.readyState === 1
    }
  });
});

// Serve static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server and connect to database
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 EduLearn Platform running on port ${PORT}`);
      console.log(`🤖 Perplexity AI: ${PERPLEXITY_CONFIG.apiKey ? '✅ Connected' : '❌ Not configured'}`);
      console.log(`🔐 JWT Auth: ${process.env.JWT_SECRET ? '✅ Enabled' : '❌ Not configured'}`);
      console.log(`🍃 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
      console.log(`📚 Topics available: ${Object.keys(LEARNING_TOPICS).length}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});