/**
 * RE-RENDER CMS Content Loader
 * Fetches JSON data and populates the DOM.
 */

const CMS = {
    siteData: null,
    foldersData: null,
    
    async init() {
        try {
            // Load from localStorage if previewing from Admin, else load from files
            let localSiteData = localStorage.getItem('cms_siteData');
            const localFoldersData = localStorage.getItem('cms_foldersData');
            
            // Cache bust for new schema features
            if (localSiteData && !localSiteData.includes('btnPrimaryText')) {
                console.log("Old schema detected. Clearing cache.");
                localStorage.removeItem('cms_siteData');
                localSiteData = null;
            }
            
            // Check live backend API first, then local storage, then static JSON with cache-buster
            let liveSiteRes = await fetch('/api/site-data').catch(() => null);
            if (liveSiteRes && liveSiteRes.ok) {
                this.siteData = await liveSiteRes.json();
            } else if (localSiteData) {
                this.siteData = JSON.parse(localSiteData);
            } else {
                const bust = `?v=${Date.now()}`;
                let res = await fetch('data/site-data.json' + bust).catch(() => null);
                if (!res || !res.ok) res = await fetch('/data/site-data.json' + bust).catch(() => null);
                if (!res || !res.ok) res = await fetch('./data/site-data.json' + bust).catch(() => null);
                if (res && res.ok) this.siteData = await res.json();
            }

            if (this.siteData && this.siteData.home && this.siteData.home.socialProof && this.siteData.home.socialProof.testimonials) {
                this.siteData.home.socialProof.testimonials.forEach(t => {
                    if (!t.name && t.clientName) t.name = t.clientName;
                    if (!t.role && t.clientRole) t.role = t.clientRole;
                });
            }
            
            let liveFoldersRes = await fetch('/api/folders').catch(() => null);
            if (liveFoldersRes && liveFoldersRes.ok) {
                this.foldersData = await liveFoldersRes.json();
            } else if (localFoldersData) {
                this.foldersData = JSON.parse(localFoldersData);
            } else {
                const bust = `?v=${Date.now()}`;
                let res = await fetch('data/folders.json' + bust).catch(() => null);
                if (!res || !res.ok) res = await fetch('/data/folders.json' + bust).catch(() => null);
                if (!res || !res.ok) res = await fetch('./data/folders.json' + bust).catch(() => null);
                if (res && res.ok) this.foldersData = await res.json();
            }
            
            // Normalize foldersData to ensure array
            if (this.foldersData && !Array.isArray(this.foldersData) && Array.isArray(this.foldersData.value)) {
                this.foldersData = this.foldersData.value;
            }
            if (!Array.isArray(this.foldersData)) {
                this.foldersData = [];
            }
            
            this.populateTextAndImages();
            this.renderNav();
            this.renderFooter();
            this.injectMediaPlayerModal();
            this.injectTawkto();
            this.initContactForm();
            
            // Trigger specific page renders based on URL path or DOM element existence
            const path = window.location.pathname.toLowerCase();
            if (path.includes('about') || document.querySelector('.about-badge')) {
                this.renderAbout();
            } else if (path.includes('work') || path.includes('archive') || document.querySelector('.archive-mac-grid')) {
                this.renderWork();
            } else if (path.includes('gallery') || document.querySelector('.gallery-grid')) {
                this.renderGallery();
            } else {
                this.renderHome();
            }
            
        } catch (error) {
            console.error("Error loading CMS data:", error);
        } finally {
            // Fire event so page scripts know DOM is ready (or failed)
            window.CMS_CONTENT_LOADED = true;
            document.dispatchEvent(new Event('content-loaded'));
        }
    },
    
    // Helper to get nested value (e.g. "home.hero.title")
    getValue(path) {
        return path.split('.').reduce((obj, key) => (obj && obj[key] !== 'undefined') ? obj[key] : null, this.siteData);
    },
    
    populateTextAndImages() {
        // Elements that just need text content
        document.querySelectorAll('[data-cms-text]').forEach(el => {
            const val = this.getValue(el.getAttribute('data-cms-text'));
            if (val) el.textContent = val;
        });
        
        // Elements that need HTML content
        document.querySelectorAll('[data-cms-html]').forEach(el => {
            const val = this.getValue(el.getAttribute('data-cms-html'));
            if (val) el.innerHTML = val;
        });
        
        // Images that need src updated
        document.querySelectorAll('[data-cms-src]').forEach(el => {
            const val = this.getValue(el.getAttribute('data-cms-src'));
            if (val) el.src = val;
        });
        
        // Links that need href updated
        document.querySelectorAll('[data-cms-href]').forEach(el => {
            const val = this.getValue(el.getAttribute('data-cms-href'));
            if (val) el.href = val;
        });
    },
    
    renderNav() {
        const navContainer = document.querySelector('.nav-links');
        if (!navContainer) return;
        
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const data = this.siteData.global.nav;
        
        document.querySelector('.nav-logo').textContent = this.siteData.global.logoText;
        document.querySelector('.nav-btn').textContent = data.ctaText;
        document.querySelector('.nav-btn').href = data.ctaHref;
        
        let navHtml = '';
        data.links.forEach(link => {
            const isActive = link.href.includes(currentPath) && currentPath !== 'index.html' ? 'active-link' : '';
            
            if (link.hasDropdown) {
                let dropHtml = `<li class="nav-item has-dropdown">
                    <a href="${link.href}" class="nav-link ${isActive}">${link.label} <i class="fa-solid fa-chevron-down"></i></a>
                    <div class="nav-dropdown">`;
                
                // If it's the Services dropdown, auto-generate from foldersData
                if (link.label === "Services" && this.foldersData) {
                    this.foldersData.forEach(folder => {
                        dropHtml += `
                        <a href="gallery.html?folder=${folder.id}" class="dropdown-item">
                            <div class="dropdown-icon"><i class="fa-regular fa-folder-open"></i></div>
                            <div class="dropdown-text">
                                <h4>${folder.name}</h4>
                                <p>View ${folder.tag || 'Gallery'}</p>
                            </div>
                        </a>`;
                    });
                } else if (link.dropdown) {
                    link.dropdown.forEach(item => {
                        if (item.divider) {
                            dropHtml += `<div class="dropdown-divider"></div>`;
                        } else {
                            dropHtml += `
                            <a href="${item.href}" class="dropdown-item">
                                <div class="dropdown-icon"><i class="${item.icon}"></i></div>
                                <div class="dropdown-text">
                                    <h4>${item.title}</h4>
                                    <p>${item.desc}</p>
                                </div>
                            </a>`;
                        }
                    });
                }
                dropHtml += `</div></li>`;
                navHtml += dropHtml;
            } else {
                navHtml += `<li class="nav-item"><a href="${link.href}" class="nav-link ${isActive}">${link.label}</a></li>`;
            }
        });
        
        navContainer.innerHTML = navHtml;
        
        // Mobile Menu Injection & Logic
        const actionsContainer = document.querySelector('.nav-actions');
        if (actionsContainer && !document.querySelector('.mobile-menu-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'mobile-menu-toggle';
            toggleBtn.innerHTML = `
                <div class="hamburger-line line-1"></div>
                <div class="hamburger-line line-2"></div>
                <div class="hamburger-line line-3"></div>
            `;
            actionsContainer.appendChild(toggleBtn);
            
            const overlay = document.createElement('div');
            overlay.className = 'mobile-menu-overlay';
            
            const overlayNavHtml = `<ul class="mobile-nav-links">${navHtml}</ul>`;
            overlay.innerHTML = overlayNavHtml;
            document.body.appendChild(overlay);
            
            toggleBtn.addEventListener('click', () => {
                const isOpen = toggleBtn.classList.toggle('open');
                overlay.classList.toggle('open');
                document.body.style.overflow = isOpen ? 'hidden' : '';
            });
            
            overlay.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    const parentItem = link.closest('.has-dropdown');
                    if (parentItem) {
                        e.preventDefault();
                        parentItem.classList.toggle('open');
                        return; // Do not close the overlay
                    }
                    toggleBtn.classList.remove('open');
                    overlay.classList.remove('open');
                    document.body.style.overflow = '';
                });
            });
            
            // Close menu if logo is clicked
            const navLogo = document.querySelector('.nav-logo');
            if (navLogo) {
                navLogo.addEventListener('click', () => {
                    toggleBtn.classList.remove('open');
                    overlay.classList.remove('open');
                    document.body.style.overflow = '';
                });
            }
            
            // Also ensure tapping a dropdown item closes the overlay
            overlay.querySelectorAll('.dropdown-item').forEach(link => {
                link.addEventListener('click', () => {
                    toggleBtn.classList.remove('open');
                    overlay.classList.remove('open');
                    document.body.style.overflow = '';
                });
            });
        }
    },
    
    renderFooter() {
        const footer = document.querySelector('.site-footer');
        if (!footer) return;
        
        const data = this.siteData.global.footer;
        
        document.querySelector('.meta-left').textContent = data.metaLeft;
        document.querySelector('.meta-right').textContent = data.metaRight;
        
        // Col 1 (Sitemap synced to Nav Links)
        const sitemapList = document.querySelectorAll('.footer-col')[0].querySelector('.footer-links');
        sitemapList.innerHTML = this.siteData.global.nav.links.map(link => `<li><a href="${link.href}">${link.label}</a></li>`).join('');
        
        // Col 2 (Legal Popups)
        const legalList = document.querySelectorAll('.footer-col')[1].querySelector('.footer-links');
        legalList.innerHTML = data.legal.map((item, index) => `<li><a href="#" class="legal-link" data-legal-index="${index}">${item.label}</a></li>`).join('');

        // Attach Legal Popup Listeners
        setTimeout(() => {
            document.querySelectorAll('.legal-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openLegalModal(e.target.getAttribute('data-legal-index'));
                });
            });
        }, 100);
        
        // Col 3
        const socialsList = document.querySelectorAll('.footer-col')[2].querySelector('.footer-links');
        socialsList.innerHTML = data.socials.map(item => `<li><a target="_blank" rel="noopener" href="${item.href}">${item.label} <span class="arrow">&nearr;</span></a></li>`).join('');
        
        // Col 4
        document.querySelector('.contact-desc').textContent = data.contactDesc;
        const emailLink = document.querySelector('.footer-email');
        if (emailLink) {
            emailLink.href = `mailto:${data.contactEmail}`;
            emailLink.innerHTML = `${data.contactEmail} <span class="arrow">&nearr;</span>`;
        }
        
        document.querySelector('.footer-watermark').textContent = data.watermark;
        document.querySelector('.copyright').textContent = data.copyright;
        document.querySelector('.void-percent').textContent = data.voidPercent;
        document.querySelector('.void-label').textContent = data.voidLabel;
    },
    
    renderHome() {
        const data = this.siteData.home;
        if (!data) return;
        
        // Hero Section
        const headline = document.querySelector('.headline');
        if (headline) {
            headline.innerHTML = `${data.hero.headingLine1} <br> <span class="highlight">${data.hero.headingLine2Prefix} <span id="hero-typewriter"></span><span class="cursor-blink">|</span></span>`;
            
            // Re-bind typewriter
            const typeText = document.getElementById('hero-typewriter');
            const words = data.hero.typewriterWords;
            let wordIndex = 0;
            let charIndex = 0;
            let isDeleting = false;
            
            function type() {
                const currentWord = words[wordIndex];
                if (isDeleting) {
                    typeText.textContent = currentWord.substring(0, charIndex - 1);
                    charIndex--;
                } else {
                    typeText.textContent = currentWord.substring(0, charIndex + 1);
                    charIndex++;
                }

                let typeSpeed = isDeleting ? 50 : 150;

                if (!isDeleting && charIndex === currentWord.length) {
                    typeSpeed = 2000; 
                    isDeleting = true;
                } else if (isDeleting && charIndex === 0) {
                    isDeleting = false;
                    wordIndex = (wordIndex + 1) % words.length;
                    typeSpeed = 500;
                }

                setTimeout(type, typeSpeed);
            }
            setTimeout(type, 1000);
        }
        
        const subtitle = document.querySelector('.subtitle');
        if (subtitle) subtitle.innerHTML = data.hero.subtitle.replace('. For creators', '.<br>For creators');
        
        const stats = document.querySelector('.stats-text');
        if (stats) stats.innerHTML = data.hero.statsText.replace(/•/g, '&nbsp;&bull;&nbsp;');

        // Hero Buttons
        const ctaGroup = document.querySelector('.cta-group');
        if (ctaGroup && data.hero.btnPrimaryText) {
            ctaGroup.innerHTML = `
                <button class="btn-primary" onclick="window.location.href='${data.hero.btnPrimaryLink}'">${data.hero.btnPrimaryText} <i class="fa-solid fa-arrow-right"></i></button>
                <button class="btn-secondary" onclick="window.location.href='${data.hero.btnSecondaryLink}'">${data.hero.btnSecondaryText}</button>
            `;
        }
        
        // Portfolio Section Header
        const portMeta = document.querySelector('.portfolio-section .portfolio-meta');
        if (portMeta && data.portfolio && data.portfolio.metaNumber) {
            portMeta.innerHTML = `<span class="meta-number">${data.portfolio.metaNumber}</span> &mdash; ${data.portfolio.metaLabel || ''} <div class="meta-line"></div>`;
        }

        const portTitle = document.querySelector('.portfolio-title');
        if (portTitle && data.portfolio && data.portfolio.title) {
            portTitle.innerHTML = `${data.portfolio.title} <span class="portfolio-italic">${data.portfolio.titleItalic || ''}</span>`;
        }

        const archiveBtn = document.querySelector('.btn-archive');
        if (archiveBtn && data.portfolio && data.portfolio.archiveBtnText) {
            archiveBtn.textContent = data.portfolio.archiveBtnText;
        }

        // Portfolio Videos
        const colLeft = document.querySelector('.col-left');
        const colMiddle = document.querySelector('.col-middle');
        const colRight = document.querySelector('.col-right');
        
        if (colLeft && colMiddle && colRight && data.portfolio && data.portfolio.videos) {
            colLeft.innerHTML = ''; colMiddle.innerHTML = ''; colRight.innerHTML = '';
            
            data.portfolio.videos.forEach(v => {
                const media = this.parseMediaUrl(v.src);
                let vidInner = '';
                
                if (media.type === 'iframe' && media.embedUrl.includes('youtube')) {
                    // Extract video ID for playlist looping
                    const ytReg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
                    const ytMatch = v.src.match(ytReg);
                    const ytId = ytMatch ? ytMatch[1] : '';
                    
                    const hoverIframeSrc = `https://www.youtube-nocookie.com/embed/${ytId}?enablejsapi=1&autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${ytId}&playsinline=1&showinfo=0&disablekb=1&fs=0&iv_load_policy=3&start=3`;
                    
                    vidInner = `
                        <img src="${v.poster}" alt="preview" class="portfolio-poster" style="width:100%; height:100%; object-fit:cover;">
                        <div class="hover-iframe-wrapper" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; opacity:0; transition:opacity 0.3s ease; overflow:hidden; z-index:2;">
                            <iframe src="${hoverIframeSrc}" style="position:absolute; top:-37.5%; left:-37.5%; width:175%; height:175%; border:none; pointer-events:none;" allow="autoplay"></iframe>
                        </div>
                    `;
                } else if (media.type === 'iframe') {
                    vidInner = `
                        <img src="${v.poster}" alt="preview" class="portfolio-poster" style="width:100%; height:100%; object-fit:cover;">
                        <div class="hover-iframe-wrapper" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; opacity:0; transition:opacity 0.3s ease; overflow:hidden; z-index:2;">
                            <iframe src="${media.embedUrl}" style="position:absolute; top:-37.5%; left:-37.5%; width:175%; height:175%; border:none; pointer-events:none;" allow="autoplay"></iframe>
                        </div>
                    `;
                } else {
                    // For direct MP4s
                    vidInner = `
                        <video muted loop playsinline preload="metadata" poster="${v.poster}" style="width:100%; height:100%; object-fit:cover;">
                            <source src="${v.src}" type="video/mp4">
                        </video>
                    `;
                }

                const vidHtml = `
                    <div class="portfolio-card ${v.wide ? 'card-wide' : ''}" data-video="${v.src}" data-ratio="${v.wide ? '16:9' : '9:16'}" style="position:relative; overflow:hidden; cursor:pointer;">
                        ${vidInner}
                    </div>`;
                    
                if (v.column === 'left') colLeft.innerHTML += vidHtml;
                else if (v.column === 'middle') colMiddle.innerHTML += vidHtml;
                else colRight.innerHTML += vidHtml;
            });
            
            document.querySelectorAll('.portfolio-card').forEach(card => {
                const video = card.querySelector('video');
                const iframeWrapper = card.querySelector('.hover-iframe-wrapper');
                
                if (video) {
                    video.pause();
                    card.addEventListener('mouseenter', () => video.play().catch(e => {}));
                    card.addEventListener('mouseleave', () => {
                        video.pause();
                    });
                } else if (iframeWrapper) {
                    card.addEventListener('mouseenter', () => {
                        iframeWrapper.style.opacity = '1';
                    });
                    card.addEventListener('mouseleave', () => {
                        iframeWrapper.style.opacity = '0';
                    });
                }
            });
        }
        
        // Pipeline Header & Steps
        const pipeSubtitle = document.querySelector('.pipeline-subtitle');
        if (pipeSubtitle && data.pipeline && data.pipeline.subtitle) pipeSubtitle.textContent = data.pipeline.subtitle;

        const pipeTitle = document.querySelector('.pipeline-title');
        if (pipeTitle && data.pipeline && data.pipeline.titleLine1) {
            pipeTitle.innerHTML = `${data.pipeline.titleLine1} <br> <span class="title-highlight">${data.pipeline.titleHighlight || ''}</span>`;
        }

        const stepsGrid = document.querySelector('.steps-grid');
        if (stepsGrid && data.pipeline && data.pipeline.steps) {
            stepsGrid.innerHTML = data.pipeline.steps.map(step => `
                <div class="step-card">
                    <div class="step-number">${step.number}</div>
                    <div class="step-badge">${step.badge}</div>
                    <h3 class="step-title">${step.title}</h3>
                    <p class="step-desc">${step.desc}</p>
                </div>
            `).join('');
        }
        
        // Social Proof Header & Testimonials
        if (data.socialProof) {
            const proofMeta = document.querySelector('.social-proof-section .portfolio-meta');
            if (proofMeta && data.socialProof.metaNumber) {
                proofMeta.innerHTML = `<span class="meta-number">${data.socialProof.metaNumber}</span> &mdash; ${data.socialProof.metaLabel || ''} <div class="meta-line"></div>`;
            }

            const proofTitle = document.querySelector('.social-proof-title');
            if (proofTitle && data.socialProof.titleLine1) {
                proofTitle.innerHTML = `${data.socialProof.titleLine1} <br> <span class="title-highlight-red">${data.socialProof.titleHighlight || ''}</span>`;
            }

            const proofDesc = document.querySelector('.social-proof-desc');
            if (proofDesc && data.socialProof.desc) {
                proofDesc.textContent = data.socialProof.desc;
            }
        }

        const testimonialsTrack = document.querySelector('.testimonials-track');
        if (testimonialsTrack && data.socialProof && data.socialProof.testimonials) {
            const generateTestimonialsHtml = () => data.socialProof.testimonials.map(t => {
                const name = t.name || t.clientName || '';
                const role = t.role || t.clientRole || '';
                return `
                <div class="testimonial-card">
                    <div class="card-top">
                        <div class="stars">★★★★★</div>
                        <span class="client-badge"><i class="fa-solid fa-check"></i> VERIFIED CLIENT</span>
                        <i class="fa-solid fa-quote-right quote-icon"></i>
                    </div>
                    <p class="review-text">${t.text || ''}</p>
                    <div class="client-profile">
                        <img src="${t.avatar || ''}" alt="${name}" class="avatar">
                        <div class="client-info">
                            <span class="client-name">${name}</span>
                            <span class="client-role">${role}</span>
                        </div>
                    </div>
                </div>
            `}).join('');
            
            // Generate twice for seamless marquee loop
            testimonialsTrack.innerHTML = generateTestimonialsHtml() + generateTestimonialsHtml();
        }
        
        // FAQ Section Header & Items
        if (data.faq) {
            const faqMeta = document.querySelector('.faq-section .portfolio-meta');
            if (faqMeta && data.faq.metaNumber) {
                faqMeta.innerHTML = `<span class="meta-number">${data.faq.metaNumber}</span> &mdash; ${data.faq.metaLabel || ''} <div class="meta-line"></div>`;
            }

            const faqHeaderTitle = document.querySelector('.faq-title');
            if (faqHeaderTitle && data.faq.titleLine1) {
                faqHeaderTitle.innerHTML = `${data.faq.titleLine1} <br><span class="title-highlight-red">${data.faq.titleHighlight || ''}</span>`;
            }
        }

        const faqAccordion = document.querySelector('.faq-accordion');
        if (faqAccordion && data.faq && data.faq.items) {
            faqAccordion.innerHTML = data.faq.items.map(item => `
                <div class="faq-item ${item.active ? 'active' : ''}">
                    <button class="faq-question" aria-expanded="${item.active ? 'true' : 'false'}">
                        <span>${item.question}</span>
                        <i class="fa-solid fa-${item.active ? 'minus' : 'plus'} faq-icon"></i>
                    </button>
                    <div class="faq-answer" style="display: ${item.active ? 'block' : 'none'}">
                        <p>${item.answer}</p>
                    </div>
                </div>
            `).join('');
            
            // Re-bind FAQ JS
            document.querySelectorAll('.faq-question').forEach(btn => {
                btn.addEventListener('click', () => {
                    const item = btn.parentElement;
                    const isActive = item.classList.contains('active');
                    const answer = item.querySelector('.faq-answer');
                    const icon = btn.querySelector('.faq-icon');
                    
                    document.querySelectorAll('.faq-item').forEach(otherItem => {
                        if(otherItem !== item) {
                            otherItem.classList.remove('active');
                            const otherBtn = otherItem.querySelector('.faq-question');
                            otherBtn.setAttribute('aria-expanded', 'false');
                            otherItem.querySelector('.faq-answer').style.display = 'none';
                            otherItem.querySelector('.faq-icon').className = 'fa-solid fa-plus faq-icon';
                        }
                    });
                    
                    if (isActive) {
                        item.classList.remove('active');
                        btn.setAttribute('aria-expanded', 'false');
                        answer.style.display = 'none';
                        icon.className = 'fa-solid fa-plus faq-icon';
                    } else {
                        item.classList.add('active');
                        btn.setAttribute('aria-expanded', 'true');
                        answer.style.display = 'block';
                        icon.className = 'fa-solid fa-minus faq-icon';
                    }
                });
            });
        }
        
        // CTA Section
        if (data.cta) {
            const ctaLive = document.querySelector('.live-viewer-badge span:last-child');
            if (ctaLive && data.cta.liveBadge) ctaLive.textContent = data.cta.liveBadge;
            
            const ctaTitle = document.querySelector('.cta-title');
            if (ctaTitle && data.cta.titleLine1) ctaTitle.innerHTML = `${data.cta.titleLine1} <br> <span class="title-italic-red">${data.cta.titleItalic || ''}</span>`;
            
            const ctaDesc = document.querySelector('.cta-desc');
            if (ctaDesc && data.cta.desc) ctaDesc.innerHTML = `${data.cta.desc}<br><strong>${data.cta.descStrong || ''}</strong>`;
            
            const ctaBtn = document.querySelector('.btn-talk-cta span');
            if (ctaBtn && data.cta.btnText) ctaBtn.textContent = data.cta.btnText;

            const responseTime = document.querySelector('.cta-subnote .response-time');
            if (responseTime && data.cta.responseTime) {
                responseTime.innerHTML = `<i class="fa-solid fa-bolt"></i> ${data.cta.responseTime}`;
            }

            const noRisk = document.querySelector('.cta-subnote .no-risk');
            if (noRisk && data.cta.noRisk) {
                noRisk.textContent = data.cta.noRisk;
            }
        }
        
        // Onboarding Form
        if (data.onboarding) {
            const onbMeta = document.querySelector('.onboarding-section .portfolio-meta');
            if (onbMeta && data.onboarding.metaNumber) {
                onbMeta.innerHTML = `<span class="meta-number">${data.onboarding.metaNumber}</span> &mdash; ${data.onboarding.metaLabel || ''} <div class="meta-line"></div>`;
            }
            
            const onbTitle = document.querySelector('.onboarding-title');
            if (onbTitle && data.onboarding.titleLine1) {
                onbTitle.innerHTML = `${data.onboarding.titleLine1} <br> <span class="title-highlight-red">${data.onboarding.titleHighlight || ''}</span>`;
            }
            
            const onbBtn = document.querySelector('.onboarding-form .btn-lock-project span');
            if (onbBtn && data.onboarding.btnText) {
                onbBtn.textContent = data.onboarding.btnText;
            }
            
            if (data.onboarding.fields) {
                const fields = data.onboarding.fields;
                
                const updateField = (name, fieldData, isSelect = false) => {
                    if (!fieldData) return;
                    const input = document.querySelector(`.onboarding-form [name="${name}"]`);
                    if (!input) return;
                    
                    const group = input.closest('.form-group');
                    if (group) {
                        const label = group.querySelector('.form-label');
                        if (label && fieldData.label) label.textContent = fieldData.label;
                    }
                    
                    if (isSelect) {
                        const trigger = group.querySelector('.custom-select-trigger');
                        if (trigger && fieldData.placeholder) trigger.textContent = fieldData.placeholder;
                        
                        if (fieldData.options) {
                            const optionsContainer = group.querySelector('.custom-options');
                            if (optionsContainer) {
                                const opts = fieldData.options.split(',').map(o => o.trim()).filter(Boolean);
                                optionsContainer.innerHTML = opts.map(o => `<div class="custom-option" data-value="${o.toLowerCase().replace(/\s+/g, '-')}">${o}</div>`).join('');
                                
                                // Rebind listeners
                                const select = group.querySelector('.custom-select');
                                const newOptions = optionsContainer.querySelectorAll('.custom-option');
                                newOptions.forEach(option => {
                                    option.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        trigger.textContent = option.textContent;
                                        trigger.style.color = '#ffffff';
                                        input.value = option.getAttribute('data-value');
                                        newOptions.forEach(opt => opt.classList.remove('selected'));
                                        option.classList.add('selected');
                                        select.classList.remove('open');
                                    });
                                });
                            }
                        }
                    } else {
                        if (fieldData.placeholder) input.placeholder = fieldData.placeholder;
                    }
                };
                
                updateField('name', fields.name);
                updateField('email', fields.email);
                updateField('company', fields.company);
                updateField('social', fields.social);
                updateField('location', fields.location);
                updateField('details', fields.details);
                updateField('project_classification', fields.project_classification, true);
                updateField('allocated_budget', fields.allocated_budget, true);
            }
        }
    },
    
    renderAbout() {
        const data = this.siteData.about;
        if (!data) return;
        
        const badge = document.querySelector('.about-badge');
        if (badge && data.badge) badge.textContent = data.badge;

        const title = document.querySelector('.about-title');
        if (title && data.name) title.textContent = data.name;

        const bio = document.querySelector('.about-card-body');
        if (bio && data.bio) bio.innerHTML = `<p>${data.bio}</p>`;

        const img = document.querySelector('.about-image-wrapper img');
        if (img && data.profileImage) {
            img.src = data.profileImage;
            if (data.name) img.alt = data.name;
        }

        // Typewriter Pro Animation
        const targetElement = document.getElementById("typewriter-text");
        if (targetElement && data.typewriterWords) {
            const words = data.typewriterWords;
            let wordIndex = 0;
            let charIndex = 0;
            let isDeleting = false;

            function type() {
                const currentWord = words[wordIndex];
                if (isDeleting) {
                    targetElement.textContent = currentWord.substring(0, charIndex - 1);
                    charIndex--;
                } else {
                    targetElement.textContent = currentWord.substring(0, charIndex + 1);
                    charIndex++;
                }

                let typeSpeed = isDeleting ? 40 : 100 + Math.random() * 50;

                if (!isDeleting && charIndex === currentWord.length) {
                    typeSpeed = 2500; 
                    isDeleting = true;
                } else if (isDeleting && charIndex === 0) {
                    isDeleting = false;
                    wordIndex = (wordIndex + 1) % words.length;
                    typeSpeed = 400; 
                }
                setTimeout(type, typeSpeed);
            }
            setTimeout(type, 1800);
        }
        
        // Social Icons in Card
        const cardSocials = document.querySelector('.card-socials');
        if (cardSocials && data.socialLinks) {
            cardSocials.innerHTML = data.socialLinks.map(social => `
                <a href="${social.href}" class="social-icon" target="_blank" rel="noopener"><i class="${social.icon}"></i></a>
            `).join('');
        }
        
        // Stats
        const statsContainer = document.querySelector('.about-stats');
        if (statsContainer && data.stats) {
            statsContainer.innerHTML = data.stats.map(s => `
                <div class="stat-box">
                    <h3 class="stat-number">${s.number}</h3>
                    <p class="stat-label">${s.label}</p>
                </div>
            `).join('');
        }
        
        // FAQ
        const faqGrid = document.querySelector('.faq-grid');
        if (faqGrid && data.faq) {
            faqGrid.innerHTML = data.faq.map(item => `
                <div class="faq-card">
                    <h4>${item.question}</h4>
                    <p>${item.answer}</p>
                </div>
            `).join('');
        }
    },
    
    renderWork() {
        const data = this.siteData.work;
        if (data) {
            const bc = document.querySelector('.archive-breadcrumb');
            if (bc) bc.innerHTML = `<span class="bc-slash">/</span> ${data.breadcrumb || 'ARCHIVE'}`;

            const title = document.querySelector('.archive-title');
            if (title) title.innerHTML = `${data.titleLine1 || 'THE'} <em>${data.titleItalic || 'STUDIO'}</em><br>${data.titleLine2 || 'ARCHIVE'}`;
        }

        const grid = document.querySelector('.archive-mac-grid');
        if (!grid || !this.foldersData || !Array.isArray(this.foldersData)) return;
        
        grid.innerHTML = this.foldersData.map((folder, i) => {
            // Auto pick cover image if folder.preview is empty or broken
            let previewImg = folder.preview;
            if (!previewImg || previewImg.trim() === '') {
                if (folder.items && folder.items.length > 0) {
                    const firstWithSrc = folder.items.find(it => it.src && it.src.trim() !== '');
                    if (firstWithSrc) {
                        previewImg = firstWithSrc.src;
                    } else {
                        const firstVid = folder.items.find(it => it.videoSrc && it.videoSrc.trim() !== '');
                        if (firstVid) {
                            const yt = firstVid.videoSrc.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^"&?\/\s]{11})/);
                            if (yt && yt[1]) {
                                previewImg = `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
                            }
                        }
                    }
                }
            }
            if (!previewImg || previewImg.trim() === '') {
                previewImg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%23111"/><text x="300" y="190" font-family="monospace" font-size="22" fill="%23ff003c" font-weight="bold" text-anchor="middle">${encodeURIComponent(folder.name)}</text><text x="300" y="225" font-family="monospace" font-size="14" fill="%23666" text-anchor="middle">${folder.items ? folder.items.length : 0} ITEMS</text></svg>`;
            }

            return `
            <a href="gallery.html?folder=${folder.id}" class="folder-card mac-card" data-index="${i}">
                <div class="folder-wrapper">
                    <div class="folder-back-wall">
                        <div class="folder-tab-notch"></div>
                        <div class="folder-back-body"></div>
                    </div>
                    <div class="folder-preview-box">
                        <img src="${previewImg}" alt="${folder.name} preview" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'600\\' height=\\'400\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23111\\'/><text x=\\'300\\' y=\\'200\\' font-family=\\'monospace\\' font-size=\\'18\\' fill=\\'%23ff003c\\' text-anchor=\\'middle\\'>FOLDER PREVIEW</text></svg>'">
                    </div>
                    <div class="folder-front-cover">
                        <div class="folder-accent-line"></div>
                        <div class="folder-info">
                            <span class="folder-tag">${folder.items ? folder.items.length : 0}_NODES</span>
                            <div class="folder-name-row">
                                <h3>${folder.name}</h3>
                                <span class="folder-chevron"><i class="fa-solid fa-chevron-right"></i></span>
                            </div>
                        </div>
                    </div>
                </div>
                <span class="folder-filepath">${folder.filepath}</span>
            </a>
            `;
        }).join('');
    },
    
    renderGallery() {
        const urlParams = new URLSearchParams(window.location.search);
        const folderId = urlParams.get('folder');
        const folder = this.foldersData ? this.foldersData.find(f => f.id === folderId) : null;
        
        if (!folder) {
            const grid = document.querySelector('.gallery-grid');
            if (grid) grid.innerHTML = '<p style="color:white;text-align:center;grid-column:1/-1;padding:60px;">Folder not found. <a href="work.html" style="color:#ff003c;text-decoration:underline;margin-left:10px;">Return to Archive</a></p>';
            return;
        }
        
        // Populate header
        const bc = document.querySelector('.bc-folder');
        if (bc) bc.textContent = folder.name;
        
        const titleEl = document.querySelector('.gallery-title');
        if (titleEl) {
            titleEl.innerHTML = folder.name.replace(' ', '<br>'); 
            const parts = folder.name.split(' ');
            if(parts.length > 1) {
                titleEl.innerHTML = `${parts[0]}<br><em>${parts.slice(1).join(' ')}</em>`;
            }
        }

        // 1. Render Gallery Top Ad Banner if enabled
        const existingBanner = document.querySelector('.gallery-ad-banner');
        if (existingBanner) existingBanner.remove();

        const adData = this.siteData.galleryAd;
        if (adData && adData.enabled) {
            const bannerDiv = document.createElement('div');
            bannerDiv.className = 'gallery-ad-banner';
            if (adData.customHtml && adData.customHtml.trim() !== '') {
                bannerDiv.innerHTML = adData.customHtml;
            } else {
                bannerDiv.innerHTML = `
                    <div class="gallery-ad-banner-inner">
                        <div class="gallery-ad-badge">${adData.badge || 'SPONSORED'}</div>
                        <div class="gallery-ad-content">
                            ${adData.image ? `<img src="${adData.image}" alt="Ad Sponsor" class="gallery-ad-media">` : ''}
                            <div class="gallery-ad-text">
                                <h3>${adData.title || 'EXCLUSIVE PROMOTION'}</h3>
                                <p>${adData.desc || 'Special promotion from our verified creative partner.'}</p>
                            </div>
                        </div>
                        ${adData.link ? `<a href="${adData.link}" target="_blank" rel="noopener noreferrer" class="gallery-ad-btn">${adData.ctaText || 'CLAIM DEAL'} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
                    </div>
                `;
            }
            const controls = document.querySelector('.gallery-controls');
            if (controls && controls.parentNode) {
                controls.parentNode.insertBefore(bannerDiv, controls.nextSibling);
            }
        }
        
        // 2. Populate Grid
        const grid = document.querySelector('.gallery-grid');
        if (!grid) return;

        if (!folder.items || folder.items.length === 0) {
            grid.innerHTML = '<p style="color:#777; text-align:center; grid-column: 1/-1; padding: 40px; font-family:\'Space Mono\', monospace;">No media items in this folder yet.</p>';
            return;
        }

        grid.innerHTML = folder.items.map(item => {
            // Check for Ad Card
            if (item.type === 'ad') {
                const adImg = item.src || item.adImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
                return `
                <a href="${item.adLink || '#'}" target="_blank" rel="noopener noreferrer" class="gallery-item ad-item" data-id="${item.id}">
                    <div class="ad-card-badge">${item.adBadge || 'SPONSORED'}</div>
                    <img src="${adImg}" alt="${item.title}" class="gallery-preview">
                    <div class="item-info">
                        <div>
                            <h4>${item.title || 'Special Promotion'}</h4>
                            ${item.adDesc ? `<p class="ad-card-desc">${item.adDesc}</p>` : ''}
                        </div>
                        <span class="item-type">${item.adCta || 'VISIT'} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.65rem; margin-left:3px;"></i></span>
                    </div>
                </a>`;
            }

            if (item.type === 'video') {
                // Auto poster resolution if item.src is empty
                let posterSrc = item.src;
                if (!posterSrc || posterSrc.trim() === '') {
                    if (item.videoSrc) {
                        const ytMatch = item.videoSrc.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                        if (ytMatch && ytMatch[1]) {
                            posterSrc = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
                        }
                    }
                }
                if (!posterSrc || posterSrc.trim() === '') {
                    posterSrc = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="100%" height="100%" fill="%230a0a0a"/><circle cx="300" cy="170" r="40" fill="%23ff003c"/><polygon points="293,153 293,187 318,170" fill="%23ffffff"/><text x="300" y="240" font-family="monospace" font-size="14" fill="%23888888" text-anchor="middle">${encodeURIComponent(item.title || 'VIDEO MEDIA')}</text></svg>`;
                }

                return `
                <div class="gallery-item video-item" data-video="${item.videoSrc || ''}" data-ratio="${item.ratio || '16:9'}">
                    <img src="${posterSrc}" alt="${item.title}" class="gallery-preview" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'600\\' height=\\'340\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23111\\'/><circle cx=\\'300\\' cy=\\'170\\' r=\\'35\\' fill=\\'%23ff003c\\'/><polygon points=\\'294,155 294,185 315,170\\' fill=\\'%23fff\\'/></svg>'">
                    <div class="play-overlay"><i class="fa-solid fa-play"></i></div>
                    <div class="item-info">
                        <h4>${item.title}</h4>
                        <span class="item-type">VIDEO</span>
                    </div>
                </div>`;
            } else {
                let imgSrc = item.src;
                if (!imgSrc || imgSrc.trim() === '') {
                    imgSrc = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="100%" height="100%" fill="%23111"/><text x="300" y="175" font-family="monospace" font-size="16" fill="%23666" text-anchor="middle">${encodeURIComponent(item.title || 'IMAGE')}</text></svg>`;
                }
                return `
                <div class="gallery-item image-item" data-img="${imgSrc}">
                    <img src="${imgSrc}" alt="${item.title}" class="gallery-preview">
                    <div class="item-info">
                        <h4>${item.title}</h4>
                        <span class="item-type">IMAGE</span>
                    </div>
                </div>`;
            }
        }).join('');
    },
    
    parseMediaUrl(url) {
        if (!url) return { type: 'unknown', embedUrl: '' };

        // 1. YouTube
        const ytReg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const ytMatch = url.match(ytReg);
        if (ytMatch && ytMatch[1]) {
            return {
                type: 'iframe',
                embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&controls=1&playsinline=1`
            };
        }

        // 2. Google Drive Video
        const driveReg = /drive\.google\.com\/file\/d\/([^\/\?]+)/;
        const driveMatch = url.match(driveReg);
        if (driveMatch && driveMatch[1]) {
            return {
                type: 'iframe',
                embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`
            };
        }

        // 3. Vimeo
        const vimeoReg = /vimeo\.com\/(?:.*\/)?([0-9]+)/;
        const vimeoMatch = url.match(vimeoReg);
        if (vimeoMatch && vimeoMatch[1]) {
            return {
                type: 'iframe',
                embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&title=0&byline=0&portrait=0`
            };
        }

        // 4. Internet Archive (archive.org)
        const archiveReg = /archive\.org\/(?:details|embed)\/([^\/\?]+)/;
        const archiveMatch = url.match(archiveReg);
        if (archiveMatch && archiveMatch[1]) {
            return {
                type: 'iframe',
                embedUrl: `https://archive.org/embed/${archiveMatch[1]}`
            };
        }

        // 5. Direct Video File (.mp4, .webm, etc.)
        return {
            type: 'video',
            embedUrl: url
        };
    },

    parseImageUrl(url) {
        if (!url) return '';
        const driveReg = /drive\.google\.com\/file\/d\/([^\/\?]+)/;
        const driveMatch = url.match(driveReg);
        if (driveMatch && driveMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        }
        return url;
    },

    injectMediaPlayerModal() {
        if (document.getElementById('unified-media-modal')) return;
        
        const modalHtml = `
            <div id="unified-media-modal" class="video-modal">
                <div class="modal-backdrop"></div>
                <button class="modal-close" style="position: absolute; top: 30px; right: 40px; z-index: 10001; background: none; border: none; color: #fff; font-size: 2rem; cursor: pointer; transition: color 0.3s;"><i class="fa-solid fa-xmark"></i></button>
                <div class="modal-content" id="media-player-content" style="padding: 0; background: transparent; border: none; box-shadow: none;">
                    <div class="video-container" id="media-container" style="width: 100%; height: 100%; border-radius: 16px; overflow: hidden; background: #000; box-shadow: 0 10px 50px rgba(0,0,0,0.8);">
                        <!-- Media gets injected here (img or video or iframe) -->
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById('unified-media-modal');
        const container = document.getElementById('media-container');
        const contentBox = document.getElementById('media-player-content');
        
        const closeModal = () => {
            modal.classList.remove('active');
            container.innerHTML = ''; // Destroy media element to stop playback
            // Reset styles
            contentBox.style.width = '90vw';
            contentBox.style.height = '90vh';
            contentBox.style.aspectRatio = 'auto';
        };
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
        
        // Event delegation for all media clicks across the site
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.ad-item')) return; // Allow normal ad sponsor link click
            const videoTrigger = e.target.closest('.video-item') || e.target.closest('.portfolio-card');
            const imageTrigger = e.target.closest('.image-item');
            
            if (videoTrigger) {
                const rawSrc = videoTrigger.getAttribute('data-video');
                const ratio = videoTrigger.getAttribute('data-ratio') || '16:9';
                if (!rawSrc) return;
                e.preventDefault();
                
                // Adjust Aspect Ratio dynamically
                if (ratio === '9:16') {
                    contentBox.style.aspectRatio = '9 / 16';
                    contentBox.style.height = '90vh';
                    contentBox.style.width = 'auto';
                } else {
                    contentBox.style.aspectRatio = '16 / 9';
                    contentBox.style.width = '90vw';
                    contentBox.style.maxWidth = '1400px';
                    contentBox.style.height = 'auto';
                }
                
                const media = this.parseMediaUrl(rawSrc);

                if (media.type === 'iframe') {
                    container.innerHTML = `
                        <iframe src="${media.embedUrl}" style="width:100%; height:100%; border:none; background:#000;" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
                    `;
                    modal.classList.add('active');
                } else {
                    container.innerHTML = `
                        <div id="video-error-msg" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#fff; font-family:'Space Mono', monospace; text-align:center; width: 100%; z-index: 10;">
                            <i class="fa-solid fa-video-slash" style="font-size:3rem; color:#ff003c; margin-bottom:15px;"></i><br>
                            <span style="letter-spacing:2px; font-weight:bold; font-size:1.1rem; text-transform:uppercase;">Video is unavailable</span>
                        </div>
                        <video playsinline id="active-video-player" class="injected-media">
                            <source src="${media.embedUrl}" type="video/mp4">
                        </video>
                        <div class="custom-video-controls">
                            <button class="control-btn control-play"><i class="fa-solid fa-play"></i></button>
                            <div class="control-time">0:00 / 0:00</div>
                            <div class="control-progress-container">
                                <div class="control-progress"></div>
                            </div>
                            <button class="control-btn control-volume"><i class="fa-solid fa-volume-high"></i></button>
                            <button class="control-btn control-fullscreen"><i class="fa-solid fa-expand"></i></button>
                        </div>
                    `;
                    
                    modal.classList.add('active');
                    
                    // Bind custom controls for MP4
                    const video = document.getElementById('active-video-player');
                    const playBtn = container.querySelector('.control-play i');
                    const volBtn = container.querySelector('.control-volume i');
                    const fsBtn = container.querySelector('.control-fullscreen i');
                    const progBg = container.querySelector('.control-progress-container');
                    const progBar = container.querySelector('.control-progress');
                    const timeDisp = container.querySelector('.control-time');
                    
                    const formatTime = (s) => {
                        if (isNaN(s)) return '0:00';
                        const min = Math.floor(s/60);
                        const sec = Math.floor(s%60);
                        return min + ':' + (sec<10 ? '0':'') + sec;
                    };
                    
                    video.play().then(() => {
                        playBtn.classList.replace('fa-play', 'fa-pause');
                    }).catch(err => console.warn(err));
                    
                    const handleError = () => {
                        const errorMsg = document.getElementById('video-error-msg');
                        if (errorMsg) errorMsg.style.display = 'block';
                        video.style.display = 'none';
                        const controls = container.querySelector('.custom-video-controls');
                        if (controls) controls.style.display = 'none';
                    };
                    
                    video.addEventListener('error', handleError, true);
                    video.querySelector('source').addEventListener('error', handleError);
                    
                    container.querySelector('.control-play').addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        if (video.paused) { video.play(); playBtn.classList.replace('fa-play', 'fa-pause'); }
                        else { video.pause(); playBtn.classList.replace('fa-pause', 'fa-play'); }
                    });
                    
                    container.querySelector('.control-volume').addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        video.muted = !video.muted;
                        volBtn.classList.replace(video.muted ? 'fa-volume-high' : 'fa-volume-xmark', video.muted ? 'fa-volume-xmark' : 'fa-volume-high');
                    });
                    
                    container.querySelector('.control-fullscreen').addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        if (video.requestFullscreen) video.requestFullscreen();
                        else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
                    });
                    
                    progBg.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        const rect = progBg.getBoundingClientRect();
                        video.currentTime = ((ev.clientX - rect.left) / rect.width) * video.duration;
                    });
                    
                    video.addEventListener('timeupdate', () => {
                        progBar.style.width = `${(video.currentTime / video.duration) * 100}%`;
                        timeDisp.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
                    });
                    video.addEventListener('loadedmetadata', () => {
                        timeDisp.textContent = `0:00 / ${formatTime(video.duration)}`;
                    });
                }
                
            } else if (imageTrigger) {
                const rawSrc = imageTrigger.getAttribute('data-img');
                if (!rawSrc) return;
                e.preventDefault();
                
                const imgSrc = this.parseImageUrl(rawSrc);
                contentBox.style.aspectRatio = 'auto';
                contentBox.style.width = 'auto';
                contentBox.style.maxWidth = '90vw';
                contentBox.style.height = 'auto';
                contentBox.style.maxHeight = '90vh';
                
                container.innerHTML = `
                    <img src="${imgSrc}" class="injected-media" style="width: 100%; height: 100%; object-fit: contain; border-radius: 16px;">
                `;
                
                modal.classList.add('active');
            }
        });
    },
    
    initContactForm() {
        const interceptSubmit = (e) => {
            const form = e.target.closest ? e.target.closest('.onboarding-form') : null;
            if (form || e.target.classList.contains('onboarding-form')) {
                e.preventDefault();
                e.stopPropagation();
                if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                this.handleOnboardingSubmit(form || e.target);
                return false;
            }
        };

        // Capture event at window/document level to eliminate any native form submission or Netlify redirect
        window.addEventListener('submit', interceptSubmit, true);
        document.addEventListener('submit', interceptSubmit, true);
    },

    handleOnboardingSubmit(form) {
        if (!form) return;

        // Collect form data
        const formData = new FormData(form);
        const data = {};
        formData.forEach((val, key) => { data[key] = val; });

        // Basic validation
        if (!data.name || !data.email) {
            alert("Please fill in required fields (Name and Email).");
            return;
        }

        // Netlify Forms requires form-name
        data['form-name'] = form.getAttribute('name') || 'onboarding';

        // URL encode the payload for Netlify
        const urlEncodedBody = Object.keys(data)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k]))
            .join('&');

        // 1. Submit to Netlify Forms via AJAX URL-encoded POST to root '/'
        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlEncodedBody
        })
        .then(res => console.log('Netlify Form submission success:', res.status))
        .catch(err => console.error('Netlify Form submission error:', err));

        // 2. Also submit to current path if not root as fallback
        const currPath = window.location.pathname;
        if (currPath && currPath !== '/') {
            fetch(currPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: urlEncodedBody
            }).catch(err => {});
        }

        // 3. Store submission in localStorage for CMS reference
        let submissions = [];
        try {
            const saved = localStorage.getItem('cms_submissions');
            if (saved) submissions = JSON.parse(saved);
        } catch(err) {}
        
        data.submittedAt = new Date().toISOString();
        submissions.unshift(data);
        localStorage.setItem('cms_submissions', JSON.stringify(submissions));

        // 4. Send to backend API if available
        fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(err => {});

        // 5. Show confirmation modal
        this.showSuccessModal(data);

        // Reset form
        form.reset();

        // Reset custom selects UI
        document.querySelectorAll('.custom-select-trigger').forEach(trig => {
            const group = trig.closest('.form-group');
            if (group) {
                const isClass = group.querySelector('[name="project_classification"]');
                const isBudg = group.querySelector('[name="allocated_budget"]');
                if (isClass) trig.textContent = "Select Classification...";
                if (isBudg) trig.textContent = "Select Budget...";
                trig.style.color = "#555555";
            }
        });
    },

    showSuccessModal(data) {
        let modal = document.getElementById('form-success-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'form-success-modal';
            modal.innerHTML = `
                <div class="success-backdrop"></div>
                <div class="success-content">
                    <div class="animated-tick-btn" id="animated-tick-btn" title="Click checkmark to close">
                        <svg class="checkmark-svg" viewBox="0 0 52 52">
                            <circle class="checkmark-circle" cx="26" cy="26" r="23" fill="none"/>
                            <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                        </svg>
                    </div>
                    <h2>TRANSMISSION RECEIVED</h2>
                    <p>Thank you <strong><span id="success-user-name"></span></strong>. Your project request has been transmitted and logged successfully.</p>
                    <div class="success-details">
                        <div><span>ESTIMATED RESPONSE:</span> Within 2 Hours</div>
                        <div><span>EMAIL NOTIFIED:</span> <span id="success-user-email"></span></div>
                    </div>
                    <button class="btn-success-close">ACKNOWLEDGE & CLOSE</button>
                </div>
                <style>
                    #form-success-modal { 
                        position: fixed; 
                        top: 0; 
                        left: 0; 
                        width: 100%; 
                        height: 100%; 
                        z-index: 100000; 
                        display: none; 
                        align-items: center; 
                        justify-content: center; 
                        opacity: 0; 
                        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
                    }
                    #form-success-modal.active { 
                        display: flex; 
                        opacity: 1; 
                    }
                    .success-backdrop { 
                        position: absolute; 
                        top: 0; 
                        left: 0; 
                        width: 100%; 
                        height: 100%; 
                        background: rgba(5, 5, 8, 0.75); 
                        backdrop-filter: blur(16px); 
                        -webkit-backdrop-filter: blur(16px);
                    }
                    .success-content { 
                        position: relative; 
                        background: rgba(12, 12, 16, 0.7); 
                        backdrop-filter: blur(25px);
                        -webkit-backdrop-filter: blur(25px);
                        border: 1px solid rgba(255, 0, 60, 0.35); 
                        width: 90%; 
                        max-width: 480px; 
                        padding: 45px 35px; 
                        border-radius: 24px; 
                        text-align: center; 
                        z-index: 100001; 
                        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.8), 0 0 50px rgba(255, 0, 60, 0.25);
                        transform: scale(0.92);
                        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    #form-success-modal.active .success-content {
                        transform: scale(1);
                    }
                    .animated-tick-btn {
                        position: relative;
                        width: 76px;
                        height: 76px;
                        margin: 0 auto 24px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    .animated-tick-btn:hover {
                        transform: scale(1.12);
                    }
                    .checkmark-svg {
                        width: 76px;
                        height: 76px;
                        border-radius: 50%;
                        display: block;
                        stroke-width: 3;
                        stroke: #ff003c;
                        stroke-miterlimit: 10;
                    }
                    .checkmark-circle {
                        stroke-dasharray: 166;
                        stroke-dashoffset: 166;
                        stroke-width: 2.5;
                        stroke-miterlimit: 10;
                        stroke: #ff003c;
                        fill: rgba(255, 0, 60, 0.08);
                        animation: strokeAnim 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                    }
                    .checkmark-check {
                        transform-origin: 50% 50%;
                        stroke-dasharray: 48;
                        stroke-dashoffset: 48;
                        stroke: #ffffff;
                        stroke-width: 3.5;
                        animation: strokeAnim 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.5s forwards;
                    }
                    @keyframes strokeAnim {
                        100% { stroke-dashoffset: 0; }
                    }
                    .success-content h2 { 
                        color: #fff; 
                        font-family: 'Space Mono', monospace; 
                        font-size: 1.4rem; 
                        letter-spacing: 1px; 
                        margin-bottom: 12px; 
                    }
                    .success-content p { 
                        color: #bbb; 
                        font-size: 0.95rem; 
                        line-height: 1.6; 
                        margin-bottom: 25px; 
                    }
                    .success-content p strong { color: #fff; }
                    .success-details { 
                        background: rgba(20, 20, 25, 0.6); 
                        border: 1px solid rgba(255, 255, 255, 0.08); 
                        border-radius: 12px; 
                        padding: 16px; 
                        text-align: left; 
                        font-family: 'Space Mono', monospace; 
                        font-size: 0.8rem; 
                        color: #888; 
                        margin-bottom: 25px; 
                    }
                    .success-details div { margin-bottom: 6px; }
                    .success-details div:last-child { margin-bottom: 0; }
                    .success-details span { color: #ff003c; font-weight: bold; }
                    .btn-success-close { 
                        background: #ff003c; 
                        color: #fff; 
                        border: none; 
                        padding: 14px 28px; 
                        font-weight: 700; 
                        font-family: 'Space Mono', monospace; 
                        border-radius: 10px; 
                        cursor: pointer; 
                        transition: all 0.2s ease; 
                        width: 100%; 
                        letter-spacing: 1px; 
                    }
                    .btn-success-close:hover { 
                        background: #e00035; 
                        transform: translateY(-2px); 
                        box-shadow: 0 8px 25px rgba(255,0,60,0.45); 
                    }
                </style>
            `;
            document.body.appendChild(modal);

            const closeBtn = modal.querySelector('.btn-success-close');
            const tickBtn = modal.querySelector('#animated-tick-btn');
            const backdrop = modal.querySelector('.success-backdrop');
            const closeModal = () => {
                modal.classList.remove('active');
                setTimeout(() => { modal.style.display = 'none'; }, 400);
            };
            closeBtn.addEventListener('click', closeModal);
            tickBtn.addEventListener('click', closeModal);
            backdrop.addEventListener('click', closeModal);
        }

        document.getElementById('success-user-name').textContent = data.name || 'Client';
        document.getElementById('success-user-email').textContent = data.email || '';
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active'));
    },
    
    openLegalModal(index) {
        let modal = document.getElementById('global-legal-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'global-legal-modal';
            modal.innerHTML = `
                <div class="legal-modal-backdrop"></div>
                <div class="legal-modal-content">
                    <div class="legal-modal-header">
                        <h2 id="legal-modal-title"></h2>
                        <button class="legal-modal-close"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="legal-modal-body" id="legal-modal-body"></div>
                </div>
                <style>
                    #global-legal-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; display: none; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; }
                    #global-legal-modal.active { display: flex; opacity: 1; }
                    .legal-modal-backdrop { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); }
                    .legal-modal-content { position: relative; background: #0a0a0a; border: 1px solid #333; width: 90%; max-width: 700px; max-height: 80vh; border-radius: 12px; display: flex; flex-direction: column; z-index: 10001; }
                    .legal-modal-header { padding: 25px 30px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; }
                    .legal-modal-header h2 { margin: 0; font-size: 1.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px; }
                    .legal-modal-close { background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer; transition: color 0.2s; }
                    .legal-modal-close:hover { color: #ff003c; }
                    .legal-modal-body { padding: 30px; overflow-y: auto; color: #bbb; line-height: 1.7; font-size: 0.95rem; }
                    .legal-modal-body h1, .legal-modal-body h2, .legal-modal-body h3 { color: #fff; margin-bottom: 15px; margin-top: 25px; }
                    .legal-modal-body h1:first-child, .legal-modal-body h2:first-child { margin-top: 0; }
                    .legal-modal-body p { margin-bottom: 15px; }
                </style>
            `;
            document.body.appendChild(modal);
            
            modal.querySelector('.legal-modal-backdrop').addEventListener('click', () => this.closeLegalModal());
            modal.querySelector('.legal-modal-close').addEventListener('click', () => this.closeLegalModal());
        }
        
        const legalData = this.siteData.global.footer.legal[index];
        if (legalData) {
            document.getElementById('legal-modal-title').textContent = legalData.label;
            document.getElementById('legal-modal-body').innerHTML = legalData.content.replace(/\n/g, '<br>');
            modal.style.display = 'flex'; // Reset display from close timeout
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },
    
    closeLegalModal() {
        const modal = document.getElementById('global-legal-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => { modal.style.display = 'none'; }, 300);
        }
    },
    
    injectTawkto() {
        if (!this.siteData.global.integrations || !this.siteData.global.integrations.tawkto || !this.siteData.global.integrations.tawkto.enabled) {
            return;
        }
        
        const propertyId = this.siteData.global.integrations.tawkto.propertyId;
        const widgetId = this.siteData.global.integrations.tawkto.widgetId || 'default';
        
        if (!propertyId) return;
        
        var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
        var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
        s1.async = true;
        s1.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        s0.parentNode.insertBefore(s1, s0);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    CMS.init();
});
