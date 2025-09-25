// Landing Page JavaScript
class LandingPage {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.startAnimations();
    }
    
    initializeElements() {
        this.elements = {
            // Navigation
            loginBtn: document.getElementById('loginBtn'),
            signupBtn: document.getElementById('signupBtn'),
            
            // Hero buttons
            getStartedBtn: document.getElementById('getStartedBtn'),
            learnMoreBtn: document.getElementById('learnMoreBtn'),
            startFreeBtn: document.getElementById('startFreeBtn'),
            
            // Modals
            loginModal: document.getElementById('loginModal'),
            signupModal: document.getElementById('signupModal'),
            
            // Forms
            loginForm: document.getElementById('loginForm'),
            signupForm: document.getElementById('signupForm'),
            
            // Modal switches
            switchToSignup: document.getElementById('switchToSignup'),
            switchToLogin: document.getElementById('switchToLogin'),
            
            // Agent cards
            agentCards: document.querySelectorAll('.agent-card'),
            
            // Toast container
            toastContainer: document.getElementById('toastContainer')
        };
    }
    
    bindEvents() {
        // Navigation buttons
        this.elements.loginBtn?.addEventListener('click', () => this.openModal('login'));
        this.elements.signupBtn?.addEventListener('click', () => this.openModal('signup'));
        
        // Hero buttons
        this.elements.getStartedBtn?.addEventListener('click', () => this.openModal('signup'));
        this.elements.startFreeBtn?.addEventListener('click', () => this.openModal('signup'));
        this.elements.learnMoreBtn?.addEventListener('click', () => this.scrollToSection('features'));
        
        // Modal switches
        this.elements.switchToSignup?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchModal('signup');
        });
        this.elements.switchToLogin?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchModal('login');
        });
        
        // Form submissions
        this.elements.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
        this.elements.signupForm?.addEventListener('submit', (e) => this.handleSignup(e));
        
        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
            if (e.target.classList.contains('close-btn')) {
                this.closeModals();
            }
        });
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
        
        // Agent card interactions
        this.elements.agentCards.forEach(card => {
            card.addEventListener('click', () => this.selectAgent(card));
        });
        
        // Smooth scrolling for nav links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
        
        // Navbar scroll effect
        window.addEventListener('scroll', () => this.handleNavbarScroll());
    }
    
    openModal(type) {
        this.closeModals();
        const modal = type === 'login' ? this.elements.loginModal : this.elements.signupModal;
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    switchModal(type) {
        this.closeModals();
        setTimeout(() => this.openModal(type), 100);
    }
    
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
    
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    selectAgent(selectedCard) {
        // Remove active class from all cards
        this.elements.agentCards.forEach(card => {
            card.classList.remove('active');
        });
        
        // Add active class to selected card
        selectedCard.classList.add('active');
        
        // Add some animation effect
        selectedCard.style.transform = 'scale(1.05)';
        setTimeout(() => {
            selectedCard.style.transform = '';
        }, 200);
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const loginData = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        // Disable form
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Store token
                localStorage.setItem('auth_token', result.token);
                localStorage.setItem('user_id', result.user_id);
                
                this.showToast('Login successful! Redirecting...', 'success');
                
                // Redirect to app
                setTimeout(() => {
                    window.location.href = '/app';
                }, 1500);
            } else {
                this.showToast(result.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Connection error occurred', 'error');
        } finally {
            // Re-enable form
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    async handleSignup(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        
        // Validate passwords match
        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }
        
        // Validate password strength
        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        const signupData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: password
        };
        
        // Disable form
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(signupData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Store token
                localStorage.setItem('auth_token', result.token);
                localStorage.setItem('user_id', result.user_id);
                
                this.showToast('Account created successfully! Redirecting...', 'success');
                
                // Redirect to app
                setTimeout(() => {
                    window.location.href = '/app';
                }, 1500);
            } else {
                this.showToast(result.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast('Connection error occurred', 'error');
        } finally {
            // Re-enable form
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.elements.toastContainer.appendChild(toast);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
    
    handleNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    }
    
    startAnimations() {
        // Agent cards cycling animation
        let currentAgentIndex = 0;
        setInterval(() => {
            if (this.elements.agentCards.length > 0) {
                // Remove active from all
                this.elements.agentCards.forEach(card => card.classList.remove('active'));
                
                // Add active to current
                this.elements.agentCards[currentAgentIndex].classList.add('active');
                
                // Move to next
                currentAgentIndex = (currentAgentIndex + 1) % this.elements.agentCards.length;
            }
        }, 3000);
        
        // Animate feature cards on scroll
        this.observeElements();
    }
    
    observeElements() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observe feature cards
        document.querySelectorAll('.feature-card, .model-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s ease';
            observer.observe(card);
        });
    }
    
    // Check if user is already logged in
    checkAuthStatus() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            // Verify token with server
            fetch(`/auth/verify?token=${token}`)
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        // User is logged in, show different UI or redirect
                        this.updateUIForLoggedInUser(result.user);
                    } else {
                        // Invalid token, clear storage
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('user_id');
                    }
                })
                .catch(error => {
                    console.error('Auth verification error:', error);
                });
        }
    }
    
    updateUIForLoggedInUser(user) {
        // Update navigation buttons
        if (this.elements.loginBtn) {
            this.elements.loginBtn.textContent = user.username;
            this.elements.loginBtn.onclick = () => window.location.href = '/app';
        }
        
        if (this.elements.signupBtn) {
            this.elements.signupBtn.textContent = 'Dashboard';
            this.elements.signupBtn.onclick = () => window.location.href = '/dashboard';
        }
        
        // Update hero buttons
        if (this.elements.getStartedBtn) {
            this.elements.getStartedBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Go to App';
            this.elements.getStartedBtn.onclick = () => window.location.href = '/app';
        }
    }
}

// Utility functions for smooth animations
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Animate stats when they come into view
function animateStats() {
    const stats = document.querySelectorAll('.stat-number');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = target.textContent.replace(/[^0-9.]/g, '');
                target.textContent = '0';
                
                if (finalValue.includes('.')) {
                    animateValue(target, 0, parseFloat(finalValue), 2000);
                } else {
                    animateValue(target, 0, parseInt(finalValue), 2000);
                }
                
                observer.unobserve(target);
            }
        });
    });
    
    stats.forEach(stat => observer.observe(stat));
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const landingPage = new LandingPage();
    landingPage.checkAuthStatus();
    animateStats();
    
    // Add some loading animations
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.opacity = '1';
        document.body.style.transition = 'opacity 0.5s ease';
    }, 100);
});

// Add some interactive particles effect to hero
function createParticles() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            pointer-events: none;
            animation: float ${3 + Math.random() * 4}s linear infinite;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 5}s;
        `;
        hero.appendChild(particle);
    }
}

// Add floating animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Create particles after a short delay
setTimeout(createParticles, 1000);
