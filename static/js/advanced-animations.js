// EXTRAORDINARY ADVANCED ANIMATIONS

// Custom Cursor
class CustomCursor {
    constructor() {
        this.cursor = document.createElement('div');
        this.cursor.className = 'custom-cursor';
        this.cursorDot = document.createElement('div');
        this.cursorDot.className = 'cursor-dot';
        document.body.appendChild(this.cursor);
        document.body.appendChild(this.cursorDot);

        this.mouseX = 0;
        this.mouseY = 0;
        this.cursorX = 0;
        this.cursorY = 0;
        this.dotX = 0;
        this.dotY = 0;

        this.init();
    }

    init() {
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Smooth cursor follow
        const animate = () => {
            // Outer cursor (slower)
            this.cursorX += (this.mouseX - this.cursorX) * 0.1;
            this.cursorY += (this.mouseY - this.cursorY) * 0.1;

            // Inner dot (faster)
            this.dotX += (this.mouseX - this.dotX) * 0.3;
            this.dotY += (this.mouseY - this.dotY) * 0.3;

            this.cursor.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px)`;
            this.cursorDot.style.transform = `translate(${this.dotX}px, ${this.dotY}px)`;

            requestAnimationFrame(animate);
        };
        animate();

        // Cursor interactions
        document.querySelectorAll('a, button, .feature-card').forEach(el => {
            el.addEventListener('mouseenter', () => {
                this.cursor.style.transform += ' scale(2)';
                this.cursor.style.borderColor = '#FF4D30';
            });
            el.addEventListener('mouseleave', () => {
                this.cursor.style.transform = this.cursor.style.transform.replace(' scale(2)', '');
                this.cursor.style.borderColor = 'rgba(255, 77, 48, 0.5)';
            });
        });
    }
}

// Text Splitting Animation
class TextSplitter {
    constructor(element) {
        this.element = element;
        this.text = element.textContent;
        this.split();
    }

    split() {
        this.element.innerHTML = '';
        const words = this.text.split(' ');

        words.forEach((word, wordIndex) => {
            const wordSpan = document.createElement('span');
            wordSpan.style.display = 'inline-block';
            wordSpan.style.overflow = 'hidden';

            word.split('').forEach((char, charIndex) => {
                const charSpan = document.createElement('span');
                charSpan.textContent = char === ' ' ? '\u00A0' : char;
                charSpan.style.display = 'inline-block';
                charSpan.style.transform = 'translateY(100%)';
                charSpan.style.transition = `transform 0.6s cubic-bezier(0.76, 0, 0.24, 1) ${(wordIndex * 0.1 + charIndex * 0.03)}s`;
                wordSpan.appendChild(charSpan);
            });

            this.element.appendChild(wordSpan);
            if (wordIndex < words.length - 1) {
                this.element.appendChild(document.createTextNode(' '));
            }
        });
    }

    reveal() {
        const chars = this.element.querySelectorAll('span span');
        chars.forEach(char => {
            char.style.transform = 'translateY(0)';
        });
    }
}

// Particle System
class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 50;
        this.mouse = { x: 0, y: 0 };

        this.resize();
        this.init();
        this.animate();

        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                radius: Math.random() * 3 + 1,
                color: `rgba(255, 77, 48, ${Math.random() * 0.5 + 0.2})`
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(particle => {
            // Mouse interaction
            const dx = this.mouse.x - particle.x;
            const dy = this.mouse.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
                const force = (150 - distance) / 150;
                particle.vx -= (dx / distance) * force * 0.5;
                particle.vy -= (dy / distance) * force * 0.5;
            }

            particle.x += particle.vx;
            particle.y += particle.vy;

            // Bounce off edges
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -0.9;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -0.9;

            // Friction
            particle.vx *= 0.99;
            particle.vy *= 0.99;

            // Draw
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = particle.color;
            this.ctx.fill();
        });

        requestAnimationFrame(() => this.animate());
    }
}

// Advanced Scroll Animations
class ScrollAnimations {
    constructor() {
        this.sections = document.querySelectorAll('section');
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => this.onScroll(), { passive: true });
        this.onScroll();
    }

    onScroll() {
        const scrollY = window.pageYOffset;
        const windowHeight = window.innerHeight;

        // Parallax hero
        const hero = document.querySelector('.hero');
        if (hero) {
            const heroContent = hero.querySelector('.hero-content');
            const bgText = hero.querySelector('div[style*="XSCOUT"]');

            if (heroContent) {
                heroContent.style.transform = `translateY(${scrollY * 0.4}px)`;
                heroContent.style.opacity = Math.max(0, 1 - scrollY / 500);
            }

            if (bgText) {
                const scale = 1 + scrollY * 0.001;
                const rotate = scrollY * 0.05;
                bgText.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`;
                bgText.style.opacity = Math.max(0, 0.1 - scrollY / 1000);
            }
        }

        // Feature cards stagger
        document.querySelectorAll('.feature-card').forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            const progress = 1 - (rect.top / windowHeight);

            if (progress > 0 && progress < 1.5) {
                const delay = index * 0.1;
                const adjustedProgress = Math.max(0, Math.min(1, progress - delay));

                card.style.opacity = adjustedProgress;
                card.style.transform = `translateY(${(1 - adjustedProgress) * 100}px) scale(${0.8 + adjustedProgress * 0.2})`;
            }
        });
    }
}

// Morphing Blob Background
class MorphingBlob {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.time = 0;

        this.resize();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 200;

        this.ctx.beginPath();

        for (let i = 0; i <= 360; i += 10) {
            const angle = (i * Math.PI) / 180;
            const offset = Math.sin(this.time + i * 0.1) * 50;
            const x = centerX + Math.cos(angle) * (radius + offset);
            const y = centerY + Math.sin(angle) * (radius + offset);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.closePath();

        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + 50);
        gradient.addColorStop(0, 'rgba(255, 77, 48, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 77, 48, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        this.time += 0.02;
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    // Custom cursor
    new CustomCursor();

    // Particle system
    const particleCanvas = document.createElement('canvas');
    particleCanvas.style.position = 'fixed';
    particleCanvas.style.top = '0';
    particleCanvas.style.left = '0';
    particleCanvas.style.width = '100%';
    particleCanvas.style.height = '100%';
    particleCanvas.style.pointerEvents = 'none';
    particleCanvas.style.zIndex = '1';
    document.body.insertBefore(particleCanvas, document.body.firstChild);
    new ParticleSystem(particleCanvas);

    // Text splitting
    document.querySelectorAll('.hero h2').forEach(el => {
        const splitter = new TextSplitter(el);
        setTimeout(() => splitter.reveal(), 500);
    });

    // Scroll animations
    new ScrollAnimations();
});
