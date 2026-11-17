const Admin = {
    siteData: null,
    foldersData: null,
    currentFolderIndex: null,
    currentMediaTargetIndex: null,
    currentIconTarget: null,
    autoSaveTimeout: null,
    isOnline: false,

    // Expanded FontAwesome Library
    icons: [
        // Brand Icons (Freelance & Social)
        "fa-brands fa-fiverr", "fa-brands fa-upwork", "fa-brands fa-instagram", "fa-brands fa-x-twitter", 
        "fa-brands fa-linkedin-in", "fa-brands fa-youtube", "fa-brands fa-tiktok", "fa-brands fa-facebook",
        "fa-brands fa-whatsapp", "fa-brands fa-snapchat", "fa-brands fa-reddit", "fa-brands fa-pinterest",
        "fa-brands fa-dribbble", "fa-brands fa-behance", "fa-brands fa-github", "fa-brands fa-medium",
        "fa-brands fa-discord", "fa-brands fa-twitch", "fa-brands fa-artstation", "fa-brands fa-patreon",
        "fa-brands fa-vimeo", "fa-brands fa-slack", "fa-brands fa-spotify", "fa-brands fa-soundcloud",
        
        // Media & Creation
        "fa-solid fa-video", "fa-solid fa-wand-magic-sparkles", "fa-solid fa-image", "fa-solid fa-camera",
        "fa-solid fa-film", "fa-solid fa-clapperboard", "fa-solid fa-music", "fa-solid fa-headphones",
        "fa-solid fa-pen-nib", "fa-solid fa-palette", "fa-solid fa-brush", "fa-solid fa-pencil",
        "fa-solid fa-compass-drafting", "fa-solid fa-layer-group", "fa-solid fa-cubes",
        
        // General & Business
        "fa-solid fa-briefcase", "fa-solid fa-star", "fa-solid fa-check", "fa-solid fa-bolt", 
        "fa-solid fa-heart", "fa-solid fa-link", "fa-solid fa-envelope", "fa-solid fa-fire", 
        "fa-solid fa-rocket", "fa-solid fa-crown", "fa-solid fa-trophy", "fa-solid fa-award", 
        "fa-solid fa-gem", "fa-solid fa-laptop", "fa-solid fa-desktop", "fa-solid fa-mobile-screen", 
        "fa-solid fa-code", "fa-solid fa-terminal", "fa-solid fa-globe", "fa-solid fa-compass", 
        "fa-solid fa-calendar-days", "fa-solid fa-clock", "fa-solid fa-bell", "fa-solid fa-bullhorn", 
        "fa-solid fa-chart-line", "fa-solid fa-bullseye", "fa-solid fa-lightbulb", "fa-solid fa-user", 
        "fa-solid fa-users", "fa-solid fa-paper-plane", "fa-solid fa-comments", "fa-solid fa-message"
    ],

    async init() {
        // Check session authentication
        if (sessionStorage.getItem('admin_logged_in') === 'true') {
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('admin-dashboard').classList.add('active');
            this.loadData();
        }

        // Login Handler with Live API check + fallback
        document.getElementById('btn-login').addEventListener('click', async () => {
            const pass = document.getElementById('admin-pass').value;
            const loginError = document.getElementById('login-error');
            loginError.style.display = 'none';

            // 1. Try server-side authentication
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pass })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.token) {
                        sessionStorage.setItem('admin_token', data.token);
                    }
                    sessionStorage.setItem('admin_logged_in', 'true');
                    document.getElementById('login-screen').classList.remove('active');
                    document.getElementById('admin-dashboard').classList.add('active');
                    this.loadData();
                    this.showToast("Logged in successfully (Live Backend Connected)", "success");
                    return;
                }
            } catch (err) {
                console.log("Live backend not running, falling back to local password check.");
            }

            // 2. Fallback to local credential check
            const localSite = localStorage.getItem('cms_siteData');
            let currentPass = 'rerender2026';
            if (localSite) {
                try { currentPass = JSON.parse(localSite).global.adminPassword; } catch(e){}
            }
            
            if (pass === currentPass) {
                sessionStorage.setItem('admin_logged_in', 'true');
                document.getElementById('login-screen').classList.remove('active');
                document.getElementById('admin-dashboard').classList.add('active');
                this.loadData();
                this.showToast("Logged in (Local Mode)", "warning");
            } else {
                loginError.textContent = "Incorrect Password.";
                loginError.style.display = 'block';
            }
        });

        // Enter key in login password
        const adminPassInput = document.getElementById('admin-pass');
        if (adminPassInput) {
            adminPassInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') document.getElementById('btn-login').click();
            });
        }

        // Tab Navigation
        document.querySelectorAll('.nav-menu li[data-tab]').forEach(li => {
            li.addEventListener('click', () => {
                document.querySelectorAll('.nav-menu li').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                const targetTab = document.getElementById(li.getAttribute('data-tab'));
                if (targetTab) targetTab.classList.add('active');
                
                // Update Iframe Preview Src
                const src = li.getAttribute('data-iframe-src');
                if (src) {
                    document.getElementById('global-preview-iframe').src = src;
                }
            });
        });

        // Action Buttons
        const savePermBtn = document.getElementById('btn-save-permanent');
        if (savePermBtn) {
            savePermBtn.addEventListener('click', () => this.savePermanent());
        }

        const exportBtn = document.getElementById('btn-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportJson());
        }

        // Modals Close Handlers
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });
        const closeIconBtn = document.querySelector('.close-icon-modal');
        if (closeIconBtn) {
            closeIconBtn.addEventListener('click', () => {
                document.getElementById('modal-icon-picker').classList.remove('active');
            });
        }
        
        const closeMediaBtn = document.querySelector('.close-media-modal');
        if (closeMediaBtn) {
            closeMediaBtn.addEventListener('click', () => {
                document.getElementById('modal-media-manager').classList.remove('active');
            });
        }
        
        const mediaInput = document.getElementById('media-upload-input');
        if (mediaInput) {
            mediaInput.addEventListener('change', (e) => {
                if(e.target.files.length > 0) this.uploadMedia(e.target.files[0]);
            });
        }
        const tabMediaInput = document.getElementById('tab-media-upload-input');
        if (tabMediaInput) {
            tabMediaInput.addEventListener('change', (e) => {
                if(e.target.files.length > 0) this.uploadMedia(e.target.files[0]);
            });
        }
        
        this.renderIconGrid();

        // Check backend server connection
        this.checkBackendStatus();

        // Attach optional AutoSave listeners to inputs (only fires if AutoSave toggle is enabled!)
        document.querySelector('.main-content').addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                this.triggerAutoSave();
            }
        });
    },

    // ----------------------------------------------------
    // NOTIFICATIONS & LIVE BACKEND STATUS
    // ----------------------------------------------------
    showToast(message, type = "success") {
        const container = document.getElementById('admin-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;
        const icon = type === 'success' ? 'fa-check' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-xmark');
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    async checkBackendStatus() {
        try {
            const res = await fetch('/api/health');
            if (res.ok) {
                this.isOnline = true;
                this.updateBackendStatus(true);
                return;
            }
        } catch (e) {}
        this.isOnline = false;
        this.updateBackendStatus(false);
    },

    updateBackendStatus(isOnline) {
        const badge = document.getElementById('backend-status-badge');
        const text = document.getElementById('backend-status-text');
        if (!badge || !text) return;
        if (isOnline) {
            badge.className = 'backend-badge online';
            text.textContent = 'Live Server (Permanent Save)';
        } else {
            badge.className = 'backend-badge offline';
            text.textContent = 'Local Mode (Draft Cache)';
        }
    },

    logout() {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_logged_in');
        window.location.reload();
    },

    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById('toggle-eye-icon');
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) icon.className = 'fa-solid fa-eye-slash';
        } else {
            input.type = 'password';
            if (icon) icon.className = 'fa-solid fa-eye';
        }
    },

    triggerAutoSave() {
        const toggle = document.getElementById('toggle-autosave');
        if (!toggle || !toggle.checked) {
            // Auto-save is disabled by default to prevent lag & accidental overwrites!
            return;
        }
        if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.saveToLocal(true);
        }, 2000);
    },

    // ----------------------------------------------------
    // DATA LOADING
    // ----------------------------------------------------
    async loadData() {
        try {
            // 1. Try Live Server first
            let liveSiteRes = await fetch('/api/site-data').catch(() => null);
            let liveFoldersRes = await fetch('/api/folders').catch(() => null);

            if (liveSiteRes && liveSiteRes.ok && liveFoldersRes && liveFoldersRes.ok) {
                this.siteData = await liveSiteRes.json();
                this.foldersData = await liveFoldersRes.json();
                this.isOnline = true;
                this.updateBackendStatus(true);
            } else {
                // 2. Check LocalStorage fallback
                let localSiteData = localStorage.getItem('cms_siteData');
                const localFoldersData = localStorage.getItem('cms_foldersData');
                
                if (localSiteData && localFoldersData) {
                    try {
                        this.siteData = JSON.parse(localSiteData);
                        this.foldersData = JSON.parse(localFoldersData);
                    } catch (e) {
                        localStorage.removeItem('cms_siteData');
                        localStorage.removeItem('cms_foldersData');
                    }
                }

                // 3. Static JSON files fallback
                if (!this.siteData || !this.foldersData) {
                    const bust = `?v=${Date.now()}`;
                    const resSite = await fetch('../data/site-data.json' + bust);
                    this.siteData = await resSite.json();
                    
                    const resFolders = await fetch('../data/folders.json' + bust);
                    this.foldersData = await resFolders.json();
                }
            }
            
            // Normalize foldersData to ensure array
            if (this.foldersData && !Array.isArray(this.foldersData) && Array.isArray(this.foldersData.value)) {
                this.foldersData = this.foldersData.value;
            }
            if (!Array.isArray(this.foldersData)) {
                this.foldersData = [];
            }

            // Normalize testimonials data
            if (this.siteData && this.siteData.home && this.siteData.home.socialProof && this.siteData.home.socialProof.testimonials) {
                this.siteData.home.socialProof.testimonials.forEach(t => {
                    if (!t.name && t.clientName) t.name = t.clientName;
                    if (!t.role && t.clientRole) t.role = t.clientRole;
                });
            }

            this.populateForms();
            this.renderFoldersList();
            this.renderMediaLibrary();
            this.renderSubmissions();
        } catch (e) {
            console.error("Error loading CMS data:", e);
            alert("Error loading CMS data. Please check browser console.");
        }
    },

    populateForms() {
        const data = this.siteData;
        if (!data) return;

        // Security
        const passEl = document.getElementById('g-adminPassword');
        if (passEl && data.global) passEl.value = data.global.adminPassword || 'rerender2026';

        // GitHub / Netlify Sync
        const ghRepo = document.getElementById('g-githubRepo');
        const ghToken = document.getElementById('g-githubToken');
        if (ghRepo) ghRepo.value = (data.global?.github?.repo) || '';
        if (ghToken) ghToken.value = (data.global?.github?.token) || '';

        // Global
        document.getElementById('g-logoText').value = data.global?.logoText || '';
        document.getElementById('g-navCtaText').value = data.global?.nav?.ctaText || '';
        document.getElementById('g-navCtaHref').value = data.global?.nav?.ctaHref || '';
        
        document.getElementById('g-footerMetaLeft').value = data.global?.footer?.metaLeft || '';
        document.getElementById('g-footerMetaRight').value = data.global?.footer?.metaRight || '';
        document.getElementById('g-footerContactDesc').value = data.global?.footer?.contactDesc || '';
        document.getElementById('g-footerContactEmail').value = data.global?.footer?.contactEmail || '';
        document.getElementById('g-footerCopyright').value = data.global?.footer?.copyright || '';
        document.getElementById('g-footerWatermark').value = data.global?.footer?.watermark || '';
        
        // Integrations (Tawk.to)
        if (data.global?.integrations?.tawkto) {
            document.getElementById('g-tawkto-enabled').checked = !!data.global.integrations.tawkto.enabled;
            document.getElementById('g-tawkto-propertyId').value = data.global.integrations.tawkto.propertyId || '';
            document.getElementById('g-tawkto-widgetId').value = data.global.integrations.tawkto.widgetId || '';
        }
        
        // Gallery Ad Banner Settings
        if (!data.galleryAd) {
            data.galleryAd = {
                enabled: false,
                badge: "SPONSORED",
                title: "",
                desc: "",
                image: "",
                link: "",
                ctaText: "CLAIM DEAL",
                customHtml: ""
            };
        }
        document.getElementById('ad-gallery-enabled').checked = !!data.galleryAd.enabled;
        document.getElementById('ad-gallery-badge').value = data.galleryAd.badge || 'SPONSORED';
        document.getElementById('ad-gallery-title').value = data.galleryAd.title || '';
        document.getElementById('ad-gallery-desc').value = data.galleryAd.desc || '';
        document.getElementById('ad-gallery-image').value = data.galleryAd.image || '';
        document.getElementById('ad-gallery-link').value = data.galleryAd.link || '';
        document.getElementById('ad-gallery-cta').value = data.galleryAd.ctaText || 'CLAIM DEAL';
        document.getElementById('ad-gallery-customHtml').value = data.galleryAd.customHtml || '';

        // Arrays
        this.renderArray('footerSocials', data.global?.footer?.socials || [], 'footer-socials-list');
        this.renderArray('footerLegal', data.global?.footer?.legal || [], 'footer-legal-list');

        // HOME HERO
        if (data.home?.hero) {
            document.getElementById('h-headingLine1').value = data.home.hero.headingLine1 || '';
            document.getElementById('h-headingLine2Prefix').value = data.home.hero.headingLine2Prefix || '';
            document.getElementById('h-typewriterWords').value = (data.home.hero.typewriterWords || []).join(', ');
            document.getElementById('h-subtitle').value = data.home.hero.subtitle || '';
            document.getElementById('h-statsText').value = data.home.hero.statsText || '';
            document.getElementById('h-btnPrimaryText').value = data.home.hero.btnPrimaryText || '';
            document.getElementById('h-btnPrimaryLink').value = data.home.hero.btnPrimaryLink || '';
            document.getElementById('h-btnSecondaryText').value = data.home.hero.btnSecondaryText || '';
            document.getElementById('h-btnSecondaryLink').value = data.home.hero.btnSecondaryLink || '';
        }

        // Home CTA
        if (data.home?.cta) {
            document.getElementById('h-ctaLiveBadge').value = data.home.cta.liveBadge || '';
            document.getElementById('h-ctaTitleLine1').value = data.home.cta.titleLine1 || '';
            document.getElementById('h-ctaTitleItalic').value = data.home.cta.titleItalic || '';
            document.getElementById('h-ctaDesc').value = data.home.cta.desc || '';
            document.getElementById('h-ctaDescStrong').value = data.home.cta.descStrong || '';
            document.getElementById('h-ctaBtnText').value = data.home.cta.btnText || '';
            document.getElementById('h-ctaResponseTime').value = data.home.cta.responseTime || '';
            document.getElementById('h-ctaNoRisk').value = data.home.cta.noRisk || '';
        }

        // Home Pipeline
        if (data.home?.pipeline) {
            document.getElementById('h-pipeSubtitle').value = data.home.pipeline.subtitle || '';
            document.getElementById('h-pipeTitle1').value = data.home.pipeline.titleLine1 || '';
            document.getElementById('h-pipeTitleHighlight').value = data.home.pipeline.titleHighlight || '';
            this.renderArray('pipeline', data.home.pipeline.steps || [], 'pipeline-list');
        }

        // Home Portfolio
        if (data.home?.portfolio) {
            document.getElementById('h-portMetaNumber').value = data.home.portfolio.metaNumber || '01';
            document.getElementById('h-portMetaLabel').value = data.home.portfolio.metaLabel || 'PORTFOLIO_SELECTION.2';
            document.getElementById('h-portTitle').value = data.home.portfolio.title || 'LIVING';
            document.getElementById('h-portTitleItalic').value = data.home.portfolio.titleItalic || 'archive';
            document.getElementById('h-portArchiveBtnText').value = data.home.portfolio.archiveBtnText || 'VIEW FULL ARCHIVE';
            this.renderArray('portfolioVid', data.home.portfolio.videos || [], 'portfolio-vids-list');
        }

        // Home Social Proof / Reviews
        if (data.home?.socialProof) {
            document.getElementById('h-proofMetaNumber').value = data.home.socialProof.metaNumber || '05';
            document.getElementById('h-proofMetaLabel').value = data.home.socialProof.metaLabel || 'SOCIAL_PROOF';
            document.getElementById('h-proofTitle1').value = data.home.socialProof.titleLine1 || "DON'T TAKE";
            document.getElementById('h-proofTitleHighlight').value = data.home.socialProof.titleHighlight || 'OUR WORD FOR IT.';
            document.getElementById('h-proofDesc').value = data.home.socialProof.desc || '';
            this.renderArray('review', data.home.socialProof.testimonials || [], 'reviews-list');
        }

        // Home FAQ
        if (data.home?.faq) {
            document.getElementById('h-faqMetaNumber').value = data.home.faq.metaNumber || '06';
            document.getElementById('h-faqMetaLabel').value = data.home.faq.metaLabel || 'FREQUENTLY_ASKED_QUESTIONS';
            document.getElementById('h-faqTitle1').value = data.home.faq.titleLine1 || '';
            document.getElementById('h-faqTitleHighlight').value = data.home.faq.titleHighlight || '';
            this.renderArray('homeFaq', data.home.faq.items || [], 'home-faq-list');
        }

        // Home Onboarding
        if (data.home?.onboarding) {
            document.getElementById('h-onbMetaNumber').value = data.home.onboarding.metaNumber || '07';
            document.getElementById('h-onbMetaLabel').value = data.home.onboarding.metaLabel || 'ONBOARDING_INITIATED';
            document.getElementById('h-onbTitle1').value = data.home.onboarding.titleLine1 || 'START YOUR';
            document.getElementById('h-onbTitleHighlight').value = data.home.onboarding.titleHighlight || 'RE-RENDER.';
            document.getElementById('h-onbBtnText').value = data.home.onboarding.btnText || 'TRANSMIT_REQUEST';
            
            const fields = data.home.onboarding.fields;
            if (fields) {
                if (fields.name) {
                    document.getElementById('h-onb-f-name-label').value = fields.name.label || '';
                    document.getElementById('h-onb-f-name-placeholder').value = fields.name.placeholder || '';
                }
                if (fields.email) {
                    document.getElementById('h-onb-f-email-label').value = fields.email.label || '';
                    document.getElementById('h-onb-f-email-placeholder').value = fields.email.placeholder || '';
                }
                if (fields.company) {
                    document.getElementById('h-onb-f-company-label').value = fields.company.label || '';
                    document.getElementById('h-onb-f-company-placeholder').value = fields.company.placeholder || '';
                }
                if (fields.social) {
                    document.getElementById('h-onb-f-social-label').value = fields.social.label || '';
                    document.getElementById('h-onb-f-social-placeholder').value = fields.social.placeholder || '';
                }
                if (fields.project_classification) {
                    document.getElementById('h-onb-f-class-label').value = fields.project_classification.label || '';
                    document.getElementById('h-onb-f-class-placeholder').value = fields.project_classification.placeholder || '';
                    document.getElementById('h-onb-f-class-options').value = fields.project_classification.options || '';
                }
                if (fields.allocated_budget) {
                    document.getElementById('h-onb-f-budget-label').value = fields.allocated_budget.label || '';
                    document.getElementById('h-onb-f-budget-placeholder').value = fields.allocated_budget.placeholder || '';
                    document.getElementById('h-onb-f-budget-options').value = fields.allocated_budget.options || '';
                }
                if (fields.location) {
                    document.getElementById('h-onb-f-loc-label').value = fields.location.label || '';
                    document.getElementById('h-onb-f-loc-placeholder').value = fields.location.placeholder || '';
                }
                if (fields.details) {
                    document.getElementById('h-onb-f-det-label').value = fields.details.label || '';
                    document.getElementById('h-onb-f-det-placeholder').value = fields.details.placeholder || '';
                }
            }
        }

        // About
        if (data.about) {
            document.getElementById('a-badge').value = data.about.badge || '';
            document.getElementById('a-name').value = data.about.name || '';
            document.getElementById('a-typewriterWords').value = (data.about.typewriterWords || []).join(', ');
            document.getElementById('a-bio').value = data.about.bio || '';
            document.getElementById('a-profileImage').value = data.about.profileImage || '';

            this.renderArray('aboutStat', data.about.stats || [], 'about-stats-list');
            this.renderArray('aboutSocial', data.about.socialLinks || [], 'about-socials-list');
            this.renderArray('aboutFaq', data.about.faq || [], 'about-faq-list');
        }

        // Work
        if (!data.work) data.work = {};
        document.getElementById('w-breadcrumb').value = data.work.breadcrumb || 'ARCHIVE';
        document.getElementById('w-titleLine1').value = data.work.titleLine1 || 'THE';
        document.getElementById('w-titleItalic').value = data.work.titleItalic || 'STUDIO';
        document.getElementById('w-titleLine2').value = data.work.titleLine2 || 'ARCHIVE';
    },

    renderArray(type, dataArray, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        dataArray.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'dynamic-item';
            el.innerHTML = `
                <div class="dynamic-item-header">
                    <h4>Item #${index + 1}</h4>
                    <div class="dynamic-item-actions">
                        <button class="btn btn-sm btn-outline" onclick="Admin.moveArrayItem('${type}', ${index}, -1)"><i class="fa-solid fa-arrow-up"></i></button>
                        <button class="btn btn-sm btn-outline" onclick="Admin.moveArrayItem('${type}', ${index}, 1)"><i class="fa-solid fa-arrow-down"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="Admin.deleteArrayItem('${type}', ${index})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                ${this.getTemplateForType(type, item, index)}
            `;
            container.appendChild(el);
        });
    },

    getTemplateForType(type, item, index) {
        switch(type) {
            case 'footerSocials':
                return `
                    <div class="form-group"><label>Label</label><input type="text" data-field="label" value="${item.label||''}"></div>
                    <div class="form-group"><label>Link</label><input type="text" data-field="href" value="${item.href||''}"></div>
                `;
            case 'footerLegal':
                return `
                    <div class="form-group"><label>Label</label><input type="text" data-field="label" value="${item.label||''}"></div>
                    <div class="form-group"><label>Content (HTML allowed)</label><textarea data-field="content" rows="4">${item.content||''}</textarea></div>
                `;
            case 'pipeline':
                return `
                    <div class="form-group"><label>Number</label><input type="text" data-field="number" value="${item.number||''}"></div>
                    <div class="form-group"><label>Badge</label><input type="text" data-field="badge" value="${item.badge||''}"></div>
                    <div class="form-group"><label>Title</label><input type="text" data-field="title" value="${item.title||''}"></div>
                    <div class="form-group"><label>Description</label><textarea data-field="desc">${item.desc||''}</textarea></div>
                `;
            case 'portfolioVid':
                return `
                    <div class="form-group"><label>Poster Image URL</label><input type="text" data-field="poster" value="${item.poster||''}"></div>
                    <div class="form-group"><label>Video URL</label><input type="text" data-field="src" value="${item.src||''}"></div>
                    <div class="form-group">
                        <label>Grid Column Position</label>
                        <select data-field="column">
                            <option value="left" ${item.column === 'left' ? 'selected' : ''}>Left</option>
                            <option value="middle" ${item.column === 'middle' ? 'selected' : ''}>Middle</option>
                            <option value="right" ${item.column === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Wide Format?</label><input type="checkbox" data-field="wide" ${item.wide ? 'checked' : ''}></div>
                `;
            case 'review':
                return `
                    <div class="form-group"><label>Name</label><input type="text" data-field="name" value="${item.name || item.clientName || ''}"></div>
                    <div class="form-group"><label>Role</label><input type="text" data-field="role" value="${item.role || item.clientRole || ''}"></div>
                    <div class="form-group"><label>Review Text</label><textarea data-field="text">${item.text || ''}</textarea></div>
                    <div class="form-group"><label>Avatar Image URL</label><input type="text" data-field="avatar" value="${item.avatar || ''}"></div>
                `;
            case 'homeFaq': case 'aboutFaq':
                return `
                    <div class="form-group"><label>Question</label><input type="text" data-field="question" value="${item.question||''}"></div>
                    <div class="form-group"><label>Answer</label><textarea data-field="answer">${item.answer||''}</textarea></div>
                `;
            case 'aboutStat':
                return `
                    <div class="form-group"><label>Number (e.g. 50+)</label><input type="text" data-field="number" value="${item.number||''}"></div>
                    <div class="form-group"><label>Label</label><input type="text" data-field="label" value="${item.label||''}"></div>
                `;
            case 'aboutSocial':
                const id = `icon-sel-${Math.random().toString(36).substr(2, 9)}`;
                return `
                    <div class="form-group">
                        <label>Icon Class</label>
                        <div style="display:flex; gap:10px;">
                            <input type="text" id="${id}" data-field="icon" value="${item.icon||'fa-solid fa-link'}" readonly>
                            <button class="icon-picker-btn" onclick="Admin.openIconPicker('${id}')"><i class="${item.icon||'fa-solid fa-link'}"></i> Select</button>
                        </div>
                    </div>
                    <div class="form-group"><label>URL</label><input type="text" data-field="href" value="${item.href||'#'}"></div>
                `;
        }
        return '';
    },

    getArrayRef(type) {
        switch(type) {
            case 'footerSocials': return this.siteData.global.footer.socials;
            case 'footerLegal': return this.siteData.global.footer.legal;
            case 'pipeline': return this.siteData.home.pipeline.steps;
            case 'portfolioVid': return this.siteData.home.portfolio.videos;
            case 'review': return this.siteData.home.socialProof.testimonials;
            case 'homeFaq': return this.siteData.home.faq.items;
            case 'aboutStat': return this.siteData.about.stats;
            case 'aboutSocial': return this.siteData.about.socialLinks;
            case 'aboutFaq': return this.siteData.about.faq;
        }
        return [];
    },

    syncArrayFromDOM(type) {
        const arr = this.getArrayRef(type);
        if (!arr) return;
        let containerId = '';
        if (type === 'footerSocials') containerId = 'footer-socials-list';
        if (type === 'footerLegal') containerId = 'footer-legal-list';
        if (type === 'pipeline') containerId = 'pipeline-list';
        if (type === 'portfolioVid') containerId = 'portfolio-vids-list';
        if (type === 'review') containerId = 'reviews-list';
        if (type === 'homeFaq') containerId = 'home-faq-list';
        if (type === 'aboutStat') containerId = 'about-stats-list';
        if (type === 'aboutSocial') containerId = 'about-socials-list';
        if (type === 'aboutFaq') containerId = 'about-faq-list';
        
        const container = document.getElementById(containerId);
        if (!container) return;
        const items = container.querySelectorAll('.dynamic-item');
        
        arr.length = 0;
        items.forEach(itemEl => {
            let obj = {};
            itemEl.querySelectorAll('[data-field]').forEach(input => {
                const field = input.getAttribute('data-field');
                if (input.type === 'checkbox') {
                    obj[field] = input.checked;
                } else {
                    obj[field] = input.value;
                }
            });
            arr.push(obj);
        });
    },

    getEmptyItem(type) {
        switch(type) {
            case 'footerSocials': return { label: "New Social", href: "#" };
            case 'footerLegal': return { label: "New Policy", content: "Terms go here." };
            case 'pipeline': return { number: "00", badge: "NEW BADGE", title: "NEW STEP", desc: "Description here." };
            case 'portfolioVid': return { src: "", poster: "", column: "left", wide: false };
            case 'review': return { name: "Creator Name", role: "Role / Company", text: "Exceptional quality and speed!", avatar: "", rating: 5 };
            case 'homeFaq': return { question: "New Question?", answer: "New Answer.", active: false };
            case 'aboutStat': return { number: "100+", label: "New Stat" };
            case 'aboutSocial': return { icon: "fa-solid fa-link", href: "#" };
            case 'aboutFaq': return { question: "New Question?", answer: "New Answer." };
        }
        return {};
    },

    addArrayItem(type) {
        this.syncArrayFromDOM(type);
        const arr = this.getArrayRef(type);
        if (arr) arr.push(this.getEmptyItem(type));
        this.populateForms();
        this.triggerAutoSave();
    },

    deleteArrayItem(type, index) {
        if(confirm("Delete this item?")) {
            this.syncArrayFromDOM(type);
            const arr = this.getArrayRef(type);
            if (arr) arr.splice(index, 1);
            this.populateForms();
            this.triggerAutoSave();
        }
    },

    moveArrayItem(type, index, direction) {
        this.syncArrayFromDOM(type);
        const arr = this.getArrayRef(type);
        if (!arr || index + direction < 0 || index + direction >= arr.length) return;
        const temp = arr[index];
        arr[index] = arr[index + direction];
        arr[index + direction] = temp;
        this.populateForms();
        this.triggerAutoSave();
    },

    // ----------------------------------------------------
    // FOLDERS & GALLERY MANAGEMENT
    // ----------------------------------------------------
    renderFoldersList() {
        const list = document.getElementById('folders-list');
        if (!list || !this.foldersData) return;
        list.innerHTML = this.foldersData.map((f, index) => `
            <div class="folder-item">
                <div>
                    <h3>${f.name}</h3>
                    <p>${(f.items || []).length} items &bull; Tag: ${f.tag || '00_NODES'}</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-outline btn-sm" onclick="Admin.moveFolder(${index}, -1)"><i class="fa-solid fa-arrow-up"></i></button>
                    <button class="btn btn-outline btn-sm" onclick="Admin.moveFolder(${index}, 1)"><i class="fa-solid fa-arrow-down"></i></button>
                    <button class="btn btn-primary btn-sm" onclick="Admin.editFolder(${index})"><i class="fa-solid fa-pen-to-square"></i> Edit Media (${(f.items || []).length})</button>
                    <button class="btn btn-danger btn-sm" onclick="Admin.deleteFolder(${index})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    },

    addFolder() {
        const newId = "folder_" + Date.now().toString(36);
        this.foldersData.push({
            id: newId,
            name: "NEW FOLDER",
            tag: "00_NODES",
            type: "images",
            preview: "",
            filepath: `~/RE_RENDER/ARCHIVE/${newId.toUpperCase()}`,
            items: []
        });
        this.renderFoldersList();
        this.editFolder(this.foldersData.length - 1);
        this.showToast("Created new folder!", "success");
    },

    deleteFolder(index) {
        if(confirm("Are you sure you want to delete this entire folder?")) {
            this.foldersData.splice(index, 1);
            this.renderFoldersList();
            this.showToast("Folder deleted.", "warning");
        }
    },

    moveFolder(index, direction) {
        if (index + direction < 0 || index + direction >= this.foldersData.length) return;
        const temp = this.foldersData[index];
        this.foldersData[index] = this.foldersData[index + direction];
        this.foldersData[index + direction] = temp;
        this.renderFoldersList();
    },

    editFolder(index) {
        this.currentFolderIndex = index;
        const folder = this.foldersData[index];
        if (!folder.items) folder.items = [];

        document.getElementById('modal-folder-title').textContent = `Edit Folder: ${folder.name}`;
        document.getElementById('f-id').value = folder.id || '';
        document.getElementById('f-name').value = folder.name || '';
        document.getElementById('f-tag').value = folder.tag || '';
        document.getElementById('f-filepath').value = folder.filepath || '';
        document.getElementById('f-preview').value = folder.preview || '';
        
        this.renderGalleryItems();

        document.getElementById('modal-edit-folder').classList.add('active');

        document.getElementById('btn-save-folder').onclick = () => {
            this.syncGalleryItemsFromDOM();
            folder.id = document.getElementById('f-id').value.trim();
            folder.name = document.getElementById('f-name').value.trim();
            folder.tag = document.getElementById('f-tag').value.trim() || `${folder.items.length}_NODES`;
            folder.filepath = document.getElementById('f-filepath').value.trim();
            folder.preview = document.getElementById('f-preview').value.trim();
            
            document.getElementById('modal-edit-folder').classList.remove('active');
            this.renderFoldersList();
            this.showToast("Folder settings saved to draft! Click PERMANENT SAVE to publish.", "success");
        };
    },

    // ----------------------------------------------------
    // GALLERY ITEMS (ADD, AUTO POSTER, AUTO COVER, ADS)
    // ----------------------------------------------------
    addNewBlankGalleryItem() {
        if (this.currentFolderIndex === null) return;
        this.syncGalleryItemsFromDOM();
        const folder = this.foldersData[this.currentFolderIndex];
        if (!folder.items) folder.items = [];
        
        const newItem = {
            id: "m_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            title: "New Media Item",
            type: "image",
            src: "",
            videoSrc: "",
            ratio: "16:9",
            adLink: "",
            adBadge: "SPONSORED",
            adDesc: "",
            adCta: "VISIT SPONSOR"
        };
        folder.items.push(newItem);
        this.renderGalleryItems();
        
        // Scroll to the newly added item
        const container = document.getElementById('folder-items-list');
        if (container && container.lastElementChild) {
            container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const titleInput = container.lastElementChild.querySelector('input[data-media-field="title"]');
            if (titleInput) titleInput.focus();
        }
        this.showToast("Added new gallery item! Fill in details.", "success");
    },

    addGalleryItem() {
        // Direct addition with fallback
        this.addNewBlankGalleryItem();
    },

    onMediaTypeChange(idx, newType) {
        this.syncGalleryItemsFromDOM();
        const folder = this.foldersData[this.currentFolderIndex];
        if (folder.items[idx]) {
            folder.items[idx].type = newType;
            if (newType === 'ad' && !folder.items[idx].adBadge) {
                folder.items[idx].adBadge = 'SPONSORED';
                folder.items[idx].adCta = 'VISIT SPONSOR';
            }
        }
        this.renderGalleryItems();
    },

    renderGalleryItems() {
        const folder = this.foldersData[this.currentFolderIndex];
        const itemsList = document.getElementById('folder-items-list');
        if (!itemsList) return;

        if (!folder.items || folder.items.length === 0) {
            itemsList.innerHTML = `
                <div style="text-align:center; padding: 35px 20px; background: rgba(255,255,255,0.02); border: 1px dashed #333; border-radius: 8px;">
                    <p style="color:#888; margin-bottom:15px; font-size:0.95rem;">No media or gallery items inside this folder yet.</p>
                    <div style="display:flex; justify-content:center; gap:10px;">
                        <button type="button" class="btn btn-primary btn-sm" onclick="Admin.addNewBlankGalleryItem()"><i class="fa-solid fa-plus"></i> Add First Item</button>
                        <button type="button" class="btn btn-outline btn-sm" onclick="Admin.openMediaManager()"><i class="fa-solid fa-images"></i> Pick from Media Library</button>
                    </div>
                </div>
            `;
            return;
        }

        itemsList.innerHTML = folder.items.map((item, idx) => {
            const isVideo = item.type === 'video';
            const isAd = item.type === 'ad';
            
            // Preview image resolution
            let displayPreview = item.src;
            if (!displayPreview && isVideo && item.videoSrc) {
                const yt = this.extractYouTubeThumbnail(item.videoSrc);
                if (yt) displayPreview = yt;
            }
            if (!displayPreview) {
                displayPreview = 'https://via.placeholder.com/200x120?text=No+Preview';
            }

            return `
            <div class="media-item-edit" data-item-id="${item.id || ''}">
                <div class="dynamic-item-header" style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <h4 style="color:#fff; margin:0; font-size:1.1rem;">Media Item #${idx + 1}</h4>
                        ${isAd ? '<span class="ad-badge-tag">SPONSORED AD</span>' : (isVideo ? '<span style="background:#ff003c; color:#fff; font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:3px;">VIDEO</span>' : '<span style="background:#333; color:#aaa; font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:3px;">IMAGE</span>')}
                    </div>
                    <div class="dynamic-item-actions">
                        <button type="button" class="btn btn-sm btn-primary" onclick="Admin.openMediaManagerForField(${idx})" title="Replace from Library" style="margin-right:10px;"><i class="fa-solid fa-images"></i> Replace Asset</button>
                        <button type="button" class="btn btn-sm btn-outline" onclick="Admin.moveGalleryItem(${idx}, -1)"><i class="fa-solid fa-arrow-up"></i></button>
                        <button type="button" class="btn btn-sm btn-outline" onclick="Admin.moveGalleryItem(${idx}, 1)"><i class="fa-solid fa-arrow-down"></i></button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="Admin.deleteGalleryItem(${idx})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div style="display:flex; gap: 20px; align-items: flex-start;">
                    <div style="width: 180px; flex-shrink: 0;">
                        <img id="item-preview-img-${idx}" src="${displayPreview}" alt="Preview" style="width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:8px; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 12px rgba(0,0,0,0.2);" onerror="this.src='https://via.placeholder.com/200x120?text=Preview+Error'">
                    </div>
                    <div style="flex-grow:1;">
                        <div class="form-group" style="margin-bottom:12px;">
                            <label>${isAd ? 'Ad Title / Sponsor Name' : 'Title / Caption'}</label>
                            <input type="text" data-media-field="title" value="${item.title || ''}" placeholder="${isAd ? 'e.g. Sponsor Deal' : 'Item title...'}">
                        </div>
                        <div style="display:flex; gap:12px;">
                            <div class="form-group" style="flex:1; margin-bottom:12px;">
                                <label>Asset Type</label>
                                <select data-media-field="type" onchange="Admin.onMediaTypeChange(${idx}, this.value)">
                                    <option value="image" ${item.type === 'image' ? 'selected' : ''}>Image</option>
                                    <option value="video" ${item.type === 'video' ? 'selected' : ''}>Video</option>
                                    <option value="ad" ${item.type === 'ad' ? 'selected' : ''}>Ad / Sponsor Card</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:2; margin-bottom:12px;">
                                <label>${isAd ? 'Ad Media / Banner URL' : 'Image / Video Poster URL'}</label>
                                <div style="display:flex; gap:8px;">
                                    <input type="text" data-media-field="src" value="${item.src || ''}" placeholder="https://..." oninput="document.getElementById('item-preview-img-${idx}').src = this.value">
                                    ${isVideo ? `<button type="button" class="btn btn-outline btn-sm" onclick="Admin.autoPickItemPoster(${idx})" title="Auto pick poster from YouTube thumbnail or video frame" style="white-space:nowrap;"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto Poster</button>` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Video Specific Fields -->
                        <div class="video-fields-container" style="display: ${isVideo ? 'block' : 'none'};">
                            <div class="form-group video-ratio-group" style="margin-bottom:12px;">
                                <label>Video Aspect Ratio</label>
                                <select data-media-field="ratio">
                                    <option value="16:9" ${item.ratio === '16:9' ? 'selected' : ''}>Landscape (16:9 PC)</option>
                                    <option value="9:16" ${item.ratio === '9:16' ? 'selected' : ''}>Portrait (9:16 Mobile / Shorts)</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom:12px;">
                                <label>Video Source URL (YouTube, Vimeo, MP4, WebM)</label>
                                <div style="display:flex; gap:8px;">
                                    <input type="text" data-media-field="videoSrc" value="${item.videoSrc || ''}" placeholder="e.g. https://www.youtube.com/watch?v=... or direct MP4">
                                </div>
                            </div>
                        </div>

                        <!-- Ad Specific Fields -->
                        <div class="ad-fields-container" style="display: ${isAd ? 'block' : 'none'}; background: rgba(255,215,0,0.03); border: 1px dashed rgba(255,215,0,0.2); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                            <div style="display:flex; gap:12px; margin-bottom:12px;">
                                <div class="form-group" style="flex:1; margin-bottom:0;">
                                    <label style="color:#ffd700;">Ad Destination Link (URL)</label>
                                    <input type="text" data-media-field="adLink" value="${item.adLink || ''}" placeholder="https://sponsor.com/deal">
                                </div>
                                <div class="form-group" style="flex:1; margin-bottom:0;">
                                    <label style="color:#ffd700;">Ad Badge Label</label>
                                    <input type="text" data-media-field="adBadge" value="${item.adBadge || 'SPONSORED'}" placeholder="SPONSORED">
                                </div>
                            </div>
                            <div style="display:flex; gap:12px;">
                                <div class="form-group" style="flex:2; margin-bottom:0;">
                                    <label style="color:#ffd700;">Ad Description / Subtitle</label>
                                    <input type="text" data-media-field="adDesc" value="${item.adDesc || ''}" placeholder="Short promotional tagline...">
                                </div>
                                <div class="form-group" style="flex:1; margin-bottom:0;">
                                    <label style="color:#ffd700;">Button CTA Text</label>
                                    <input type="text" data-media-field="adCta" value="${item.adCta || 'VISIT SPONSOR'}" placeholder="VISIT SPONSOR">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    },

    syncGalleryItemsFromDOM() {
        if (this.currentFolderIndex === null) return;
        const folder = this.foldersData[this.currentFolderIndex];
        const container = document.getElementById('folder-items-list');
        if (!container) return;
        const items = container.querySelectorAll('.media-item-edit');
        
        folder.items = [];
        items.forEach(itemEl => {
            let obj = {};
            itemEl.querySelectorAll('[data-media-field]').forEach(input => {
                obj[input.getAttribute('data-media-field')] = input.value;
            });
            const existingId = itemEl.getAttribute('data-item-id');
            obj.id = (existingId && existingId !== 'undefined' && existingId !== '') ? existingId : ("m_" + Math.random().toString(36).substr(2, 9));
            folder.items.push(obj);
        });
    },

    async autoPickItemPoster(idx) {
        if (this.currentFolderIndex === null) return;
        this.syncGalleryItemsFromDOM();
        const folder = this.foldersData[this.currentFolderIndex];
        const item = folder.items[idx];
        if (!item) return;

        if (!item.videoSrc || item.videoSrc.trim() === '') {
            this.showToast("Please enter a Video Source URL first.", "warning");
            return;
        }

        const yt = this.extractYouTubeThumbnail(item.videoSrc);
        if (yt) {
            item.src = yt;
            this.renderGalleryItems();
            this.showToast("YouTube thumbnail set as poster!", "success");
            return;
        }

        this.showToast("Capturing poster frame from video...", "warning");
        const frame = await this.captureVideoFrame(item.videoSrc);
        if (frame) {
            item.src = frame;
            this.renderGalleryItems();
            this.showToast("Captured video frame and set as poster!", "success");
        } else {
            this.showToast("Could not auto-capture. Check if video link is accessible.", "warning");
        }
    },

    async autoGenerateAllPostersForFolder() {
        if (this.currentFolderIndex === null) return;
        this.syncGalleryItemsFromDOM();
        const folder = this.foldersData[this.currentFolderIndex];
        if (!folder.items || folder.items.length === 0) {
            this.showToast("Folder has no items.", "warning");
            return;
        }

        let updated = 0;
        for (let i = 0; i < folder.items.length; i++) {
            const it = folder.items[i];
            if (it.type === 'video' && (!it.src || it.src.trim() === '') && it.videoSrc) {
                const yt = this.extractYouTubeThumbnail(it.videoSrc);
                if (yt) {
                    it.src = yt;
                    updated++;
                } else {
                    const frame = await this.captureVideoFrame(it.videoSrc);
                    if (frame) {
                        it.src = frame;
                        updated++;
                    }
                }
            }
        }
        this.renderGalleryItems();
        if (updated > 0) {
            this.showToast(`Updated poster images for ${updated} videos!`, "success");
        } else {
            this.showToast("All videos already have poster images.", "warning");
        }
    },

    async autoPickFolderCover() {
        if (this.currentFolderIndex === null) return;
        this.syncGalleryItemsFromDOM();
        const folder = this.foldersData[this.currentFolderIndex];
        if (!folder.items || folder.items.length === 0) {
            this.showToast("No items in folder to extract cover from.", "warning");
            return;
        }
        let chosen = '';
        for (const it of folder.items) {
            if (it.src && it.src.trim() !== '') {
                chosen = it.src.trim();
                break;
            }
            if (it.videoSrc && it.videoSrc.trim() !== '') {
                const yt = this.extractYouTubeThumbnail(it.videoSrc);
                if (yt) {
                    chosen = yt;
                    break;
                }
                const frame = await this.captureVideoFrame(it.videoSrc);
                if (frame) {
                    chosen = frame;
                    break;
                }
            }
        }
        if (chosen) {
            document.getElementById('f-preview').value = chosen;
            folder.preview = chosen;
            this.showToast("Folder cover auto-picked from media!", "success");
        } else {
            this.showToast("Could not find media to extract cover.", "warning");
        }
    },

    extractYouTubeThumbnail(url) {
        if (!url) return null;
        const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(reg);
        if (match && match[1]) {
            return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
        }
        return null;
    },

    captureVideoFrame(videoUrl) {
        return new Promise((resolve) => {
            try {
                const video = document.createElement('video');
                video.crossOrigin = 'anonymous';
                video.src = videoUrl;
                video.muted = true;
                video.preload = 'metadata';
                video.onloadeddata = () => {
                    video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
                };
                video.onseeked = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth || 640;
                        canvas.height = video.videoHeight || 360;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    } catch (err) {
                        resolve(null);
                    }
                };
                video.onerror = () => resolve(null);
                setTimeout(() => resolve(null), 4000);
            } catch (err) {
                resolve(null);
            }
        });
    },

    deleteGalleryItem(idx) {
        if(confirm("Delete this media item?")) {
            this.syncGalleryItemsFromDOM();
            this.foldersData[this.currentFolderIndex].items.splice(idx, 1);
            this.renderGalleryItems();
            this.showToast("Item deleted.", "warning");
        }
    },

    moveGalleryItem(idx, direction) {
        this.syncGalleryItemsFromDOM();
        const items = this.foldersData[this.currentFolderIndex].items;
        if (idx + direction < 0 || idx + direction >= items.length) return;
        const temp = items[idx];
        items[idx] = items[idx + direction];
        items[idx + direction] = temp;
        this.renderGalleryItems();
    },

    // ----------------------------------------------------
    // MEDIA LIBRARY (MODAL & GLOBAL TAB)
    // ----------------------------------------------------
    openMediaManager() {
        this.currentMediaTargetIndex = null;
        document.getElementById('modal-media-manager').classList.add('active');
        this.renderMediaLibrary();
    },

    openMediaManagerForField(idx) {
        this.syncGalleryItemsFromDOM();
        this.currentMediaTargetIndex = idx;
        document.getElementById('modal-media-manager').classList.add('active');
        this.renderMediaLibrary();
    },

    renderMediaLibrary() {
        const grid = document.getElementById('media-library-grid');
        const tabGrid = document.getElementById('tab-media-library-grid');
        
        if (!this.siteData.mediaLibrary) {
            this.siteData.mediaLibrary = [];
        }
        
        const html = this.siteData.mediaLibrary.length === 0 
            ? '<p style="color:#666; grid-column: 1/-1;">No media uploaded yet. Click Upload Media.</p>'
            : this.siteData.mediaLibrary.map(asset => `
                <div class="media-item-card">
                    <div class="type-badge">${asset.type.toUpperCase()}</div>
                    <div class="media-actions">
                        <button class="btn btn-sm" onclick="event.stopPropagation(); Admin.renameMedia('${asset.id}')" title="Rename"><i class="fa-solid fa-pencil"></i></button>
                    </div>
                    <div onclick="Admin.selectMediaFromLibrary('${asset.id}')">
                        ${asset.type === 'video' 
                            ? `<video src="${asset.src}#t=1" muted preload="metadata" style="pointer-events:none;"></video>` 
                            : `<img src="${asset.src}" alt="media" style="pointer-events:none;">`}
                        <div class="info">
                            ${asset.filename}
                        </div>
                    </div>
                </div>
            `).join('');

        if (grid) grid.innerHTML = html;
        if (tabGrid) tabGrid.innerHTML = html;
    },

    async uploadMedia(file) {
        if (!file) return;
        
        try {
            const input1 = document.getElementById('media-upload-input');
            const input2 = document.getElementById('tab-media-upload-input');
            if(input1) input1.disabled = true;
            if(input2) input2.disabled = true;
            
            let mediaSrc = '';
            const isVideo = file.type.startsWith('video');

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'X-File-Name': file.name
                    },
                    body: file
                });
                
                if (response.ok) {
                    const data = await response.json();
                    mediaSrc = data.path;
                }
            } catch (err) {
                console.log("Live backend upload endpoint unavailable, checking fallback.");
            }

            if (!mediaSrc) {
                // If small enough, base64 fallback
                if (file.size > 2 * 1024 * 1024) {
                    alert("File is too large for local browser storage (>2MB). Please start the live server with 'node server.js' to upload large videos/images.");
                    return;
                }
                mediaSrc = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }
            
            if (!this.siteData.mediaLibrary) this.siteData.mediaLibrary = [];
            
            const newAsset = {
                id: "lib_" + Math.random().toString(36).substr(2, 9),
                type: isVideo ? 'video' : 'image',
                src: mediaSrc,
                filename: file.name
            };
            
            this.siteData.mediaLibrary.push(newAsset);
            this.renderMediaLibrary();
            this.showToast("Uploaded new media asset!", "success");
        } catch (e) {
            console.error(e);
            alert("Upload failed. " + e.message);
        } finally {
            const input1 = document.getElementById('media-upload-input');
            const input2 = document.getElementById('tab-media-upload-input');
            if(input1) { input1.disabled = false; input1.value = ""; }
            if(input2) { input2.disabled = false; input2.value = ""; }
        }
    },

    renameMedia(assetId) {
        const asset = this.siteData.mediaLibrary.find(a => a.id === assetId);
        if (!asset) return;
        const newName = prompt("Rename media asset:", asset.filename);
        if (newName && newName.trim() !== '') {
            asset.filename = newName.trim();
            this.renderMediaLibrary();
        }
    },

    playMedia(assetId) {},

    selectMediaFromLibrary(assetId) {
        const asset = this.siteData.mediaLibrary.find(a => a.id === assetId);
        if (!asset) return;
        
        if (this.currentFolderIndex === null || this.currentFolderIndex === undefined) {
            // User clicked from the Global Media Tab
            navigator.clipboard.writeText(asset.src).then(() => {
                alert(`Copied URL to clipboard: ${asset.src}`);
            }).catch(() => {
                prompt("Copy this URL:", asset.src);
            });
            return;
        }

        const folder = this.foldersData[this.currentFolderIndex];
        if (!folder.items) folder.items = [];
        
        if (this.currentMediaTargetIndex !== undefined && this.currentMediaTargetIndex !== null) {
            const item = folder.items[this.currentMediaTargetIndex];
            item.title = asset.filename;
            if (asset.type === 'video') {
                item.type = 'video';
                item.videoSrc = asset.src;
                // Auto generate/extract poster for the replaced video if needed
                const yt = this.extractYouTubeThumbnail(asset.src);
                if (yt) item.src = yt;
            } else {
                item.type = 'image';
                item.src = asset.src;
                item.videoSrc = '';
            }
            this.currentMediaTargetIndex = null;
        } else {
            if (asset.type === 'video') {
                const yt = this.extractYouTubeThumbnail(asset.src);
                folder.items.push({
                    id: "m_" + Math.random().toString(36).substr(2, 9),
                    title: asset.filename,
                    type: "video",
                    src: yt || "",
                    videoSrc: asset.src,
                    ratio: "16:9"
                });
            } else {
                folder.items.push({
                    id: "m_" + Math.random().toString(36).substr(2, 9),
                    title: asset.filename,
                    type: "image",
                    src: asset.src,
                    videoSrc: "",
                    ratio: "16:9"
                });
            }
        }
        
        const modal = document.getElementById('modal-media-manager');
        if(modal) modal.classList.remove('active');
        
        this.renderGalleryItems();
        this.showToast("Asset added to folder!", "success");
    },

    // ----------------------------------------------------
    // ICON PICKER
    // ----------------------------------------------------
    renderIconGrid() {
        const grid = document.getElementById('icon-grid');
        if (!grid) return;
        grid.innerHTML = this.icons.map(iconClass => `
            <div class="icon-card" onclick="Admin.selectIcon('${iconClass}')" title="${iconClass}">
                <i class="${iconClass}"></i>
            </div>
        `).join('');

        const search = document.getElementById('icon-search');
        if (search) {
            search.addEventListener('input', (e) => {
                const val = e.target.value.toLowerCase();
                const filtered = this.icons.filter(i => i.toLowerCase().includes(val));
                grid.innerHTML = filtered.map(iconClass => `
                    <div class="icon-card" onclick="Admin.selectIcon('${iconClass}')" title="${iconClass}">
                        <i class="${iconClass}"></i>
                    </div>
                `).join('');
            });
        }
    },

    openIconPicker(targetInputId) {
        this.currentIconTarget = targetInputId;
        document.getElementById('modal-icon-picker').classList.add('active');
    },

    selectIcon(iconClass) {
        if (this.currentIconTarget) {
            const input = document.getElementById(this.currentIconTarget);
            if (input) {
                input.value = iconClass;
                const btn = input.nextElementSibling;
                if (btn) btn.innerHTML = `<i class="${iconClass}"></i> Select`;
            }
        }
        document.getElementById('modal-icon-picker').classList.remove('active');
        this.triggerAutoSave();
    },

    // ----------------------------------------------------
    // SAVE AND EXPORT
    // ----------------------------------------------------
    syncAllForms() {
        // Sync arrays
        ['footerSocials', 'footerLegal', 'pipeline', 'portfolioVid', 'review', 'homeFaq', 'aboutStat', 'aboutSocial', 'aboutFaq'].forEach(type => {
            this.syncArrayFromDOM(type);
        });

        // Global
        this.siteData.global.adminPassword = document.getElementById('g-adminPassword').value;

        // GitHub / Netlify Sync
        if (!this.siteData.global.github) this.siteData.global.github = {};
        const ghRepoEl = document.getElementById('g-githubRepo');
        const ghTokenEl = document.getElementById('g-githubToken');
        if (ghRepoEl) this.siteData.global.github.repo = ghRepoEl.value.trim();
        if (ghTokenEl) this.siteData.global.github.token = ghTokenEl.value.trim();

        this.siteData.global.logoText = document.getElementById('g-logoText').value;
        this.siteData.global.nav.ctaText = document.getElementById('g-navCtaText').value;
        this.siteData.global.nav.ctaHref = document.getElementById('g-navCtaHref').value;
        this.siteData.global.footer.metaLeft = document.getElementById('g-footerMetaLeft').value;
        this.siteData.global.footer.metaRight = document.getElementById('g-footerMetaRight').value;
        this.siteData.global.footer.contactDesc = document.getElementById('g-footerContactDesc').value;
        this.siteData.global.footer.contactEmail = document.getElementById('g-footerContactEmail').value;
        this.siteData.global.footer.copyright = document.getElementById('g-footerCopyright').value;
        this.siteData.global.footer.watermark = document.getElementById('g-footerWatermark').value;

        // Integrations (Tawk.to)
        if (!this.siteData.global.integrations) this.siteData.global.integrations = {};
        if (!this.siteData.global.integrations.tawkto) this.siteData.global.integrations.tawkto = {};
        this.siteData.global.integrations.tawkto.enabled = document.getElementById('g-tawkto-enabled').checked;
        this.siteData.global.integrations.tawkto.propertyId = document.getElementById('g-tawkto-propertyId').value;
        this.siteData.global.integrations.tawkto.widgetId = document.getElementById('g-tawkto-widgetId').value;

        // Gallery Ad Banner
        if (!this.siteData.galleryAd) this.siteData.galleryAd = {};
        this.siteData.galleryAd.enabled = document.getElementById('ad-gallery-enabled').checked;
        this.siteData.galleryAd.badge = document.getElementById('ad-gallery-badge').value;
        this.siteData.galleryAd.title = document.getElementById('ad-gallery-title').value;
        this.siteData.galleryAd.desc = document.getElementById('ad-gallery-desc').value;
        this.siteData.galleryAd.image = document.getElementById('ad-gallery-image').value;
        this.siteData.galleryAd.link = document.getElementById('ad-gallery-link').value;
        this.siteData.galleryAd.ctaText = document.getElementById('ad-gallery-cta').value;
        this.siteData.galleryAd.customHtml = document.getElementById('ad-gallery-customHtml').value;

        // Home Hero
        this.siteData.home.hero.headingLine1 = document.getElementById('h-headingLine1').value;
        this.siteData.home.hero.headingLine2Prefix = document.getElementById('h-headingLine2Prefix').value;
        this.siteData.home.hero.typewriterWords = document.getElementById('h-typewriterWords').value.split(',').map(s => s.trim());
        this.siteData.home.hero.subtitle = document.getElementById('h-subtitle').value;
        this.siteData.home.hero.statsText = document.getElementById('h-statsText').value;
        this.siteData.home.hero.btnPrimaryText = document.getElementById('h-btnPrimaryText').value;
        this.siteData.home.hero.btnPrimaryLink = document.getElementById('h-btnPrimaryLink').value;
        this.siteData.home.hero.btnSecondaryText = document.getElementById('h-btnSecondaryText').value;
        this.siteData.home.hero.btnSecondaryLink = document.getElementById('h-btnSecondaryLink').value;

        // Home CTA
        this.siteData.home.cta.liveBadge = document.getElementById('h-ctaLiveBadge').value;
        this.siteData.home.cta.titleLine1 = document.getElementById('h-ctaTitleLine1').value;
        this.siteData.home.cta.titleItalic = document.getElementById('h-ctaTitleItalic').value;
        this.siteData.home.cta.desc = document.getElementById('h-ctaDesc').value;
        this.siteData.home.cta.descStrong = document.getElementById('h-ctaDescStrong').value;
        this.siteData.home.cta.btnText = document.getElementById('h-ctaBtnText').value;
        this.siteData.home.cta.responseTime = document.getElementById('h-ctaResponseTime').value;
        this.siteData.home.cta.noRisk = document.getElementById('h-ctaNoRisk').value;

        this.siteData.home.pipeline.subtitle = document.getElementById('h-pipeSubtitle').value;
        this.siteData.home.pipeline.titleLine1 = document.getElementById('h-pipeTitle1').value;
        this.siteData.home.pipeline.titleHighlight = document.getElementById('h-pipeTitleHighlight').value;

        this.siteData.home.portfolio.metaNumber = document.getElementById('h-portMetaNumber').value;
        this.siteData.home.portfolio.metaLabel = document.getElementById('h-portMetaLabel').value;
        this.siteData.home.portfolio.title = document.getElementById('h-portTitle').value;
        this.siteData.home.portfolio.titleItalic = document.getElementById('h-portTitleItalic').value;
        this.siteData.home.portfolio.archiveBtnText = document.getElementById('h-portArchiveBtnText').value;

        if (!this.siteData.home.socialProof) this.siteData.home.socialProof = {};
        this.siteData.home.socialProof.metaNumber = document.getElementById('h-proofMetaNumber').value;
        this.siteData.home.socialProof.metaLabel = document.getElementById('h-proofMetaLabel').value;
        this.siteData.home.socialProof.titleLine1 = document.getElementById('h-proofTitle1').value;
        this.siteData.home.socialProof.titleHighlight = document.getElementById('h-proofTitleHighlight').value;
        this.siteData.home.socialProof.desc = document.getElementById('h-proofDesc').value;
        
        this.siteData.home.faq.metaNumber = document.getElementById('h-faqMetaNumber').value;
        this.siteData.home.faq.metaLabel = document.getElementById('h-faqMetaLabel').value;
        this.siteData.home.faq.titleLine1 = document.getElementById('h-faqTitle1').value;
        this.siteData.home.faq.titleHighlight = document.getElementById('h-faqTitleHighlight').value;

        if (!this.siteData.home.onboarding) this.siteData.home.onboarding = {};
        this.siteData.home.onboarding.metaNumber = document.getElementById('h-onbMetaNumber').value;
        this.siteData.home.onboarding.metaLabel = document.getElementById('h-onbMetaLabel').value;
        this.siteData.home.onboarding.titleLine1 = document.getElementById('h-onbTitle1').value;
        this.siteData.home.onboarding.titleHighlight = document.getElementById('h-onbTitleHighlight').value;
        this.siteData.home.onboarding.btnText = document.getElementById('h-onbBtnText').value;
        
        if (!this.siteData.home.onboarding.fields) this.siteData.home.onboarding.fields = {};
        const fields = this.siteData.home.onboarding.fields;
        fields.name = { label: document.getElementById('h-onb-f-name-label').value, placeholder: document.getElementById('h-onb-f-name-placeholder').value };
        fields.email = { label: document.getElementById('h-onb-f-email-label').value, placeholder: document.getElementById('h-onb-f-email-placeholder').value };
        fields.company = { label: document.getElementById('h-onb-f-company-label').value, placeholder: document.getElementById('h-onb-f-company-placeholder').value };
        fields.social = { label: document.getElementById('h-onb-f-social-label').value, placeholder: document.getElementById('h-onb-f-social-placeholder').value };
        fields.project_classification = { label: document.getElementById('h-onb-f-class-label').value, placeholder: document.getElementById('h-onb-f-class-placeholder').value, options: document.getElementById('h-onb-f-class-options').value };
        fields.allocated_budget = { label: document.getElementById('h-onb-f-budget-label').value, placeholder: document.getElementById('h-onb-f-budget-placeholder').value, options: document.getElementById('h-onb-f-budget-options').value };
        fields.location = { label: document.getElementById('h-onb-f-loc-label').value, placeholder: document.getElementById('h-onb-f-loc-placeholder').value };
        fields.details = { label: document.getElementById('h-onb-f-det-label').value, placeholder: document.getElementById('h-onb-f-det-placeholder').value };

        // About
        this.siteData.about.badge = document.getElementById('a-badge').value;
        this.siteData.about.name = document.getElementById('a-name').value;
        this.siteData.about.typewriterWords = document.getElementById('a-typewriterWords').value.split(',').map(s => s.trim());
        this.siteData.about.bio = document.getElementById('a-bio').value;
        this.siteData.about.profileImage = document.getElementById('a-profileImage').value;

        // Work
        if (!this.siteData.work) this.siteData.work = {};
        this.siteData.work.breadcrumb = document.getElementById('w-breadcrumb').value;
        this.siteData.work.titleLine1 = document.getElementById('w-titleLine1').value;
        this.siteData.work.titleItalic = document.getElementById('w-titleItalic').value;
        this.siteData.work.titleLine2 = document.getElementById('w-titleLine2').value;
    },

    saveToLocal(silent = false) {
        this.syncAllForms();
        localStorage.setItem('cms_siteData', JSON.stringify(this.siteData));
        localStorage.setItem('cms_foldersData', JSON.stringify(this.foldersData));

        if (!silent) {
            this.showToast("Saved to local draft cache!", "success");
        }
        
        const iframe = document.getElementById('global-preview-iframe');
        if(iframe && iframe.contentWindow) {
            iframe.contentWindow.location.reload();
        }
    },

    async savePermanent() {
        if (this.isSaving) return;
        this.isSaving = true;
        const btn = document.getElementById('btn-save-permanent');
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> SAVING...`;
            btn.disabled = true;
        }

        try {
            // 1. Sync all form tabs into siteData & foldersData
            this.syncAllForms();

            // 2. Attempt save to server /api/save
            let serverSaved = false;
            try {
                const token = sessionStorage.getItem('admin_token') || '';
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        siteData: this.siteData,
                        foldersData: this.foldersData,
                        adminPassword: this.siteData.global.adminPassword
                    })
                });

                if (response.ok) {
                    const resJson = await response.json();
                    if (resJson.success) {
                        serverSaved = true;
                    }
                }
            } catch (netErr) {
                console.log("No live server endpoint available or fetch failed.");
            }

            // 3. Always save to LocalStorage as well
            localStorage.setItem('cms_siteData', JSON.stringify(this.siteData));
            localStorage.setItem('cms_foldersData', JSON.stringify(this.foldersData));

            // 4. Reload the iframe preview automatically
            const iframe = document.getElementById('global-preview-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.location.reload();
            }

            if (serverSaved) {
                this.showToast("✓ All changes PERMANENTLY saved to server & disk!", "success");
                this.updateBackendStatus(true);
            } else {
                // If on Netlify / static hosting without live server, check for GitHub Sync configuration
                const ghRepo = this.siteData.global?.github?.repo;
                const ghToken = this.siteData.global?.github?.token;
                if (ghRepo && ghToken) {
                    this.showToast("Publishing live to GitHub repository...", "warning");
                    const ghSuccess = await this.publishToGitHub(ghRepo, ghToken);
                    if (ghSuccess) {
                        this.showToast("✓ Pushed to GitHub! Netlify is automatically publishing your live changes (~20s).", "success");
                        return;
                    }
                }
                this.showToast("Changes saved to Local Draft Cache! (Run 'node server.js' or connect GitHub to publish live)", "warning");
                this.updateBackendStatus(false);
            }
        } catch (e) {
            console.error(e);
            this.showToast("Save error: " + e.message, "error");
        } finally {
            this.isSaving = false;
            if (btn) {
                btn.innerHTML = origHtml || `<i class="fa-solid fa-floppy-disk"></i> PERMANENT SAVE`;
                btn.disabled = false;
            }
        }
    },

    async publishToGitHub(repo, token) {
        try {
            const siteStr = JSON.stringify(this.siteData, null, 2);
            const foldStr = JSON.stringify(this.foldersData, null, 2);
            
            await this.commitFileToGitHub(repo, token, 'POR/data/site-data.json', siteStr, 'CMS Update: site-data.json');
            await this.commitFileToGitHub(repo, token, 'POR/data/folders.json', foldStr, 'CMS Update: folders.json');
            return true;
        } catch(err) {
            console.error("GitHub publish error:", err);
            this.showToast("GitHub sync error: " + err.message, "error");
            return false;
        }
    },

    async commitFileToGitHub(repo, token, filePath, contentStr, message) {
        let apiPath = filePath;
        let url = `https://api.github.com/repos/${repo}/contents/${apiPath}`;
        let sha = null;
        
        let getRes = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        
        // If repository root does not have POR/ prefix, retry without POR/
        if (!getRes.ok && apiPath.startsWith('POR/')) {
            apiPath = apiPath.replace('POR/', '');
            url = `https://api.github.com/repos/${repo}/contents/${apiPath}`;
            getRes = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
            });
        }

        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }

        const utf8Bytes = new TextEncoder().encode(contentStr);
        let binary = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
            binary += String.fromCharCode(utf8Bytes[i]);
        }
        const base64Content = btoa(binary);

        const bodyPayload = {
            message: message,
            content: base64Content
        };
        if (sha) bodyPayload.sha = sha;

        const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyPayload)
        });

        if (!putRes.ok) {
            const errJson = await putRes.json().catch(() => ({}));
            throw new Error(errJson.message || `HTTP ${putRes.status} on ${apiPath}`);
        }
        return true;
    },

    exportJson() {
        this.syncAllForms();
        
        const siteStr = JSON.stringify(this.siteData, null, 2);
        const siteBlob = new Blob([siteStr], { type: "application/json" });
        const siteUrl = URL.createObjectURL(siteBlob);
        const siteA = document.createElement('a');
        siteA.href = siteUrl;
        siteA.download = "site-data.json";
        siteA.click();

        const foldStr = JSON.stringify(this.foldersData, null, 2);
        const foldBlob = new Blob([foldStr], { type: "application/json" });
        const foldUrl = URL.createObjectURL(foldBlob);
        const foldA = document.createElement('a');
        foldA.href = foldUrl;
        foldA.download = "folders.json";
        foldA.click();

        this.showToast("Exported site-data.json and folders.json!", "success");
    },

    // ----------------------------------------------------
    // SUBMISSIONS MANAGEMENT
    // ----------------------------------------------------
    renderSubmissions() {
        const container = document.getElementById('submissions-list');
        if (!container) return;

        let submissions = [];
        try {
            const saved = localStorage.getItem('cms_submissions');
            if (saved) submissions = JSON.parse(saved);
        } catch (e) {}

        if (submissions.length === 0) {
            container.innerHTML = '<p style="color:#666; font-style:italic;">No lead form submissions received yet.</p>';
            return;
        }

        container.innerHTML = submissions.map((sub, idx) => `
            <div class="dynamic-item" style="border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 15px; background: rgba(255,255,255,0.02);">
                <div class="dynamic-item-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; margin-bottom: 12px;">
                    <div>
                        <h4 style="color:#ff003c; margin:0; font-family:'Space Mono', monospace; font-size:1rem;">Inquiry #${submissions.length - idx} &bull; ${sub.name || 'Anonymous'}</h4>
                        <span style="font-size:0.75rem; color:#777;">${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'N/A'}</span>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="Admin.deleteSubmission(${idx})"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 0.85rem; color: #ccc;">
                    <div><strong style="color:#fff;">Email:</strong> ${sub.email || 'N/A'}</div>
                    <div><strong style="color:#fff;">Company:</strong> ${sub.company || 'N/A'}</div>
                    <div><strong style="color:#fff;">Social:</strong> ${sub.social || 'N/A'}</div>
                    <div><strong style="color:#fff;">Classification:</strong> ${sub.project_classification || 'N/A'}</div>
                    <div><strong style="color:#fff;">Budget:</strong> ${sub.allocated_budget || 'N/A'}</div>
                    <div><strong style="color:#fff;">Location:</strong> ${sub.location || 'N/A'}</div>
                </div>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.05); font-size: 0.85rem; color: #aaa;">
                    <strong style="color:#fff;">Details:</strong> ${sub.details || 'No details provided.'}
                </div>
            </div>
        `).join('');
    },

    deleteSubmission(idx) {
        if (confirm("Delete this submission?")) {
            let submissions = [];
            try {
                const saved = localStorage.getItem('cms_submissions');
                if (saved) submissions = JSON.parse(saved);
            } catch (e) {}
            submissions.splice(idx, 1);
            localStorage.setItem('cms_submissions', JSON.stringify(submissions));
            this.renderSubmissions();
            this.showToast("Submission deleted.", "warning");
        }
    },

    clearSubmissions() {
        if (confirm("Are you sure you want to clear ALL form submissions?")) {
            localStorage.removeItem('cms_submissions');
            this.renderSubmissions();
            this.showToast("All submissions cleared.", "warning");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Admin.init();
});
