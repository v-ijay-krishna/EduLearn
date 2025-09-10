// EduLearn Platform - Main Application JavaScript
class EduLearnApp {
    constructor() {
        this.API_BASE = '/api';
        this.authToken = localStorage.getItem('edulearn_token');
        this.currentUser = null;
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.quizTimer = null;
        this.startTime = 0;
        this.selectedTopic = null;
        this.userAnswers = [];
        
        this.init();

    }

    async init() {
        console.log('🚀 Initializing EduLearn Platform...');
        
        // Show loading screen briefly for better UX
        await this.sleep(1500);
        this.hideLoadingScreen();
        
        // Check authentication status
        if (this.authToken) {
            try {
                await this.validateAuth();
                this.showMainApp();
            } catch (error) {
                console.error('Auth validation failed:', error);
                this.clearAuth();
                this.showLandingPage();
            }
        } else {
            this.showLandingPage();
        }
        
        this.setupEventListeners();
        console.log('✅ EduLearn Platform initialized');
    }


    setupEventListeners() {
        // Landing page navigation
        this.bindEvent('btn-show-login', 'click', () => this.showAuthModal('login'));
        this.bindEvent('btn-show-register', 'click', () => this.showAuthModal('register'));
        this.bindEvent('btn-get-started', 'click', () => this.showAuthModal('register'));
        this.bindEvent('btn-explore-topics', 'click', () => this.showAuthModal('register'));
        
        // Modal controls
        this.bindEvent('btn-close-modal', 'click', () => this.hideAuthModal());
        this.bindEvent('btn-switch-login', 'click', () => this.switchAuthForm('login'));
        this.bindEvent('btn-switch-register', 'click', () => this.switchAuthForm('register'));
        
        // Close modal on overlay click
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAuthModal();
                }
            });
        }
        
        // Auth forms
        this.bindEvent('login-form', 'submit', (e) => this.handleLogin(e));
        this.bindEvent('register-form', 'submit', (e) => this.handleRegister(e));
        
        // Main app navigation
        document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPage(link.dataset.page);
         // This if-statement was added
        
        if (document.body.classList.contains('nav-open')) {
            this.toggleMobileNav();
    }
});
});
        
        // User menu toggle
        this.bindEvent('btn-user-menu', 'click', () => this.toggleUserMenu());
        
        // User menu actions
        this.bindEvent('btn-logout', 'click', () => this.logout());
        this.bindEvent('btn-profile', 'click', () => this.showProfile());
        this.bindEvent('btn-settings', 'click', () => this.showSettings());
        
        // Quiz configuration
        this.bindEvent('btn-back-to-topics', 'click', () => this.navigateToPage('topics'));
        this.bindEvent('btn-decrease-questions', 'click', () => this.adjustQuestionCount(-1));
        this.bindEvent('btn-increase-questions', 'click', () => this.adjustQuestionCount(1));
        this.bindEvent('btn-generate-quiz', 'click', () => this.generateQuiz());
        
        // AI Tutor
        this.bindEvent('btn-send-message', 'click', () => this.sendTutorMessage());
        this.bindEvent('chat-input', 'keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendTutorMessage();
            }
        });
        
        // Auto-resize chat input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
            });
        }

        // Hint chip clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('hint-chip')) {
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    chatInput.value = e.target.textContent;
                    chatInput.focus();
                }
            }
        });

        // Close user menu when clicking outside
        document.addEventListener('click', (e) => {
            const userMenu = document.getElementById('user-dropdown');
            const menuBtn = document.getElementById('btn-user-menu');
            
            if (userMenu && !userMenu.contains(e.target) && !menuBtn.contains(e.target)) {
                userMenu.classList.remove('show');
            }
        });

        this.bindEvent('btn-mobile-nav', 'click', () => this.toggleMobileNav());
