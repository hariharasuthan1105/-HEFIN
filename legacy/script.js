// Configuration
const CONFIG = {
    supabaseUrl: 'https://YOUR_PROJECT_ID.supabase.co',
    supabaseAnonKey: 'YOUR_ANON_KEY',
    apiBaseUrl: 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1a70333b'
};

// Global state
let currentUser = null;
let authToken = null;
let heroSliderState = {
    currentSlide: 0,
    totalSlides: 3,
    isAutoPlaying: true,
    autoPlayInterval: null
};

// DOM elements
const elements = {
    // Navigation
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileNav: document.getElementById('mobileNav'),
    menuIcon: document.getElementById('menuIcon'),
    closeIcon: document.getElementById('closeIcon'),
    navActions: document.getElementById('navActions'),
    userMenu: document.getElementById('userMenu'),
    mobileNavActions: document.getElementById('mobileNavActions'),
    mobileUserMenu: document.getElementById('mobileUserMenu'),
    userName: document.getElementById('userName'),
    mobileUserName: document.getElementById('mobileUserName'),
    
    // Hero Slider
    heroSlider: document.getElementById('heroSlider'),
    heroSlides: document.querySelectorAll('.hero-slide'),
    sliderPrev: document.getElementById('sliderPrev'),
    sliderNext: document.getElementById('sliderNext'),
    indicators: document.querySelectorAll('.indicator'),
    currentSlideCounter: document.getElementById('currentSlide'),
    totalSlidesCounter: document.getElementById('totalSlides'),
    
    // Financial Calculator
    financialCalculatorBtn: document.getElementById('financialCalculatorBtn'),
    calculatorModal: document.getElementById('calculatorModal'),
    calculatorModalClose: document.getElementById('calculatorModalClose'),
    calculatorTabBtns: document.querySelectorAll('.calculator-tab-btn'),
    calculatorTabContents: document.querySelectorAll('.calculator-tab-content'),
    
    // Buttons
    signInBtn: document.getElementById('signInBtn'),
    mobileSignInBtn: document.getElementById('mobileSignInBtn'),
    signOutBtn: document.getElementById('signOutBtn'),
    mobileSignOutBtn: document.getElementById('mobileSignOutBtn'),
    appointmentBtn: document.getElementById('appointmentBtn'),
    mobileAppointmentBtn: document.getElementById('mobileAppointmentBtn'),
    userAppointmentBtn: document.getElementById('userAppointmentBtn'),
    mobileUserAppointmentBtn: document.getElementById('mobileUserAppointmentBtn'),
    heroServicesBtn: document.getElementById('heroServicesBtn'),
    heroConsultationBtn: document.getElementById('heroConsultationBtn'),
    heroFinancialBtn: document.getElementById('heroFinancialBtn'),
    heroFinancialConsultationBtn: document.getElementById('heroFinancialConsultationBtn'),
    heroHealthcareBtn: document.getElementById('heroHealthcareBtn'),
    heroHealthcareConsultationBtn: document.getElementById('heroHealthcareConsultationBtn'),
    servicesConsultationBtn: document.getElementById('servicesConsultationBtn'),
    
    // Modals
    authModal: document.getElementById('authModal'),
    authModalClose: document.getElementById('authModalClose'),
    appointmentModal: document.getElementById('appointmentModal'),
    appointmentModalClose: document.getElementById('appointmentModalClose'),
    
    // Forms
    contactForm: document.getElementById('contactForm'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    bookingForm: document.getElementById('bookingForm'),
    
    // Tab system
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Appointment success
    appointmentSuccess: document.getElementById('appointmentSuccess'),
    appointmentForm: document.getElementById('appointmentForm'),
    confirmationDetails: document.getElementById('confirmationDetails'),
    closeSuccessBtn: document.getElementById('closeSuccessBtn'),
    
    // Toast container
    toastContainer: document.getElementById('toastContainer')
};

// Utility functions
const utils = {
    // Get auth headers for API requests
    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken || CONFIG.supabaseAnonKey}`
        };
    },

    // Show toast notification
    showToast(message, type = 'success', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
        const title = type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Warning';
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    },

    // Show modal
    showModal(modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    },

    // Hide modal
    hideModal(modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    },

    // Set button loading state
    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
        } else {
            button.disabled = false;
        }
    },

    // Smooth scroll to element
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    },

    // Format date for display
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    // Set minimum date for appointment booking (tomorrow)
    setMinDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        const dateInput = document.getElementById('apptDate');
        if (dateInput) {
            dateInput.min = minDate;
        }
    }
};

// API functions
const api = {
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, {
                headers: utils.getAuthHeaders(),
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    },

    async submitContact(formData) {
        return this.request('/contact', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
    },

    async register(userData) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async bookAppointment(appointmentData) {
        return this.request('/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
    },

    async getUserAppointments() {
        return this.request('/user/appointments');
    },

    async getUserProfile() {
        return this.request('/user/profile');
    }
};

// Auth functions (Mock implementation for demo - replace with real Supabase)
const auth = {
    async signIn(email, password) {
        // Mock authentication - replace with real Supabase auth
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (email && password) {
                    // Simulate successful login
                    const user = {
                        id: 'mock-user-id',
                        email: email,
                        user_metadata: {
                            firstName: 'John',
                            lastName: 'Doe'
                        }
                    };
                    
                    currentUser = user;
                    authToken = 'mock-auth-token';
                    
                    // Store in localStorage for persistence
                    localStorage.setItem('hefin_user', JSON.stringify(user));
                    localStorage.setItem('hefin_token', authToken);
                    
                    resolve({ user, session: { access_token: authToken } });
                } else {
                    reject(new Error('Invalid credentials'));
                }
            }, 1000);
        });
    },

    async signOut() {
        return new Promise((resolve) => {
            setTimeout(() => {
                currentUser = null;
                authToken = null;
                localStorage.removeItem('hefin_user');
                localStorage.removeItem('hefin_token');
                resolve();
            }, 500);
        });
    },

    async getSession() {
        // Check localStorage for existing session
        const savedUser = localStorage.getItem('hefin_user');
        const savedToken = localStorage.getItem('hefin_token');
        
        if (savedUser && savedToken) {
            currentUser = JSON.parse(savedUser);
            authToken = savedToken;
            return { user: currentUser, session: { access_token: authToken } };
        }
        
        return { user: null, session: null };
    }
};

// Hero Slider functions
const heroSlider = {
    init() {
        if (!elements.heroSlider) return;
        
        // Initialize slider state
        this.updateSlideCounter();
        this.showSlide(0);
        
        // Add event listeners
        elements.sliderPrev?.addEventListener('click', () => this.prevSlide());
        elements.sliderNext?.addEventListener('click', () => this.nextSlide());
        
        // Indicator click handlers
        elements.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prevSlide();
            } else if (e.key === 'ArrowRight') {
                this.nextSlide();
            }
        });
        
        // Pause auto-play on hover
        elements.heroSlider.addEventListener('mouseenter', () => {
            this.pauseAutoPlay();
        });
        
        elements.heroSlider.addEventListener('mouseleave', () => {
            this.resumeAutoPlay();
        });
        
        // Start auto-play
        this.startAutoPlay();
        
        // Touch/swipe support for mobile
        this.initTouchEvents();
    },

    showSlide(index) {
        // Remove active class from all slides
        elements.heroSlides.forEach(slide => {
            slide.classList.remove('active');
        });
        
        // Remove active class from all indicators
        elements.indicators.forEach(indicator => {
            indicator.classList.remove('active');
        });
        
        // Add active class to current slide and indicator
        if (elements.heroSlides[index]) {
            elements.heroSlides[index].classList.add('active');
        }
        
        if (elements.indicators[index]) {
            elements.indicators[index].classList.add('active');
        }
        
        // Update state
        heroSliderState.currentSlide = index;
        this.updateSlideCounter();
    },

    nextSlide() {
        const nextIndex = (heroSliderState.currentSlide + 1) % heroSliderState.totalSlides;
        this.showSlide(nextIndex);
    },

    prevSlide() {
        const prevIndex = (heroSliderState.currentSlide - 1 + heroSliderState.totalSlides) % heroSliderState.totalSlides;
        this.showSlide(prevIndex);
    },

    goToSlide(index) {
        if (index >= 0 && index < heroSliderState.totalSlides) {
            this.showSlide(index);
        }
    },

    updateSlideCounter() {
        if (elements.currentSlideCounter) {
            elements.currentSlideCounter.textContent = heroSliderState.currentSlide + 1;
        }
        if (elements.totalSlidesCounter) {
            elements.totalSlidesCounter.textContent = heroSliderState.totalSlides;
        }
    },

    startAutoPlay() {
        if (heroSliderState.autoPlayInterval) {
            clearInterval(heroSliderState.autoPlayInterval);
        }
        
        heroSliderState.autoPlayInterval = setInterval(() => {
            if (heroSliderState.isAutoPlaying) {
                this.nextSlide();
            }
        }, 8000); // Change slide every 8 seconds
    },

    pauseAutoPlay() {
        heroSliderState.isAutoPlaying = false;
    },

    resumeAutoPlay() {
        heroSliderState.isAutoPlaying = true;
    },

    stopAutoPlay() {
        if (heroSliderState.autoPlayInterval) {
            clearInterval(heroSliderState.autoPlayInterval);
            heroSliderState.autoPlayInterval = null;
        }
        heroSliderState.isAutoPlaying = false;
    },

    initTouchEvents() {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        
        elements.heroSlider.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        elements.heroSlider.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Only handle horizontal swipes if they're more significant than vertical
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    // Swipe left - next slide
                    this.nextSlide();
                } else {
                    // Swipe right - previous slide
                    this.prevSlide();
                }
            }
        });
    }
};

// Navigation functions
const navigation = {
    init() {
        // Mobile menu toggle
        elements.mobileMenuBtn.addEventListener('click', this.toggleMobileMenu);
        
        // Close mobile menu when clicking links
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                utils.scrollToElement(targetId);
                this.closeMobileMenu();
            });
        });
    },

    toggleMobileMenu() {
        const isOpen = !elements.mobileNav.classList.contains('hidden');
        
        if (isOpen) {
            navigation.closeMobileMenu();
        } else {
            navigation.openMobileMenu();
        }
    },

    openMobileMenu() {
        elements.mobileNav.classList.remove('hidden');
        elements.menuIcon.classList.add('hidden');
        elements.closeIcon.classList.remove('hidden');
    },

    closeMobileMenu() {
        elements.mobileNav.classList.add('hidden');
        elements.menuIcon.classList.remove('hidden');
        elements.closeIcon.classList.add('hidden');
    },

    updateAuthUI(user) {
        if (user) {
            // Show authenticated state
            elements.navActions.classList.add('hidden');
            elements.userMenu.classList.remove('hidden');
            elements.mobileNavActions.classList.add('hidden');
            elements.mobileUserMenu.classList.remove('hidden');
            
            const displayName = user.user_metadata?.firstName || user.email.split('@')[0];
            elements.userName.textContent = displayName;
            elements.mobileUserName.textContent = displayName;
        } else {
            // Show unauthenticated state
            elements.navActions.classList.remove('hidden');
            elements.userMenu.classList.add('hidden');
            elements.mobileNavActions.classList.remove('hidden');
            elements.mobileUserMenu.classList.add('hidden');
        }
    }
};

// Financial Calculator functions
const financialCalculator = {
    init() {
        // Calculator modal
        elements.financialCalculatorBtn?.addEventListener('click', () => utils.showModal(elements.calculatorModal));
        elements.calculatorModalClose?.addEventListener('click', () => utils.hideModal(elements.calculatorModal));
        
        // Calculator tabs
        elements.calculatorTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const calcType = btn.dataset.calc;
                this.switchCalculatorTab(calcType);
            });
        });
        
        // Close modal when clicking outside
        elements.calculatorModal?.addEventListener('click', (e) => {
            if (e.target === elements.calculatorModal) {
                utils.hideModal(elements.calculatorModal);
            }
        });
    },

    switchCalculatorTab(calcType) {
        // Update buttons
        elements.calculatorTabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.calc === calcType);
        });

        // Update content
        elements.calculatorTabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${calcType}Calc`);
        });
    }
};

