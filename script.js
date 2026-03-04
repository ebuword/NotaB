// ===== Scroll Reveal =====
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -60px 0px',
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            // Stagger children
            const siblings = entry.target.parentElement.querySelectorAll('[data-animate]');
            let delay = 0;
            siblings.forEach((sib) => {
                if (sib === entry.target) {
                    entry.target.style.transitionDelay = `${delay}ms`;
                }
                delay += 80;
            });

            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('[data-animate]').forEach((el) => {
    observer.observe(el);
});

// ===== Nav Scroll =====
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ===== Hero Mockup Typing Effect =====
const typingEl = document.getElementById('mockupTyping');
const resultEl = document.getElementById('mockupResult');

const scenes = [
    {
        text: 'Okan Şenol',
        icon: 'assets/okan.png',
        iconClass: 'wiki',
        value: 'Okan Şenol',
        valueSuffix: '',
        label: "Osmanlının çöküşünden sonra ortaya çıkan gizemli ad...",
        iconBg: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
    },
    {
        text: '10d',
        icon: '$',
        iconClass: '',
        value: '439,70',
        valueSuffix: '₺',
        label: '10,00 $ ABD Doları → Türk Lirası',
        iconBg: 'linear-gradient(135deg, #6c8cff, #4c6ef5)',
    },
    {
        text: '2 + 2',
        icon: '=',
        iconClass: 'math',
        value: '4',
        valueSuffix: '',
        label: '2 + 2 =',
        iconBg: 'linear-gradient(135deg, #4ade80, #22c55e)',
    },
    {
        text: '25e',
        icon: '€',
        iconClass: '',
        value: '1.285,88',
        valueSuffix: '₺',
        label: '25,00 € Euro → Türk Lirası',
        iconBg: 'linear-gradient(135deg, #6c8cff, #4c6ef5)',
    },
    {
        text: 'sqrt(144)',
        icon: '=',
        iconClass: 'math',
        value: '12',
        valueSuffix: '',
        label: 'sqrt(144) =',
        iconBg: 'linear-gradient(135deg, #4ade80, #22c55e)',
    },
    {
        text: 'w: İstanbul',
        icon: 'W',
        iconClass: 'wiki',
        value: 'İstanbul',
        valueSuffix: '',
        label: "Tİstanbul, Türkiye'nin ekonomik, kültürel ve tarihî merkezini oluşturan en...",
        iconBg: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
    },
    {
        text: 'developed by ebuword',
        icon: 'assets/ebu.png',
        iconClass: '',
        value: '@ebuword',
        valueSuffix: '',
        label: 'Developed with ❤️ | Powered by Gemini 3.1 Pro',
        iconBg: 'linear-gradient(135deg, #ff6b6b, #f06595)',
    },
];

let currentScene = 0;

async function playScene(scene) {
    // Clear
    typingEl.textContent = '';
    resultEl.classList.remove('show');

    await sleep(400);

    // Type
    for (let i = 0; i < scene.text.length; i++) {
        typingEl.textContent += scene.text[i];
        await sleep(70 + Math.random() * 40);
    }

    await sleep(600);

    // Show result
    const iconEl = resultEl.querySelector('.mockup-result-icon');
    const valueEl = resultEl.querySelector('.mockup-result-value');
    const labelEl = resultEl.querySelector('.mockup-result-label');

    if (scene.icon.includes('.png') || scene.icon.includes('.jpg') || scene.icon.includes('.svg')) {
        iconEl.textContent = '';
        iconEl.style.backgroundImage = `url(${scene.icon})`;
        iconEl.style.backgroundSize = '80%';
        iconEl.style.backgroundPosition = 'center';
        iconEl.style.backgroundRepeat = 'no-repeat';
    } else {
        iconEl.textContent = scene.icon;
        iconEl.style.backgroundImage = 'none';
        iconEl.style.background = scene.iconBg;
    }
    valueEl.innerHTML = `${scene.value} ${scene.valueSuffix ? `<span>${scene.valueSuffix}</span>` : ''}`;
    labelEl.textContent = scene.label;

    resultEl.classList.add('show');

    await sleep(2800);
}