this.bindEvent('btn-close-nav', 'click', () => this.toggleMobileNav());
    }

    // Utility methods
    bindEvent(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => loadingScreen.style.display = 'none', 500);
        }
    }

    // API methods
    async apiCall(endpoint, options = {}) {
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
            },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(`${this.API_BASE}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Call Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // Authentication methods
    async validateAuth() {
        const data = await this.apiCall('/user/dashboard');
        this.currentUser = data.dashboard.user;
        this.updateUserDisplay();
        this.updateDashboardStats(data.dashboard.stats);
        return data;
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        this.setButtonLoading(submitBtn, true);

        try {
            const data = await this.apiCall('/auth/login', {
                method: 'POST',
                body: { email, password }
            });

            this.authToken = data.token;
            this.currentUser = data.user;
            localStorage.setItem('edulearn_token', this.authToken);
            
            this.hideAuthModal();
            this.showMainApp();
            this.showToast(`Welcome back, ${data.user.fullName}!`, 'success');
            
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.message, 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const fullName = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        
        if (!fullName || !email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 8) {
            this.showToast('Password must be at least 8 characters long', 'error');
            return;
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        this.setButtonLoading(submitBtn, true);

        try {
            const data = await this.apiCall('/auth/register', {
                method: 'POST',
                body: { fullName, email, password }
            });

            this.authToken = data.token;
            this.currentUser = data.user;
            localStorage.setItem('edulearn_token', this.authToken);
            
            this.hideAuthModal();
            this.showMainApp();
            this.showToast(`Welcome to EduLearn, ${data.user.fullName}!`, 'success');
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast(error.message, 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('edulearn_token');
        this.clearAuth();
          this.navigateToPage('landing');
        this.showLandingPage();
        this.showToast('Logged out successfully', 'info');
    }

    clearAuth() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('edulearn_token');
    }

    // UI State Management
    showLandingPage() {
        document.getElementById('landing-page').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        this.navigateToPage('dashboard');
        this.loadTopics();
    }

    showAuthModal(mode = 'login') {
        const modal = document.getElementById('auth-modal');
        modal.classList.add('show');
        this.switchAuthForm(mode);
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        modal.classList.remove('show');
        
        // Clear form fields
        document.querySelectorAll('#auth-modal input').forEach(input => {
            input.value = '';
        });
    }

    switchAuthForm(mode) {
        const loginForm = document.getElementById('login-form-container');
        const registerForm = document.getElementById('register-form-container');
        
        if (mode === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }
    }

    navigateToPage(pageId) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
        
        // Show/hide pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.add('hidden');
        });
        document.getElementById(`${pageId}-page`)?.classList.remove('hidden');
        
        // Load page-specific data
        switch (pageId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'topics':
                this.loadTopics();
                break;
            case 'tutor':
                this.initializeTutor();
                break;
            case 'progress':
                this.loadProgress();
                break;
            case 'practice':
            renderPracticePage();
            break;


        }


    }
    toggleMobileNav() {
            document.body.classList.toggle('nav-open');
        }
    updateUserDisplay() {
        if (this.currentUser) {
            const nameElement = document.getElementById('user-display-name');
            if (nameElement) {
                nameElement.textContent = this.currentUser.fullName;
            }
        }
    }

    setButtonLoading(button, loading) {
        if (!button) return;
        
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');
        
        if (loading) {
            button.disabled = true;
            if (btnText) btnText.style.opacity = '0';
            if (btnLoader) btnLoader.classList.remove('hidden');
        } else {
            button.disabled = false;
            if (btnText) btnText.style.opacity = '1';
            if (btnLoader) btnLoader.classList.add('hidden');
        }
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    showProfile() {
        this.showToast('Profile feature coming soon!', 'info');
        this.toggleUserMenu();
    }

    showSettings() {
        this.showToast('Settings feature coming soon!', 'info');
        this.toggleUserMenu();
    }

    // Topics and Quiz Management
    async loadTopics() {
        try {
            const data = await this.apiCall('/topics');
            this.renderTopics(data.topics);
        } catch (error) {
            console.error('Failed to load topics:', error);
            this.showToast('Failed to load topics', 'error');
        }
    }
  
    renderTopics(topics) {
        const container = document.getElementById('topics-grid');
        if (!container) return;

        container.innerHTML = topics.map(topic => `
            <div class="topic-card" data-topic-id="${topic.id}">
                <div class="topic-header">
                    <div class="topic-icon">${topic.icon}</div>
                    <h3 class="topic-name">${topic.name}</h3>
                </div>
                <p class="topic-description">${topic.description}</p>
                <div class="topic-meta">
                    ${topic.difficulty.map(diff => `<span class="topic-tag">${diff}</span>`).join('')}
                </div>
                <button class="topic-action">Start Learning</button>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.topic-card').forEach(card => {
            card.addEventListener('click', () => {
                const topicId = card.dataset.topicId;
                this.selectTopic(topicId, topics.find(t => t.id === topicId));
            });
        });
    }

    selectTopic(topicId, topicData) {
        this.selectedTopic = { id: topicId, ...topicData };
        this.navigateToPage('quiz-config');
        this.setupQuizConfiguration();
    }

    setupQuizConfiguration() {
        if (!this.selectedTopic) return;

        // Update topic display
        const display = document.getElementById('selected-topic-display');
        if (display) {
            display.innerHTML = `
                <div class="topic-icon">${this.selectedTopic.icon}</div>
                <div class="topic-info">
                    <h4 class="topic-name">${this.selectedTopic.name}</h4>
                    <p class="topic-desc">${this.selectedTopic.description}</p>
                </div>
            `;
        }

        // Setup difficulty selector
        const difficultySelector = document.getElementById('difficulty-selector');
        if (difficultySelector) {
            difficultySelector.innerHTML = this.selectedTopic.difficulty.map(diff => `
                <button class="difficulty-btn ${diff === 'intermediate' ? 'active' : ''}" data-difficulty="${diff}">
                    ${diff.charAt(0).toUpperCase() + diff.slice(1)}
                </button>
            `).join('');

            // Add click handlers
            difficultySelector.querySelectorAll('.difficulty-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    difficultySelector.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        }
    }

    adjustQuestionCount(delta) {
        const input = document.getElementById('question-count');
        if (!input) return;

        let value = parseInt(input.value) + delta;
        value = Math.max(3, Math.min(20, value));
        input.value = value;
    }

    async generateQuiz() {
    if (!this.selectedTopic) return;

    const difficulty = document.querySelector('.difficulty-btn.active')?.dataset.difficulty || 'intermediate';
    const questionCount = parseInt(document.getElementById('question-count').value);

    const generateBtn = document.getElementById('btn-generate-quiz');
    this.setButtonLoading(generateBtn, true);

    // ✅ SHOW loading overlay
    document.getElementById('loading-overlay').classList.remove('hidden');

    try {
        const data = await this.apiCall('/quiz/generate', {
            method: 'POST',
            body: {
                topic: this.selectedTopic.id,
                difficulty,
                questionCount
            }
        });

        this.currentQuiz = data.quiz;
        this.currentQuestionIndex = 0;
        this.startTime = Date.now();
        
        this.navigateToPage('quiz');
        this.startQuiz();
        this.showToast('Quiz generated successfully!', 'success');

    } catch (error) {
        console.error('Quiz generation error:', error);
        this.showToast('Failed to generate quiz. Please try again.', 'error');
    } finally {
        // ✅ HIDE loading overlay
        document.getElementById('loading-overlay').classList.add('hidden');
        this.setButtonLoading(generateBtn, false);
    }
}


    startQuiz() {
        if (!this.currentQuiz) return;

        this.userAnswers = new Array(this.currentQuiz.questions.length).fill(null);
        this.displayCurrentQuestion();
        this.startQuizTimer();
    }
displayCurrentQuestion() {
    const question = this.currentQuiz.questions[this.currentQuestionIndex];
    const content = document.getElementById('quiz-content');
    
    if (!content) return;

    content.innerHTML = `
        <div class="question-container">
            <h2 class="question-text">${question.question}</h2>
            <div class="quiz-options">
                ${question.options.map((option, index) => `
                    <button class="quiz-option" data-option="${index}">
                        <span class="option-letter">${String.fromCharCode(65 + index)}.</span>
                        <span class="option-text">${option}</span>
                    </button>
                `).join('')}
            </div>
            <div class="question-actions">
                <button class="next-question-btn" id="next-btn" disabled>
                    ${this.currentQuestionIndex === this.currentQuiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                </button>
            </div>
        </div>
    `;

    // Add option selection handlers
    content.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => this.selectAnswer(parseInt(btn.dataset.option), btn));
    });

    // Add next question handler
    document.getElementById('next-btn')
        .addEventListener('click', () => this.nextQuestion());

    // Update progress
    this.updateQuizProgress();
}
selectAnswer(selectedIndex) {
    if (!this.userAnswers) {
        this.userAnswers = new Array(this.currentQuiz.questions.length).fill(null);
    }
    this.userAnswers[this.currentQuestionIndex] = selectedIndex;

    // Highlight selected option
    document.querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    const selectedBtn = document.querySelector(`[data-option="${selectedIndex}"]`);
    if (selectedBtn) selectedBtn.classList.add('selected');

    // Enable Next Question button
    const nextBtn = document.querySelector('.next-question-btn');
    if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.classList.add('enabled');
    }
}


    nextQuestion() {
        this.currentQuestionIndex++;
        
        if (this.currentQuestionIndex < this.currentQuiz.questions.length) {
            this.displayCurrentQuestion();
        } else {
            this.finishQuiz();
        }
    }