// Calculator functions (global for onclick handlers)
function calculateRetirement() {
    const currentAge = parseFloat(document.getElementById('retCurrentAge').value);
    const retirementAge = parseFloat(document.getElementById('retRetirementAge').value);
    const currentSavings = parseFloat(document.getElementById('retCurrentSavings').value) || 0;
    const monthlyContribution = parseFloat(document.getElementById('retMonthlyContribution').value) || 0;
    const expectedReturn = parseFloat(document.getElementById('retExpectedReturn').value) / 100;
    
    const yearsToRetirement = retirementAge - currentAge;
    const monthsToRetirement = yearsToRetirement * 12;
    const monthlyReturn = expectedReturn / 12;
    
    // Future value of current savings
    const futureCurrentSavings = currentSavings * Math.pow(1 + expectedReturn, yearsToRetirement);
    
    // Future value of monthly contributions (annuity)
    const futureContributions = monthlyContribution * 
        ((Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn);
    
    const totalContributions = currentSavings + (monthlyContribution * monthsToRetirement);
    const finalAmount = futureCurrentSavings + futureContributions;
    const totalEarnings = finalAmount - totalContributions;

    // Display results
    document.getElementById('retFinalAmount').textContent = utils.formatCurrency(finalAmount);
    document.getElementById('retTotalContributions').textContent = utils.formatCurrency(totalContributions);
    document.getElementById('retTotalEarnings').textContent = utils.formatCurrency(totalEarnings);
    document.getElementById('retirementResults').style.display = 'block';
}

function calculateHSA() {
    const age = parseFloat(document.getElementById('hsaAge').value);
    const yearsToRetirement = parseFloat(document.getElementById('hsaYearsToRetirement').value);
    const currentBalance = parseFloat(document.getElementById('hsaCurrentBalance').value) || 0;
    const annualContribution = parseFloat(document.getElementById('hsaAnnualContribution').value) || 0;
    const employerContribution = parseFloat(document.getElementById('hsaEmployerContribution').value) || 0;
    const taxBracket = parseFloat(document.getElementById('hsaTaxBracket').value) / 100;
    const expectedReturn = 0.05; // 5% default
    
    const totalAnnualContribution = annualContribution + employerContribution;
    const totalContributions = totalAnnualContribution * yearsToRetirement;
    
    // Calculate future value
    const futureCurrentBalance = currentBalance * Math.pow(1 + expectedReturn, yearsToRetirement);
    const futureContributions = totalAnnualContribution * 
        ((Math.pow(1 + expectedReturn, yearsToRetirement) - 1) / expectedReturn);
    
    const projectedBalance = futureCurrentBalance + futureContributions;
    const annualTaxSavings = totalAnnualContribution * taxBracket;
    const totalTaxSavings = totalContributions * taxBracket;

    // Display results
    document.getElementById('hsaFinalAmount').textContent = utils.formatCurrency(projectedBalance);
    document.getElementById('hsaAnnualTaxSavings').textContent = utils.formatCurrency(annualTaxSavings);
    document.getElementById('hsaTotalTaxSavings').textContent = utils.formatCurrency(totalTaxSavings);
    document.getElementById('hsaResults').style.display = 'block';
}

function calculateHealthcare() {
    const currentAge = parseFloat(document.getElementById('healthCurrentAge').value);
    const retirementAge = parseFloat(document.getElementById('healthRetirementAge').value);
    const currentCosts = parseFloat(document.getElementById('healthCurrentCosts').value) || 0;
    const healthcareInflation = parseFloat(document.getElementById('healthInflation').value) / 100;
    const yearsInRetirement = parseFloat(document.getElementById('healthYearsInRetirement').value);
    
    const yearsToRetirement = retirementAge - currentAge;
    
    // Healthcare costs at retirement (adjusted for inflation)
    const costsAtRetirement = currentCosts * Math.pow(1 + healthcareInflation, yearsToRetirement);
    
    // Total healthcare costs during retirement (simplified calculation)
    const avgCostsInRetirement = costsAtRetirement * Math.pow(1 + healthcareInflation, yearsInRetirement / 2);
    const totalCost = avgCostsInRetirement * yearsInRetirement;
    
    // Monthly savings needed
    const monthlySavingsNeeded = totalCost / (yearsToRetirement * 12);

    // Display results
    document.getElementById('healthTotalCost').textContent = utils.formatCurrency(totalCost);
    document.getElementById('healthMonthlySavings').textContent = utils.formatCurrency(monthlySavingsNeeded);
    document.getElementById('healthCostsAtRetirement').textContent = utils.formatCurrency(costsAtRetirement);
    document.getElementById('healthcareResults').style.display = 'block';
}

function calculateInvestment() {
    const initialAmount = parseFloat(document.getElementById('invInitialAmount').value) || 0;
    const monthlyContribution = parseFloat(document.getElementById('invMonthlyContribution').value) || 0;
    const expectedReturn = parseFloat(document.getElementById('invExpectedReturn').value) / 100;
    const timeHorizon = parseFloat(document.getElementById('invTimeHorizon').value);
    
    const months = timeHorizon * 12;
    const monthlyReturn = expectedReturn / 12;
    
    // Future value of initial investment
    const futureInitial = initialAmount * Math.pow(1 + expectedReturn, timeHorizon);
    
    // Future value of monthly contributions
    const futureContributions = monthlyContribution * 
        ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn);
    
    const totalContributions = initialAmount + (monthlyContribution * months);
    const finalAmount = futureInitial + futureContributions;
    const totalEarnings = finalAmount - totalContributions;

    // Display results
    document.getElementById('invFinalAmount').textContent = utils.formatCurrency(finalAmount);
    document.getElementById('invTotalContributions').textContent = utils.formatCurrency(totalContributions);
    document.getElementById('invTotalEarnings').textContent = utils.formatCurrency(totalEarnings);
    document.getElementById('investmentResults').style.display = 'block';
}

