// Content injection from content.js
function getByPath(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : o), obj);
}

function injectContent() {
    // Simple data-content elements
    document.querySelectorAll('[data-content]').forEach(el => {
        const path = el.getAttribute('data-content');
        const value = getByPath(CONTENT, path);
        if (value != null && typeof value === 'string') {
            el.textContent = value;
        }
    });

    // About paragraphs
    const aboutParagraphs = document.getElementById('about-paragraphs');
    if (aboutParagraphs && CONTENT.about?.paragraphs) {
        aboutParagraphs.innerHTML = CONTENT.about.paragraphs.map(p => `<p>${p}</p>`).join('');
    }

    // Projects grid
    const projectsGrid = document.getElementById('projects-grid');
    if (projectsGrid && CONTENT.projects?.items) {
        projectsGrid.innerHTML = CONTENT.projects.items.map(item =>
            `<div class="project-card">
                <div class="project-icon">${item.icon}</div>
                <h3 class="project-title">${item.title}</h3>
                <p class="project-description">${item.description}</p>
            </div>`
        ).join('');
    }

    // Contact links
    const contactLinks = document.getElementById('contact-links');
    if (contactLinks && CONTENT.contact?.links) {
        contactLinks.innerHTML = CONTENT.contact.links.map(link =>
            `<a href="${link.href}" class="contact-link">
                <span class="contact-icon">${link.icon}</span>
                <span>${link.label}</span>
            </a>`
        ).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    injectContent();
    initObservers();
});

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

