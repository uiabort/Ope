/**
 * MegaBlox Website Tracker
 * 
 * This script tracks user interactions on the MegaBlox website and sends the data
 * to a specified webhook URL for analytics purposes.
 * 
 * Features:
 * - Page view tracking
 * - Click tracking
 * - Scroll depth tracking
 * - Time on page tracking
 * - Admin action tracking
 * - Form submission tracking
 */

// MegaBlox Tracker Configuration
const MEGABLOX_TRACKER = {
    // Discord webhook URL
    webhookUrl: "https://discord.com/api/webhooks/1367911855766372434/xef7LE8EownXVS-cICj-9md14PF_YHc3-o1DUEAnPJBV4czwUT77AvYtDymV1DGcCKCe",
    
    // Site identifier
    siteId: "megablox-main",
    
    // Enable/disable specific tracking features
    features: {
        pageView: true,
        clicks: true,
        scrollDepth: true,
        timeOnPage: true,
        adminActions: true,
        formSubmissions: true
    },

    // Initialize the tracker
    init: function() {
        // Check if webhook URL is configured
        if (!this.webhookUrl) {
            console.warn("MegaBlox Tracker: Please configure a valid webhook URL");
        }

        // Track initial page view
        if (this.features.pageView) {
            this.trackPageView();
        }

        // Set up click tracking
        if (this.features.clicks) {
            document.addEventListener('click', this.handleClick.bind(this));
        }

        // Set up scroll depth tracking
        if (this.features.scrollDepth) {
            window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 500));
        }

        // Set up time on page tracking
        if (this.features.timeOnPage) {
            this.startTimeTracking();
        }

        // Track form submissions
        if (this.features.formSubmissions) {
            this.setupFormTracking();
        }

        // Track admin actions if on admin pages
        if (this.features.adminActions && window.location.pathname.includes('admin')) {
            this.setupAdminTracking();
        }

        // Track page exit
        window.addEventListener('beforeunload', this.handlePageExit.bind(this));

        console.log("MegaBlox Tracker initialized");
    },

    // Send data to webhook
    sendToWebhook: function(eventType, eventData = {}) {
        // Skip if webhook URL is not properly configured
        if (!this.webhookUrl) {
            return;
        }

        // Prepare payload
        const payload = {
            siteId: this.siteId,
            timestamp: new Date().toISOString(),
            eventType: eventType,
            page: {
                title: document.title,
                url: window.location.href,
                path: window.location.pathname,
                referrer: document.referrer
            },
            visitor: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                screenSize: `${window.innerWidth}x${window.innerHeight}`
            },
            data: eventData
        };

        // Send to webhook
        fetch(this.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            // Use keepalive to ensure the request completes even if the page is being unloaded
            keepalive: true
        }).catch(error => {
            console.error("MegaBlox Tracker error:", error);
        });
    },

    // Track page view
    trackPageView: function() {
        const pageType = this.getPageType();
        this.sendToWebhook('pageview', { pageType });
    },

    // Handle click event
    handleClick: function(e) {
        // Get the clicked element
        const target = e.target;
        
        // Find if the click was on or within a product
        const productElement = target.closest('.product');
        const isProductClick = !!productElement;
        
        // Check if click was on a button
        const isButton = target.tagName === 'BUTTON' || target.classList.contains('btn');
        
        // Check if click was on a navigation link
        const isNavLink = target.closest('nav') !== null && target.tagName === 'A';
        
        // Get link URL if applicable
        const linkElement = target.closest('a');
        const linkUrl = linkElement ? linkElement.href : null;
        
        // Prepare click data
        const clickData = {
            element: target.tagName.toLowerCase(),
            elementId: target.id || null,
            elementClass: target.className || null,
            isButton,
            isNavLink,
            linkUrl,
            isProductClick,
            productInfo: isProductClick ? this.extractProductInfo(productElement) : null,
            position: {
                x: e.clientX,
                y: e.clientY
            }
        };
        
        this.sendToWebhook('click', clickData);
    },

    // Extract product information
    extractProductInfo: function(productElement) {
        if (!productElement) return null;
        
        const productName = productElement.querySelector('h4') ? 
            productElement.querySelector('h4').textContent : 'Unknown Product';
            
        const productPrice = productElement.querySelector('.price') ? 
            productElement.querySelector('.price').textContent : null;
            
        return {
            name: productName,
            price: productPrice
        };
    },

    // Track scroll depth
    handleScroll: function() {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPosition = window.scrollY;
        const scrollPercentage = Math.round((scrollPosition / scrollHeight) * 100);
        
        // Store max scroll depth
        if (!this.maxScrollDepth || scrollPercentage > this.maxScrollDepth) {
            this.maxScrollDepth = scrollPercentage;
            
            // Report at 25%, 50%, 75%, 100%
            if (scrollPercentage % 25 === 0) {
                this.sendToWebhook('scroll', { depth: scrollPercentage });
            }
        }
    },

    // Start tracking time on page
    startTimeTracking: function() {
        this.pageLoadTime = Date.now();
        this.timeSpent = 0;
        
        // Report every 30 seconds
        this.timeInterval = setInterval(() => {
            this.timeSpent += 30;
            this.sendToWebhook('timeOnPage', { seconds: this.timeSpent });
        }, 30000);
    },

    // Handle page exit
    handlePageExit: function() {
        clearInterval(this.timeInterval);
        
        const timeSpent = Math.round((Date.now() - this.pageLoadTime) / 1000);
        this.sendToWebhook('pageExit', { 
            timeSpent, 
            maxScrollDepth: this.maxScrollDepth || 0 
        });
    },

    // Setup form tracking
    setupFormTracking: function() {
        // Contact form
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                const formData = {
                    formType: 'contact',
                    subject: document.getElementById('subject')?.value || 'No subject'
                };
                this.sendToWebhook('formSubmit', formData);
            });
        }
        
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                const formData = {
                    formType: 'login',
                    username: document.getElementById('username')?.value
                };
                this.sendToWebhook('formSubmit', formData);
            });
        }
    },

    // Setup admin action tracking
    setupAdminTracking: function() {
        // Track product actions
        document.addEventListener('click', (e) => {
            // Product edit
            if (e.target.classList.contains('edit-btn')) {
                const productId = e.target.getAttribute('data-id');
                this.sendToWebhook('adminAction', { 
                    action: 'editProduct',
                    productId
                });
            }
            
            // Product delete
            if (e.target.classList.contains('delete-btn')) {
                const productId = e.target.getAttribute('data-id');
                this.sendToWebhook('adminAction', { 
                    action: 'deleteProduct',
                    productId
                });
            }
        });
        
        // Track product form submission
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                const productId = document.getElementById('product-id').value;
                const productName = document.getElementById('product-name').value;
                
                this.sendToWebhook('adminAction', { 
                    action: productId ? 'updateProduct' : 'addProduct',
                    productId: productId || 'new',
                    productName
                });
            });
        }
        
        // Track logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.sendToWebhook('adminAction', { action: 'logout' });
            });
        }
    },

    // Get current page type
    getPageType: function() {
        const path = window.location.pathname;
        
        if (path.includes('index.html') || path === '/' || path === '') {
            return 'home';
        } else if (path.includes('products.html')) {
            return 'products';
        } else if (path.includes('about.html')) {
            return 'about';
        } else if (path.includes('contact.html')) {
            return 'contact';
        } else if (path.includes('admin.html')) {
            return 'admin-login';
        } else if (path.includes('admin_dashboard.html')) {
            return 'admin-dashboard';
        } else {
            return 'unknown';
        }
    },

    // Utility: Throttle function to limit execution frequency
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Initialize tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    MEGABLOX_TRACKER.init();
});