// Modal functions
const modals = {
    init() {
        // Auth modal
        elements.signInBtn?.addEventListener('click', () => utils.showModal(elements.authModal));
        elements.mobileSignInBtn?.addEventListener('click', () => utils.showModal(elements.authModal));
        elements.authModalClose?.addEventListener('click', () => utils.hideModal(elements.authModal));

        // Appointment modal
        [
            elements.appointmentBtn,
            elements.mobileAppointmentBtn,
            elements.userAppointmentBtn,
            elements.mobileUserAppointmentBtn,
            elements.heroConsultationBtn,
            elements.heroFinancialConsultationBtn,
            elements.heroHealthcareConsultationBtn,
            elements.servicesConsultationBtn
        ].forEach(btn => {
            btn?.addEventListener('click', () => {
                this.resetAppointmentModal();
                utils.showModal(elements.appointmentModal);
            });
        });
        
        elements.appointmentModalClose?.addEventListener('click', () => utils.hideModal(elements.appointmentModal));
        elements.closeSuccessBtn?.addEventListener('click', () => utils.hideModal(elements.appointmentModal));

        // Close modals when clicking outside
        [elements.authModal, elements.appointmentModal].forEach(modal => {
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) {
                    utils.hideModal(modal);
                }
            });
        });

        // Tab system
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });
    },

    switchTab(tabName) {
        // Update buttons
        elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update content
        elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });
    },

    resetAppointmentModal() {
        elements.appointmentSuccess.classList.add('hidden');
        elements.appointmentForm.classList.remove('hidden');
        elements.bookingForm.reset();
    }
};