async function runTypingLoop() {
    while (true) {
        await playScene(scenes[currentScene]);
        currentScene = (currentScene + 1) % scenes.length;
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start after a short delay
setTimeout(() => {
    runTypingLoop();
}, 800);

// ===== Demo Slideshow =====
const demoSlides = document.querySelectorAll('.demo-slide');
const demoDots = document.querySelectorAll('.demo-dot');
const progressBar = document.querySelector('.demo-progress-bar');
let currentSlide = 0;
let slideshowInterval = null;
let isPaused = false;

function goToSlide(index) {
    demoSlides.forEach((s) => s.classList.remove('active'));
    demoDots.forEach((d) => d.classList.remove('active'));

    currentSlide = index;
    demoSlides[currentSlide].classList.add('active');
    demoDots[currentSlide].classList.add('active');

    // Reset progress bar
    if (progressBar) {
        progressBar.classList.remove('filling');
        // Force reflow to restart animation
        void progressBar.offsetWidth;
        progressBar.classList.add('filling');
    }
}

function nextSlide() {
    goToSlide((currentSlide + 1) % demoSlides.length);
}

function startSlideshow() {
    if (slideshowInterval) clearInterval(slideshowInterval);
    goToSlide(0);
    slideshowInterval = setInterval(() => {
        if (!isPaused) nextSlide();
    }, 3500);
}

// Click dots to navigate
demoDots.forEach((dot) => {
    dot.addEventListener('click', () => {
        const index = parseInt(dot.getAttribute('data-index'));
        goToSlide(index);
        // Restart timer
        if (slideshowInterval) clearInterval(slideshowInterval);
        slideshowInterval = setInterval(() => {
            if (!isPaused) nextSlide();
        }, 3500);
    });
});

// Pause on hover
const demoPlayer = document.querySelector('.demo-player');
if (demoPlayer) {
    demoPlayer.addEventListener('mouseenter', () => { isPaused = true; });
    demoPlayer.addEventListener('mouseleave', () => { isPaused = false; });
}

// Start when visible
const demoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            startSlideshow();
            demoObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

if (document.getElementById('demoSlideshow')) {
    demoObserver.observe(document.getElementById('demoSlideshow'));
}

// ===== Smooth scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ===== CTA Particle Animation =====
const ctaCanvas = document.getElementById('ctaParticles');
if (ctaCanvas) {
    const ctx = ctaCanvas.getContext('2d');
    let particles = [];
    let animFrameId;

    function resizeCanvas() {
        const card = ctaCanvas.parentElement;
        ctaCanvas.width = card.offsetWidth;
        ctaCanvas.height = card.offsetHeight;
    }

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * ctaCanvas.width;
            this.y = Math.random() * ctaCanvas.height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 2 + 0.5;
            this.opacity = Math.random() * 0.4 + 0.1;
            // Random color: accent blue, purple, or green
            const colors = [
                [108, 140, 255],
                [167, 139, 250],
                [74, 222, 128],
            ];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > ctaCanvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > ctaCanvas.height) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${this.opacity})`;
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        const count = Math.min(50, Math.floor((ctaCanvas.width * ctaCanvas.height) / 8000));
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    const opacity = (1 - dist / 120) * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(108, 140, 255, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, ctaCanvas.width, ctaCanvas.height);
        particles.forEach((p) => {
            p.update();
            p.draw();
        });
        drawLines();
        animFrameId = requestAnimationFrame(animateParticles);
    }

    // Start particles when CTA is visible
    const ctaObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                resizeCanvas();
                initParticles();
                animateParticles();
                ctaObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    ctaObserver.observe(ctaCanvas.parentElement);
    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    });
}

// ===== Feature Card Tilt Effect =====
document.querySelectorAll('.feature-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
});

// ===== Hero Parallax on Scroll + Mouse =====
const heroOrbs = document.querySelectorAll('.hero-orb');

// Scroll parallax
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight) {
        heroOrbs.forEach((orb, i) => {
            const speed = 0.1 + i * 0.05;
            orb.style.transform = `translateY(${scrollY * speed}px)`;
        });
    }
}, { passive: true });

// Mouse-follow parallax on hero orbs
const heroSection = document.querySelector('.hero');
if (heroSection) {
    heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
        const mouseY = (e.clientY - rect.top) / rect.height - 0.5;

        heroOrbs.forEach((orb, i) => {
            const intensity = 20 + i * 15;
            const x = mouseX * intensity;
            const y = mouseY * intensity;
            orb.style.transform = `translate(${x}px, ${y}px)`;
        });
    }, { passive: true });
}

// ===== Magnetic Button Effect =====
document.querySelectorAll('.btn-primary, .btn-glow').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) scale(1.02)`;
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
    });
});

// ===== Feature Mockup Typing Animations =====
const featureMockups = [
    {
        id: 'featureMockupCurrency',
        text: '10d',
    },
    {
        id: 'featureMockupMath',
        text: 'sqrt(144)',
    },
    {
        id: 'featureMockupWiki',
        text: 'w: İstanbul',
    },
    {
        id: 'featureMockupGeneral',
        text: 'javascript',
    },
];

async function playFeatureMockup(config) {
    const el = document.getElementById(config.id);
    if (!el) return;

    const typingEl = el.querySelector('.fm-typing');
    const resultEl = el.querySelector('.fm-result');
    if (!typingEl || !resultEl) return;

    while (true) {
        // Clear
        typingEl.textContent = '';
        resultEl.classList.remove('show');
        await sleep(600);

        // Type
        for (let i = 0; i < config.text.length; i++) {
            typingEl.textContent += config.text[i];
            await sleep(80 + Math.random() * 30);
        }

        await sleep(500);

        // Show result
        resultEl.classList.add('show');

        await sleep(3000);
    }
}

// Start feature mockup animations when they become visible
const featureMockupObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const id = entry.target.id;
            const config = featureMockups.find(m => m.id === id);
            if (config) {
                playFeatureMockup(config);
            }
            featureMockupObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

featureMockups.forEach((config) => {
    const el = document.getElementById(config.id);
    if (el) {
        featureMockupObserver.observe(el);
    }
});