async finishQuiz() {
    this.stopQuizTimer();
    const timeSpent = Date.now() - this.startTime;

    try {
        // 1. Submit to existing quiz-checking API
        const data = await this.apiCall('/quiz/submit', {
            method: 'POST',
            body: {
                quizId: this.currentQuiz.id,
                topic: this.selectedTopic.id,
                difficulty: this.currentQuiz.difficulty,
                questions: this.currentQuiz.questions,
                userAnswers: this.userAnswers,
                timeSpent
            }
        });

        this.showQuizResults(data.result);
        this.updateDashboardStats(data.progress);

        // 2. 🔑 Now also save results into user profile stats
        const score = data.result.correctCount;   // adjust if field is different
        const total = data.result.totalQuestions; // adjust if field is different

        await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                topic: this.selectedTopic.name,      // readable topic
                score,
                total,
                difficulty: this.currentQuiz.difficulty
            })
        });

    } catch (error) {
        console.error('Quiz submission error:', error);
        this.showToast('Failed to submit quiz results', 'error');
    }
}



    showQuizResults(result) {
        const content = document.getElementById('quiz-content');
        if (!content) return;

        const percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100);
        
        let performanceMessage = '';
        let performanceEmoji = '';
        
        if (percentage >= 90) {
            performanceMessage = 'Outstanding! You\'re a true expert!';
            performanceEmoji = '🏆';
        } else if (percentage >= 75) {
            performanceMessage = 'Great job! You have a solid understanding!';
            performanceEmoji = '🌟';
        } else if (percentage >= 60) {
            performanceMessage = 'Good work! Keep practicing to improve!';
            performanceEmoji = '👍';
        } else {
            performanceMessage = 'Keep learning! Practice makes perfect!';
            performanceEmoji = '💪';
        }
        
        content.innerHTML = `
            <div class="results-container">
                <div class="results-header">
                    <h2>${performanceEmoji} Quiz Complete!</h2>
                    <div class="score-display">
                        <div class="score-circle">
                            <span class="score-percentage">${percentage}%</span>
                        </div>
                        <div class="score-details">
                            <p class="score-text">${result.correctAnswers} out of ${result.totalQuestions} correct</p>
                            <p class="performance-message">${performanceMessage}</p>
                        </div>
                    </div>
                </div>
                
                <div class="results-actions">
                    <button class="retry-btn btn-primary">🔄 Try Again</button>
                    <button class="new-topic-btn btn-secondary">📚 Choose New Topic</button>
                    <button class="dashboard-btn btn-secondary">📊 View Dashboard</button>
                </div>

                <div class="detailed-results">
                    <h3>Question Review</h3>
                    <div class="results-list">
                        ${result.detailedResults.map((item, index) => `
                            <div class="result-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                                <div class="result-header">
                                    <span class="result-icon">${item.isCorrect ? '✅' : '❌'}</span>
                                    <span class="question-number">Question ${index + 1}</span>
                                </div>
                                <p class="result-question">${item.question}</p>
                                <div class="result-answers">
                                    <p class="user-answer">Your answer: ${item.options[item.userAnswer]}</p>
                                    ${!item.isCorrect ? `<p class="correct-answer">Correct answer: ${item.options[item.correctAnswer]}</p>` : ''}
                                </div>
                                <p class="result-explanation">${item.explanation}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // Add action handlers
        content.querySelector('.retry-btn').addEventListener('click', () => this.generateQuiz());
        content.querySelector('.new-topic-btn').addEventListener('click', () => this.navigateToPage('topics'));
        content.querySelector('.dashboard-btn').addEventListener('click', () => this.navigateToPage('dashboard'));
    }


    updateQuizProgress() {
        const current = this.currentQuestionIndex + 1;
        const total = this.currentQuiz.questions.length;
        const percentage = (current / total) * 100;

        const progressFill = document.getElementById('quiz-progress-fill');
        const progressText = document.getElementById('quiz-progress-text');

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `Question ${current} of ${total}`;
    }

    startQuizTimer() {
        const timerDisplay = document.getElementById('quiz-timer-display');
        if (!timerDisplay) return;

        this.quizTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopQuizTimer() {
        if (this.quizTimer) {
            clearInterval(this.quizTimer);
            this.quizTimer = null;
        }
    }

    // AI Tutor functionality
    initializeTutor() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer && messagesContainer.children.length === 1) {
            // Welcome message is already there from HTML
        }
    }

    async sendTutorMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;

        this.addChatMessage(message, 'user');
        input.value = '';
        input.style.height = 'auto';

        // Show typing indicator
        this.addChatMessage('Thinking...', 'tutor', true);

        try {
            const data = await this.apiCall('/tutor/chat', {
                method: 'POST',
                body: { 
                    message, 
                    context: this.selectedTopic?.name || 'General programming questions' 
                }
            });

            // Remove typing indicator
            const messages = document.getElementById('chat-messages');
            const lastMessage = messages.lastChild;
            if (lastMessage && lastMessage.querySelector('.typing-indicator')) {
                messages.removeChild(lastMessage);
            }

            this.addChatMessage(data.response, 'tutor');

        } catch (error) {
            console.error('AI Tutor error:', error);
            
            // Remove typing indicator
            const messages = document.getElementById('chat-messages');
            const lastMessage = messages.lastChild;
            if (lastMessage && lastMessage.querySelector('.typing-indicator')) {
                messages.removeChild(lastMessage);
            }
            
            this.addChatMessage('Sorry, I encountered an error. Please try again later.', 'tutor');
        }
    }