// Form handlers
const forms = {
    init() {
        // Contact form
        elements.contactForm?.addEventListener('submit', this.handleContactForm);
        
        // Auth forms
        elements.loginForm?.addEventListener('submit', this.handleLoginForm);
        elements.registerForm?.addEventListener('submit', this.handleRegisterForm);
        
        // Booking form
        elements.bookingForm?.addEventListener('submit', this.handleBookingForm);
        
        // Sign out buttons
        elements.signOutBtn?.addEventListener('click', this.handleSignOut);
        elements.mobileSignOutBtn?.addEventListener('click', this.handleSignOut);
        
        // Service buttons
        elements.heroServicesBtn?.addEventListener('click', () => {
            utils.scrollToElement('services');
        });
        
        elements.heroFinancialBtn?.addEventListener('click', () => {
            utils.scrollToElement('services');
        });
        
        elements.heroHealthcareBtn?.addEventListener('click', () => {
            utils.scrollToElement('services');
        });

        // Set minimum date for appointment booking
        utils.setMinDate();
    },

    async handleContactForm(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            utils.setButtonLoading(submitBtn, true);
            
            const result = await api.submitContact(data);
            
            utils.showToast(`Message sent successfully! We'll respond within ${result.estimatedResponse || '24 hours'}.`);
            e.target.reset();
        } catch (error) {
            utils.showToast(error.message, 'error');
        } finally {
            utils.setButtonLoading(submitBtn, false);
        }
    },

    async handleLoginForm(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            utils.setButtonLoading(submitBtn, true);
            
            const result = await auth.signIn(data.email, data.password);
            
            utils.showToast('Successfully logged in!');
            navigation.updateAuthUI(result.user);
            utils.hideModal(elements.authModal);
            e.target.reset();
        } catch (error) {
            utils.showToast(error.message, 'error');
        } finally {
            utils.setButtonLoading(submitBtn, false);
        }
    },

    async handleRegisterForm(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            utils.setButtonLoading(submitBtn, true);
            
            const result = await api.register(data);
            
            utils.showToast('Registration successful! Please log in with your credentials.');
            modals.switchTab('login');
            e.target.reset();
        } catch (error) {
            utils.showToast(error.message, 'error');
        } finally {
            utils.setButtonLoading(submitBtn, false);
        }
    },

    async handleBookingForm(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            utils.setButtonLoading(submitBtn, true);
            
            const result = await api.bookAppointment(data);
            
            // Show success view
            elements.appointmentForm.classList.add('hidden');
            elements.appointmentSuccess.classList.remove('hidden');
            
            // Update confirmation details
            elements.confirmationDetails.innerHTML = `
                <div class="confirmation-detail">
                    <span class="label">📅 Date:</span>
                    <span>${utils.formatDate(data.appointmentDate)}</span>
                </div>
                <div class="confirmation-detail">
                    <span class="label">🕒 Time:</span>
                    <span>${data.appointmentTime}</span>
                </div>
                <div class="confirmation-detail">
                    <span class="label">🏥 Service:</span>
                    <span style="text-transform: capitalize;">${data.serviceType.replace('_', ' ')}</span>
                </div>
            `;
            
            utils.showToast('Appointment booked successfully!');
        } catch (error) {
            utils.showToast(error.message, 'error');
        } finally {
            utils.setButtonLoading(submitBtn, false);
        }
    },

    async handleSignOut() {
        try {
            await auth.signOut();
            navigation.updateAuthUI(null);
            utils.showToast('Successfully signed out');
        } catch (error) {
            utils.showToast('Error signing out', 'error');
        }
    }
};

