// Content injection from content.js
function renderAsset(key) {
    var assets = window.ASSETS;
    if (!assets || !key) return '';
    var value = assets[key];
    if (!value) return key;
    // If it looks like an image path, render as img
    if (/\.(svg|png|jpg|jpeg|gif|webp)(\?|$)/i.test(value)) {
        return '<img src="' + encodeURI(value) + '" alt="" class="asset-icon">';
    }
    return value;
}

function getByPath(obj, path) {
    return path.split('.').reduce(function(o, k) {
        return (o && o[k] !== undefined ? o[k] : o);
    }, obj);
}

function injectContent() {
    var content = window.CONTENT;
    if (!content) return;

    // Simple data-content elements
    document.querySelectorAll('[data-content]').forEach(function(el) {
        var path = el.getAttribute('data-content');
        var value = getByPath(content, path);
        if (value != null && typeof value === 'string') {
            el.textContent = value;
        }
    });

    // About paragraphs
    var aboutParagraphs = document.getElementById('about-paragraphs');
    if (aboutParagraphs && content.about && content.about.paragraphs) {
        aboutParagraphs.innerHTML = content.about.paragraphs.map(function(p) { return '<p>' + p + '</p>'; }).join('');
    }

    // Projects grid
    var projectsGrid = document.getElementById('projects-grid');
    if (projectsGrid && content.projects && content.projects.items) {
        projectsGrid.innerHTML = content.projects.items.map(function(item, index) {
            var iconHtml = renderAsset(item.icon);
            var hasDetails = item.details && item.details.length > 0;
            var clickableClass = hasDetails ? ' project-card-expandable' : '';
            return '<div class="project-card' + clickableClass + '" data-project-index="' + index + '">' +
                '<div class="project-icon">' + iconHtml + '</div>' +
                '<h3 class="project-title">' + item.title + '</h3>' +
                '<p class="project-description">' + item.description + '</p>' +
                (hasDetails ? '<span class="project-card-hint">Klikk for mer</span>' : '') +
                '</div>';
        }).join('');
        initExpandableCards(content.projects.items);
    }

    // Contact links
    var contactLinks = document.getElementById('contact-links');
    if (contactLinks && content.contact && content.contact.links) {
        contactLinks.innerHTML = content.contact.links.map(function(link) {
            var iconHtml = renderAsset(link.icon);
            var ext = link.href && (link.href.indexOf('http://') === 0 || link.href.indexOf('https://') === 0);
            var attrs = 'href="' + link.href + '" class="contact-link"';
            if (ext) attrs += ' target="_blank" rel="noopener noreferrer"';
            return '<a ' + attrs + '>' +
                '<span class="contact-icon">' + iconHtml + '</span>' +
                '<span>' + link.label + '</span>' +
                '</a>';
        }).join('');
    }
}

function initExpandableCards(items) {
    var overlay = document.getElementById('project-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'project-overlay';
        overlay.className = 'project-overlay';
        overlay.innerHTML = '<div class="project-overlay-backdrop"></div>' +
            '<div class="project-expanded-card">' +
            '<button class="project-expanded-close" aria-label="Lukk">&times;</button>' +
            '<div class="project-expanded-content"></div>' +
            '</div>';
        document.body.appendChild(overlay);
    }
    var contentEl = overlay.querySelector('.project-expanded-content');
    var cardEl = overlay.querySelector('.project-expanded-card');
    var backdrop = overlay.querySelector('.project-overlay-backdrop');

    function openCard(index) {
        var item = items[index];
        if (!item || !item.details) return;
        var iconHtml = renderAsset(item.icon);
        contentEl.innerHTML = '<div class="project-expanded-icon">' + iconHtml + '</div>' +
            '<h3 class="project-expanded-title">' + item.title + '</h3>' +
            '<p class="project-expanded-meta">' + item.description + '</p>' +
            '<div class="project-expanded-details">' + item.details + '</div>';
        overlay.classList.add('project-overlay-visible');
        cardEl.classList.add('project-expanded-card-visible');
        document.body.style.overflow = 'hidden';
    }

    function closeCard() {
        overlay.classList.remove('project-overlay-visible');
        cardEl.classList.remove('project-expanded-card-visible');
        document.body.style.overflow = '';
    }

    document.querySelectorAll('.project-card-expandable').forEach(function(card) {
        card.addEventListener('click', function() {
            var index = parseInt(card.getAttribute('data-project-index'), 10);
            openCard(index);
        });
    });

    if (backdrop) backdrop.addEventListener('click', closeCard);
    overlay.querySelector('.project-expanded-close').addEventListener('click', closeCard);
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('project-overlay-visible')) closeCard();
    });
}

function initPage() {
    injectContent();
    initObservers();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}

// Mobile Navigation Toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
});

// Close mobile menu when clicking on a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
    });
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar background on scroll
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
    } else {
        navbar.style.boxShadow = '0 1px 2px 0 rgb(0 0 0 / 0.05)';
    }
    
    lastScroll = currentScroll;
});

// Intersection Observer for fade-in animations
function initObservers() {
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

// Observe project cards
document.querySelectorAll('.project-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// Observe contact links
document.querySelectorAll('.contact-link').forEach(link => {
    link.style.opacity = '0';
    link.style.transform = 'translateY(20px)';
    link.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(link);
});
}

// Add active state to navigation links based on scroll position
const sections = document.querySelectorAll('section[id]');

function highlightNavigation() {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', highlightNavigation);