parseMarkdown(text) {
    // Escape HTML
    let html = text.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');

    // Code blocks (```...```)
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code (`...`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italics (*text*)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Lists (- item)
    html = html.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, ''); // merge adjacent ULs

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}

// This function was updated
addChatMessage(text, sender, isTyping = false) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    if (isTyping) {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
    } else {
        const formattedText = this.parseMarkdown(text);
        messageDiv.innerHTML = `
            <div class="message-content">
                ${formattedText}
            </div>
            <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        `;
    }
    
    messages.appendChild(messageDiv);
    
    // This part was updated for a more reliable scroll
    requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
    });
}
    // Dashboard methods
    async loadDashboard() {
        try {
            const data = await this.apiCall('/user/dashboard');
            this.updateDashboardStats(data.dashboard.stats);
            this.renderRecentActivity(data.dashboard.recentActivity);
            this.renderTopicPerformance(data.dashboard.stats.topicStats);
        } catch (error) {
            console.error('Dashboard load error:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }

    updateDashboardStats(stats) {
        if (!stats) return;

        const elements = {
            'stat-total-quizzes': stats.totalQuizzes || 0,
            'stat-accuracy': `${stats.averageScore || 0}%`,
            'stat-streak': stats.streakCount || 0,
            'stat-best-streak': stats.bestStreak || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                // Animate number changes
                this.animateCounter(element, value);
            }
        });
    }

    animateCounter(element, targetValue) {
        const currentValue = element.textContent;
        const isPercentage = typeof targetValue === 'string' && targetValue.includes('%');
        const numericTarget = isPercentage ? 
            parseInt(targetValue.replace('%', '')) : 
            parseInt(targetValue) || 0;
        const numericCurrent = parseInt(currentValue.replace('%', '')) || 0;

        if (numericCurrent === numericTarget) return;

        const duration = 1000; // 1 second
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentNum = Math.floor(numericCurrent + (numericTarget - numericCurrent) * progress);
            element.textContent = isPercentage ? `${currentNum}%` : currentNum.toString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <p>Complete your first quiz to see activity here!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${this.getTopicIcon(activity.topic)}</div>
                <div class="activity-content">
                    <p class="activity-title">${this.formatTopicName(activity.topic)} Quiz</p>
                    <p class="activity-meta">
                        Score: ${activity.score}% • 
                        ${activity.difficulty} • 
                        ${new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                </div>
                <div class="activity-score ${activity.score >= 75 ? 'good' : 'needs-improvement'}">
                    ${activity.score}%
                </div>
            </div>
        `).join('');
    }

    renderTopicPerformance(topicStats) {
        const container = document.getElementById('topic-performance');
        if (!container) return;

        if (!topicStats || Object.keys(topicStats).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <p>Practice different topics to see your performance breakdown!</p>
                </div>
            `;
            return;
        }

        const sortedTopics = Object.entries(topicStats)
            .sort(([,a], [,b]) => b.attempts - a.attempts)
            .slice(0, 5);

        container.innerHTML = sortedTopics.map(([topic, stats]) => `
            <div class="performance-item">
                <div class="performance-header">
                    <span class="topic-icon">${this.getTopicIcon(topic)}</span>
                    <span class="topic-name">${this.formatTopicName(topic)}</span>
                    <span class="attempts-count">${stats.attempts} quiz${stats.attempts > 1 ? 'es' : ''}</span>
                </div>
                <div class="performance-bar">
                    <div class="performance-fill" style="width: ${stats.averageScore}%"></div>
                </div>
                <div class="performance-stats">
                    <span class="average">Avg: ${stats.averageScore}%</span>
                    <span class="best">Best: ${stats.bestScore}%</span>
                </div>
            </div>
        `).join('');
    }



formatTopicName(topic) {
    const names = {
        javascript: 'JavaScript',
        python: 'Python',
        algorithms: 'Algorithms',
        datastructures: 'Data Structures',
        webdevelopment: 'Web Development',
        machinelearning: 'Machine Learning'
    };
    return names[topic] || topic.charAt(0).toUpperCase() + topic.slice(1);
}

getTopicIcon(topic) {
    const icons = {
        javascript: '🟨',
        python: '🐍',
        algorithms: '🧠',
        datastructures: '📊',
        webdevelopment: '🌐',
        machinelearning: '🤖'
    };
    return icons[topic] || '📚';
}


    // Toast notifications
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icons[type] || icons.info}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    // Error handling
    handleError(error, context = 'Application') {
        console.error(`${context} Error:`, error);
        
        let message = 'An unexpected error occurred. Please try again.';
        
        if (error.message) {
            if (error.message.includes('Failed to fetch')) {
                message = 'Connection error. Please check your internet connection.';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                message = 'Session expired. Please log in again.';
                this.logout();
                return;
            } else {
                message = error.message;
            }
        }
        
        this.showToast(message, 'error');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        new EduLearnApp();
    } catch (error) {
        console.error('Failed to initialize EduLearn Platform:', error);
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; text-align: center; padding: 2rem;">
                <h1 style="color: #ef4444; margin-bottom: 1rem;">⚠️ Application Error</h1>
                <p style="color: #666; margin-bottom: 2rem;">Failed to initialize EduLearn Platform. Please refresh the page.</p>
                <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #6366f1; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                    🔄 Refresh Page
                </button>
            </div>
        `;
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
});

// Practice Questions Dataset
const practiceData = {
  "Array": [
    { title: "Two Sum", url: "https://leetcode.com/problems/two-sum/", desc: "Find indices of two numbers adding up to target." },
    { title: "Best Time to Buy and Sell Stock", url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/", desc: "Max profit from buying/selling stock once." },
    { title: "Maximum Subarray", url: "https://leetcode.com/problems/maximum-subarray/", desc: "Largest sum of a contiguous subarray." },
    { title: "Merge Intervals", url: "https://leetcode.com/problems/merge-intervals/", desc: "Merge overlapping intervals." },
    { title: "Product of Array Except Self", url: "https://leetcode.com/problems/product-of-array-except-self/", desc: "Array of products except self, no division." }
  ],
  "String": [
    { title: "Valid Anagram", url: "https://leetcode.com/problems/valid-anagram/", desc: "Check if two strings are anagrams." },
    { title: "Longest Substring Without Repeating Characters", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/", desc: "Length of longest substring without repeats." },
    { title: "Palindrome Substrings", url: "https://leetcode.com/problems/palindromic-substrings/", desc: "Count palindromic substrings." },
    { title: "Group Anagrams", url: "https://leetcode.com/problems/group-anagrams/", desc: "Group words that are anagrams." },
    { title: "Longest Palindromic Substring", url: "https://leetcode.com/problems/longest-palindromic-substring/", desc: "Find the longest palindromic substring." }
  ],
  "Stack": [
    { title: "Valid Parentheses", url: "https://leetcode.com/problems/valid-parentheses/", desc: "Check if parentheses are valid." },
    { title: "Min Stack", url: "https://leetcode.com/problems/min-stack/", desc: "Stack with push, pop, top and min in O(1)." },
    { title: "Daily Temperatures", url: "https://leetcode.com/problems/daily-temperatures/", desc: "Wait days until warmer temperature." },
    { title: "Largest Rectangle in Histogram", url: "https://leetcode.com/problems/largest-rectangle-in-histogram/", desc: "Find max area rectangle in histogram." },
    { title: "Next Greater Element", url: "https://leetcode.com/problems/next-greater-element-i/", desc: "Find next greater element for each number." }
  ],
  "Queue": [
    { title: "Implement Queue using Stacks", url: "https://leetcode.com/problems/implement-queue-using-stacks/", desc: "Implement a queue using two stacks." },
    { title: "Design Circular Queue", url: "https://leetcode.com/problems/design-circular-queue/", desc: "Implement a circular queue." },
    { title: "Sliding Window Maximum", url: "https://leetcode.com/problems/sliding-window-maximum/", desc: "Find max in each sliding window." },
    { title: "Number of Islands", url: "https://leetcode.com/problems/number-of-islands/", desc: "Count number of islands in a grid." },
    { title: "Rotting Oranges", url: "https://leetcode.com/problems/rotting-oranges/", desc: "Find time for all oranges to rot." }
  ],
  "Linked List": [
    { title: "Reverse Linked List", url: "https://leetcode.com/problems/reverse-linked-list/", desc: "Reverse a singly linked list." },
    { title: "Merge Two Sorted Lists", url: "https://leetcode.com/problems/merge-two-sorted-lists/", desc: "Merge two sorted linked lists." },
    { title: "Linked List Cycle", url: "https://leetcode.com/problems/linked-list-cycle/", desc: "Detect cycle in a linked list." },
    { title: "Remove Nth Node From End", url: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/", desc: "Remove nth node from end." },
    { title: "Add Two Numbers", url: "https://leetcode.com/problems/add-two-numbers/", desc: "Add numbers represented as linked lists." }
  ],
  "Tree": [
    { title: "Maximum Depth of Binary Tree", url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/", desc: "Find max depth of a binary tree." },
    { title: "Validate Binary Search Tree", url: "https://leetcode.com/problems/validate-binary-search-tree/", desc: "Check if binary tree is a BST." },
    { title: "Binary Tree Level Order Traversal", url: "https://leetcode.com/problems/binary-tree-level-order-traversal/", desc: "Level order traversal of binary tree." },
    { title: "Lowest Common Ancestor", url: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/", desc: "Find lowest common ancestor." },
    { title: "Serialize and Deserialize Binary Tree", url: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/", desc: "Encode/decode binary tree." }
  ],
  "Graph": [
    { title: "Number of Islands", url: "https://leetcode.com/problems/number-of-islands/", desc: "Count islands in grid using DFS/BFS." },
    { title: "Clone Graph", url: "https://leetcode.com/problems/clone-graph/", desc: "Clone a connected undirected graph." },
    { title: "Course Schedule", url: "https://leetcode.com/problems/course-schedule/", desc: "Detect cycles in course prerequisites." },
    { title: "Word Ladder", url: "https://leetcode.com/problems/word-ladder/", desc: "Shortest transformation sequence between words." },
    { title: "Network Delay Time", url: "https://leetcode.com/problems/network-delay-time/", desc: "Time for signal to reach all nodes." }
  ],
  "Dynamic Programming": [
    { title: "Climbing Stairs", url: "https://leetcode.com/problems/climbing-stairs/", desc: "Ways to climb stairs with 1/2 steps." },
    { title: "House Robber", url: "https://leetcode.com/problems/house-robber/", desc: "Max sum without robbing adjacent houses." },
    { title: "Coin Change", url: "https://leetcode.com/problems/coin-change/", desc: "Min coins to make up a given amount." },
    { title: "Longest Increasing Subsequence", url: "https://leetcode.com/problems/longest-increasing-subsequence/", desc: "Length of LIS." },
    { title: "Edit Distance", url: "https://leetcode.com/problems/edit-distance/", desc: "Min operations to convert one word to another." }
  ],
  "Algorithms": [
    { title: "Binary Search", url: "https://leetcode.com/problems/binary-search/", desc: "Classic binary search in array." },
    { title: "Merge Sort Array", url: "https://leetcode.com/problems/merge-sorted-array/", desc: "Merge two sorted arrays." },
    { title: "Quickselect - Kth Largest Element", url: "https://leetcode.com/problems/kth-largest-element-in-an-array/", desc: "Find kth largest element in array." },
    { title: "Dijkstra’s Shortest Path", url: "https://leetcode.com/problems/network-delay-time/", desc: "Find shortest path in weighted graph." },
    { title: "Topological Sort - Course Schedule", url: "https://leetcode.com/problems/course-schedule/", desc: "Check if courses can be finished." }
  ]
};

// Function to render practice page
function renderPracticePage() {
  const container = document.getElementById("practice-sections");
  container.innerHTML = "";

  for (let topic in practiceData) {
    const card = document.createElement("div");
    card.className = "practice-card";

    const title = document.createElement("h2");
    title.textContent = topic;
    card.appendChild(title);

    const list = document.createElement("ul");
    practiceData[topic].forEach(q => {
      const item = document.createElement("li");
      item.innerHTML = `<a href="${q.url}" target="_blank">${q.title}</a><p>${q.desc}</p>`;
      list.appendChild(item);
    });

    card.appendChild(list);
    container.appendChild(card);
}
}

// Add to your existing JavaScript
toggleMobileNav(); {

    document.body.classList.toggle('nav-open');
    
    // Close user menu if open when opening nav
    if (document.body.classList.contains('nav-open')) {
        const userMenu = document.getElementById('user-dropdown');
        if (userMenu) {
            userMenu.classList.remove('show');
        }
    }
}

// Add click outside to close mobile nav
document.addEventListener('click', (e) => {
    const nav = document.getElementById('app-navigation');
    const navToggle = document.getElementById('btn-mobile-nav');
    
    if (document.body.classList.contains('nav-open') && 
        !nav.contains(e.target) && 
        !navToggle.contains(e.target)) {
        this.toggleMobileNav();
    }
});

