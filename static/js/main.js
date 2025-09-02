class QueryWeaverDemo {
    constructor() {
        this.examples = [
            {
                q: "Show me the top 5 customers by order count in London.",
                sql: `SELECT c.companyName, COUNT(o.orderID) AS order_count\nFROM customers c\nJOIN orders o ON c.customerID = o.customerID\nWHERE c.city = 'London'\nGROUP BY c.companyName\nORDER BY order_count DESC\nLIMIT 5;`,
                complexity: 1
            },
            {
                q: "What's the average order value by customer segment this quarter?",
                sql: `SELECT \n  c.segment,\n  AVG(od.unitPrice * od.quantity) as avg_order_value,\n  COUNT(DISTINCT o.orderID) as total_orders\nFROM customers c\nJOIN orders o ON c.customerID = o.customerID\nJOIN order_details od ON o.orderID = od.orderID\nWHERE EXTRACT(QUARTER FROM o.orderDate) = EXTRACT(QUARTER FROM CURRENT_DATE)\n  AND EXTRACT(YEAR FROM o.orderDate) = EXTRACT(YEAR FROM CURRENT_DATE)\nGROUP BY c.segment\nORDER BY avg_order_value DESC;`,
                complexity: 2
            },
            {
                q: "Show Q4 revenue by customer segment with year-over-year comparison",
                sql: `WITH quarterly_revenue AS (\n  SELECT \n    c.segment,\n    EXTRACT(YEAR FROM o.orderDate) as year,\n    SUM(od.unitPrice * od.quantity) as revenue\n  FROM customers c\n  JOIN orders o ON c.customerID = o.customerID\n  JOIN order_details od ON o.orderID = od.orderID\n  WHERE EXTRACT(QUARTER FROM o.orderDate) = 4\n  GROUP BY c.segment, EXTRACT(YEAR FROM o.orderDate)\n)\nSELECT \n  qr.segment,\n  COALESCE(current_year.revenue, 0) as q4_2024_revenue,\n  COALESCE(previous_year.revenue, 0) as q4_2023_revenue,\n  ROUND(\n    ((COALESCE(current_year.revenue, 0) - COALESCE(previous_year.revenue, 0)) \n     / NULLIF(previous_year.revenue, 0)) * 100, 2\n  ) as yoy_growth_percent\nFROM (SELECT DISTINCT segment FROM quarterly_revenue) qr\nLEFT JOIN quarterly_revenue current_year ON qr.segment = current_year.segment AND current_year.year = 2024\nLEFT JOIN quarterly_revenue previous_year ON qr.segment = previous_year.segment AND previous_year.year = 2023\nORDER BY q4_2024_revenue DESC;`,
                complexity: 3
            }
        ];
        
        this.currentIndex = 0;
        this.typingTimer = null;
        this.isTyping = false;
        this.observer = null;
        
        this.init();
    }

    init() {
        try {
            this.initTabs();
            this.initDemo();
            this.bindEvents();
            this.initIntersectionObserver();
            this.startInitialDemo();
        } catch (error) {
            console.error('Demo initialization failed:', error);
            this.showErrorFallback();
        }
    }

    initTabs() {
        const tabs = document.querySelectorAll('.demo-tab');
        const contents = document.querySelectorAll('.demo-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.getAttribute('data-tab');
                this.switchToTab(targetId);
            });

            tab.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    tab.click();
                }
            });
        });
    }

    switchToTab(targetId) {
        const tabs = document.querySelectorAll('.demo-tab');
        const contents = document.querySelectorAll('.demo-content');
        
        tabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });
        contents.forEach(c => c.classList.remove('active'));
        
        const targetTab = document.querySelector(`[data-tab="${targetId}"]`);
        const targetContent = document.getElementById(targetId);
        
        if (targetTab && targetContent) {
            targetTab.classList.add('active');
            targetTab.setAttribute('aria-selected', 'true');
            targetContent.classList.add('active');
        }
    }

    initDemo() {
        const btn = document.getElementById('demo-next');
        if (btn) {
            btn.addEventListener('click', () => this.nextExample());
        }

        const runDemoBtn = document.getElementById('run-demo-btn');
        if (runDemoBtn) {
            runDemoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchToTab('live-demo');
                this.scrollToDemoCard();
                
                // Analytics event
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'demo_started', {
                        'event_category': 'engagement'
                    });
                }
            });
        }
    }

    bindEvents() {
        // Add setup link scroll behavior
        const setupLink = document.querySelector('a[href="#setup"]');
        if (setupLink) {
            setupLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchToTab('setup-guide');
                this.scrollToDemoCard();
            });
        }

        // Handle video placeholder clicks
        document.querySelectorAll('.video-placeholder').forEach(placeholder => {
            placeholder.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    placeholder.click();
                }
            });
        });
    }

    initIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.classList.add('animate');
                        }, index * 150);
                        this.observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            document.querySelectorAll('.feature-card').forEach(card => {
                this.observer.observe(card);
            });
        }
    }

    scrollToDemoCard() {
        const demoCard = document.querySelector('.demo-card');
        if (demoCard) {
            setTimeout(() => {
                demoCard.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
        }
    }

    startInitialDemo() {
        const firstExample = this.examples[0];
        this.updateQuestion(firstExample.q, firstExample.complexity);
        this.typeSQL(firstExample.sql);
    }

    nextExample() {
        if (this.isTyping) return;
        
        this.currentIndex = (this.currentIndex + 1) % this.examples.length;
        const example = this.examples[this.currentIndex];
        
        this.updateQuestion(example.q, example.complexity);
        this.typeSQL(example.sql);

        // Analytics event
        if (typeof gtag !== 'undefined') {
            gtag('event', 'demo_question_changed', {
                'event_category': 'engagement',
                'question_index': this.currentIndex
            });
        }
    }

    updateQuestion(question, complexity) {
        const questionEl = document.querySelector('.demo-question');
        const complexityDots = document.querySelectorAll('.complexity-dot');
        
        if (questionEl) {
            questionEl.textContent = question;
            questionEl.classList.add('updated');
            setTimeout(() => questionEl.classList.remove('updated'), 300);
            
            // Focus for screen readers
            setTimeout(() => {
                questionEl.focus();
                setTimeout(() => questionEl.blur(), 100);
            }, 100);
        }

        // Update complexity indicators
        complexityDots.forEach((dot, index) => {
            if (index < complexity) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
    }

    typeSQL(sql) {
        const sqlEl = document.getElementById('demo-sql');
        const successEl = document.getElementById('success-indicator');
        
        if (!sqlEl) return;

        this.isTyping = true;
        
        // Hide success indicator and start typing animation
        if (successEl) successEl.classList.remove('show');
        
        if (this.typingTimer) {
            clearInterval(this.typingTimer);
            this.typingTimer = null;
        }

        // Check for reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            // Instant display for reduced motion
            sqlEl.innerHTML = this.highlightSQL(sql);
            this.isTyping = false;
            if (successEl) {
                setTimeout(() => successEl.classList.add('show'), 100);
            }
            return;
        }

        sqlEl.classList.add('typing');
        sqlEl.innerHTML = '';
        
        let position = 0;
        // Dynamic typing speed based on content length
        const typingSpeed = Math.max(15, Math.min(40, sql.length / 20));
        
        this.typingTimer = setInterval(() => {
            position += 1;
            if (sqlEl) {
                sqlEl.innerHTML = this.highlightSQL(sql.slice(0, position));
            }
            
            if (position >= sql.length) {
                clearInterval(this.typingTimer);
                this.typingTimer = null;
                this.isTyping = false;
                sqlEl.classList.remove('typing');
                if (sqlEl) {
                    sqlEl.innerHTML = this.highlightSQL(sql);
                }
                // Show success indicator with delay and animation
                setTimeout(() => {
                    if (successEl) successEl.classList.add('show');
                }, 200);
            }
        }, typingSpeed);
    }

    highlightSQL(sql) {
        if (!sql) return '';
        
        let highlighted = this.escapeHtml(sql);
        
        // Highlight strings
        highlighted = highlighted.replace(/('[^']*')/g, '<span class="sql-string">$1</span>');
        
        // Highlight keywords
        highlighted = highlighted.replace(/\b(SELECT|FROM|JOIN|ON|WHERE|AND|OR|GROUP|BY|ORDER|LIMIT|AS|IN|IS|NULL|INNER|LEFT|RIGHT|OUTER|DESC|ASC|WITH|HAVING|CASE|WHEN|THEN|END|EXTRACT|YEAR|QUARTER|DATEDIFF|CURDATE|COALESCE|NULLIF|ROUND|DISTINCT|CURRENT_DATE|COUNT|SUM|AVG)\b/gi,
            (match) => `<span class="sql-keyword">${match}</span>`);
        
        // Highlight functions
        highlighted = highlighted.replace(/\b(COUNT|SUM|AVG|MIN|MAX|strftime|date)\b/gi, 
            (match) => `<span class="sql-func">${match}</span>`);
        
        // Highlight numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="sql-number">$1</span>');
        
        return highlighted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showErrorFallback() {
        const demoCard = document.querySelector('.demo-card');
        if (demoCard) {
            demoCard.innerHTML = `
                <div class="error-fallback">
                    <h3>Demo Temporarily Unavailable</h3>
                    <p>Please try refreshing the page or <a href="https://github.com/FalkorDB/falkordb">visit our GitHub</a> for more information.</p>
                </div>
            `;
        }
    }

    destroy() {
        if (this.typingTimer) {
            clearInterval(this.typingTimer);
        }
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    let demo;
    try {
        demo = new QueryWeaverDemo();
    } catch (error) {
        console.error('Failed to initialize demo:', error);
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (demo) {
            demo.destroy();
        }
    });
});

// Error boundary for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    // Could send to analytics here
});

// Handle video loading fallbacks
document.addEventListener('DOMContentLoaded', () => {
    const videos = document.querySelectorAll('iframe[src*="youtube"]');
    videos.forEach(video => {
        video.addEventListener('error', () => {
            const fallback = video.parentNode.querySelector('.video-fallback');
            if (fallback) {
                fallback.classList.add('show');
                video.style.display = 'none';
            }
        });
    });
});