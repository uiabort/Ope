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

    // Debug mode
    debug: true,

    // Initialize the tracker
    init: function() {
        // Check if webhook URL is configured
        if (!this.webhookUrl) {
            console.warn("MegaBlox Tracker: Please configure a valid webhook URL");
        }

        // Log initialization
        this.logDebug("Tracker initialized");

        // Track initial page view
        if (this.features.pageView) {
            this.trackPageView();
        }

        // Set up click tracking
        if (this.features.clicks) {
            document.addEventListener('click', this.handleClick.bind(this));
            this.logDebug("Click tracking enabled");
        }

        // Set up scroll depth tracking
        if (this.features.scrollDepth) {
            window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 500));
            this.logDebug("Scroll tracking enabled");
        }

        // Set up time on page tracking
        if (this.features.timeOnPage) {
            this.startTimeTracking();
            this.logDebug("Time tracking enabled");
        }

        // Track form submissions
        if (this.features.formSubmissions) {
            this.setupFormTracking();
            this.logDebug("Form tracking enabled");
        }

        // Track admin actions if on admin pages
        if (this.features.adminActions && window.location.pathname.includes('admin')) {
            this.setupAdminTracking();
            this.logDebug("Admin tracking enabled");
        }

        // Track page exit
        window.addEventListener('beforeunload', this.handlePageExit.bind(this));

        console.log("MegaBlox Tracker initialized successfully");
    },

    // Debug logging
    logDebug: function(message, data) {
        if (this.debug) {
            if (data) {
                console.log(`MegaBlox Tracker: ${message}`, data);
            } else {
                console.log(`MegaBlox Tracker: ${message}`);
            }
        }
    },

    // Send data to webhook
    sendToWebhook: function(eventType, eventData = {}) {
        // Show visual confirmation in debug mode
        if (this.debug) {
            const debugInfo = document.createElement('div');
            debugInfo.style.position = 'fixed';
            debugInfo.style.bottom = '10px';
            debugInfo.style.right = '10px';
            debugInfo.style.backgroundColor = 'rgba(74, 105, 189, 0.9)';
            debugInfo.style.color = 'white';
            debugInfo.style.padding = '10px';
            debugInfo.style.borderRadius = '5px';
            debugInfo.style.fontSize = '12px';
            debugInfo.style.zIndex = '9999';
            debugInfo.style.maxWidth = '300px';
            debugInfo.textContent = `Event tracked: ${eventType}`;
            document.body.appendChild(debugInfo);
            setTimeout(() => {
                debugInfo.remove();
            }, 3000);
        }

        // Skip if webhook URL is not properly configured
        if (!this.webhookUrl) {
            this.logDebug("Webhook URL not configured, skipping send");
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

        this.logDebug(`Sending ${eventType} event to webhook:`, payload);

        // Send to webhook
        fetch(this.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: `MegaBlox Event: ${eventType}`,
                embeds: [{
                    title: `MegaBlox Tracker - ${eventType}`,
                    description: `Event from ${payload.page.path}`,
                    color: 3447003,
                    fields: [
                        {
                            name: "Event Data",
                            value: "```json\n" + JSON.stringify(eventData, null, 2) + "\n```"
                        },
                        {
                            name: "Page",
                            value: payload.page.url
                        },
                        {
                            name: "Timestamp",
                            value: payload.timestamp
                        }
                    ]
                }]
            }),
            // Use keepalive to ensure the request completes even if the page is being unloaded
            keepalive: true
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            this.logDebug("Event sent successfully");
            return response.text();
        })
        .catch(error => {
            console.error("MegaBlox Tracker error:", error);
        });
    },

    // Track page view
    trackPageView: function() {
        const pageType = this.getPageType();
        this.logDebug(`Page view tracked: ${pageType}`);
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
        
        this.logDebug("Click tracked:", clickData);
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
                this.logDebug(`Scroll depth tracked: ${scrollPercentage}%`);
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
            this.logDebug(`Time on page: ${this.timeSpent} seconds`);
            this.sendToWebhook('timeOnPage', { seconds: this.timeSpent });
        }, 30000);
    },

    // Handle page exit
    handlePageExit: function() {
        clearInterval(this.timeInterval);
        
        const timeSpent = Math.round((Date.now() - this.pageLoadTime) / 1000);
        this.logDebug(`Page exit tracked: ${timeSpent} seconds, scroll depth: ${this.maxScrollDepth || 0}%`);
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
                this.logDebug("Contact form submission tracked:", formData);
                this.sendToWebhook('formSubmit', formData);
            });
            this.logDebug("Contact form tracking enabled");
        }
        
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                const formData = {
                    formType: 'login',
                    username: document.getElementById('username')?.value
                };
                this.logDebug("Login form submission tracked:", formData);
                this.sendToWebhook('formSubmit', formData);
            });
            this.logDebug("Login form tracking enabled");
        }
    },

    // Setup admin action tracking
    setupAdminTracking: function() {
        // Track product actions
        document.addEventListener('click', (e) => {
            // Product edit
            if (e.target.classList.contains('edit-btn')) {
                const productId = e.target.getAttribute('data-id');
                this.logDebug(`Admin action tracked: Edit product ${productId}`);
                this.sendToWebhook('adminAction', { 
                    action: 'editProduct',
                    productId
                });
            }
            
            // Product delete
            if (e.target.classList.contains('delete-btn')) {
                const productId = e.target.getAttribute('data-id');
                this.logDebug(`Admin action tracked: Delete product ${productId}`);
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
                
                const action = productId ? 'updateProduct' : 'addProduct';
                this.logDebug(`Admin action tracked: ${action} - ${productName}`);
                
                this.sendToWebhook('adminAction', { 
                    action,
                    productId: productId || 'new',
                    productName
                });
            });
            this.logDebug("Product form tracking enabled");
        }
        
        // Track logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logDebug("Admin action tracked: Logout");
                this.sendToWebhook('adminAction', { action: 'logout' });
            });
            this.logDebug("Logout button tracking enabled");
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
    },

    // Test webhook connection
    testWebhook: function() {
        this.sendToWebhook('test', { message: 'This is a test event' });
        console.log("Test event sent to webhook");
    }
};

// Initialize tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing MegaBlox Tracker...");
    MEGABLOX_TRACKER.init();
    
    // Add a test button in debug mode
    if (MEGABLOX_TRACKER.debug) {
        const testButton = document.createElement('button');
        testButton.textContent = 'Test Tracker';
        testButton.style.position = 'fixed';
        testButton.style.bottom = '10px';
        testButton.style.left = '10px';
        testButton.style.zIndex = '9999';
        testButton.style.padding = '8px 12px';
        testButton.style.backgroundColor = '#4a69bd';
        testButton.style.color = 'white';
        testButton.style.border = 'none';
        testButton.style.borderRadius = '5px';
        testButton.style.cursor = 'pointer';
        
        testButton.addEventListener('click', function() {
            MEGABLOX_TRACKER.testWebhook();
        });
        
        document.body.appendChild(testButton);
    }
});