// Scroll effects
const scrollEffects = {
    init() {
        window.addEventListener('scroll', this.handleScroll);
    },

    handleScroll() {
        // Add scroll effect to navigation
        const nav = document.querySelector('.nav-container');
        if (window.scrollY > 50) {
            nav.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            nav.style.backdropFilter = 'blur(10px)';
        } else {
            nav.style.backgroundColor = 'var(--color-background)';
            nav.style.backdropFilter = 'none';
        }
    }
};

// Initialize app
const app = {
    async init() {
        // Check for existing session
        const { user } = await auth.getSession();
        if (user) {
            currentUser = user;
            navigation.updateAuthUI(user);
        }

        // Initialize modules
        heroSlider.init();
        navigation.init();
        financialCalculator.init();
        modals.init();
        forms.init();
        scrollEffects.init();

        // Show initial toast
        setTimeout(() => {
            utils.showToast('Welcome to HEFIN - Your integrated healthcare and financial partner!');
        }, 2000);

        console.log('HEFIN website initialized successfully');
    }
};

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', app.init);

// Handle page visibility for session management and slider
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        // Check session when page becomes visible
        const { user } = await auth.getSession();
        if (user !== currentUser) {
            currentUser = user;
            navigation.updateAuthUI(user);
        }
        
        // Resume slider auto-play
        heroSlider.resumeAutoPlay();
    } else {
        // Pause slider when page is hidden
        heroSlider.pauseAutoPlay();
    }
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e);
    utils.showToast('An unexpected error occurred. Please try again.', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e);
    utils.showToast('An unexpected error occurred. Please try again.', 'error');
});

// Clean up intervals when page unloads
window.addEventListener('beforeunload', () => {
    heroSlider.stopAutoPlay();
});
