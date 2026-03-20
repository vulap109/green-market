let isMenuOpen = false;
let isMobileHeaderMenuOpen = false;
let contactRingIntervalId = null;
let contactRingTimeoutId = null;
let contactRingRestartTimeoutId = null;

function updateMobileHeaderMenuState(nextState) {
    const menu = document.getElementById('mobile-header-menu');
    const toggle = document.getElementById('mobile-header-toggle');
    const openIcon = document.getElementById('mobile-header-open-icon');
    const closeIcon = document.getElementById('mobile-header-close-icon');

    if (!menu || !toggle || !openIcon || !closeIcon) {
        isMobileHeaderMenuOpen = false;
        return;
    }

    isMobileHeaderMenuOpen = nextState;
    menu.classList.toggle('hidden', !nextState);
    toggle.setAttribute('aria-expanded', String(nextState));
    openIcon.classList.toggle('hidden', nextState);
    closeIcon.classList.toggle('hidden', !nextState);
}

function closeMobileHeaderMenu() {
    updateMobileHeaderMenuState(false);
}

function toggleMobileHeaderMenu() {
    updateMobileHeaderMenuState(!isMobileHeaderMenuOpen);
}

function handleMobileHeaderPointerDown(event) {
    const menuWrap = document.getElementById('mobile-header-menu-wrap');

    if (!isMobileHeaderMenuOpen || !menuWrap || menuWrap.contains(event.target)) {
        return;
    }

    closeMobileHeaderMenu();
}

function handleMobileHeaderResize() {
    if (window.innerWidth >= 1024) {
        closeMobileHeaderMenu();
    }
}

function initMobileHeaderMenu() {
    closeMobileHeaderMenu();
    document.removeEventListener('click', handleMobileHeaderPointerDown);
    document.addEventListener('click', handleMobileHeaderPointerDown);
    window.removeEventListener('resize', handleMobileHeaderResize);
    window.addEventListener('resize', handleMobileHeaderResize);
}

function ensureContactRingDecorations(button) {
    if (!button || button.querySelector('.contact-wave')) {
        return;
    }

    button.classList.add('contact-ring-button');

    const waveOne = document.createElement('span');
    waveOne.className = 'contact-wave contact-wave-1';
    waveOne.setAttribute('aria-hidden', 'true');

    const waveTwo = document.createElement('span');
    waveTwo.className = 'contact-wave contact-wave-2';
    waveTwo.setAttribute('aria-hidden', 'true');

    button.prepend(waveTwo);
    button.prepend(waveOne);
}

function ensureContactRingStyle() {
    if (document.getElementById('contact-ring-style')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'contact-ring-style';
    style.textContent = `
        @keyframes contactPhoneRing {
            0%, 100% { transform: rotate(0deg); }
            10% { transform: rotate(16deg); }
            20% { transform: rotate(-14deg); }
            30% { transform: rotate(12deg); }
            40% { transform: rotate(-10deg); }
            50% { transform: rotate(7deg); }
            60% { transform: rotate(-5deg); }
            70% { transform: rotate(3deg); }
        }

        @keyframes contactWavePulse {
            0% {
                opacity: 0;
                transform: scale(0.96);
            }

            18% {
                opacity: 0.34;
            }

            100% {
                opacity: 0;
                transform: scale(1.55);
            }
        }

        .contact-ring-button {
            overflow: visible !important;
            isolation: isolate;
        }

        .contact-ring-button > *:not(.contact-wave) {
            z-index: 2;
        }

        .contact-ring-button #btn-chat-icon,
        .contact-ring-button #btn-close-icon {
            z-index: 2;
        }

        .contact-wave {
            position: absolute;
            inset: -5px;
            border-radius: 9999px;
            border: 4px solid rgba(22, 78, 135, 0.52);
            box-shadow: 0 0 0 1px rgba(22, 78, 135, 0.16);
            pointer-events: none;
            opacity: 0;
            z-index: 0;
        }

        .contact-ring-active {
            animation: contactPhoneRing 1.15s ease-in-out;
            transform-origin: center bottom;
            will-change: transform;
        }

        .contact-ring-active .contact-wave-1 {
            animation: contactWavePulse 1.45s ease-out;
        }

        .contact-ring-active .contact-wave-2 {
            animation: contactWavePulse 1.45s ease-out 0.42s;
        }
    `;

    document.head.appendChild(style);
}

function stopContactRing(button) {
    if (!button) {
        return;
    }

    button.classList.remove('contact-ring-active');
    clearTimeout(contactRingTimeoutId);
    clearTimeout(contactRingRestartTimeoutId);
}

function triggerContactRing() {
    const button = document.querySelector('#contact-container button');

    if (!button || isMenuOpen || document.hidden) {
        stopContactRing(button);
        return;
    }

    stopContactRing(button);

    // Restart animation cleanly on each cycle.
    void button.offsetWidth;
    button.classList.add('contact-ring-active');

    contactRingTimeoutId = window.setTimeout(() => {
        button.classList.remove('contact-ring-active');
    }, 1200);
}

function initContactRing() {
    const button = document.querySelector('#contact-container button');

    if (!button) {
        return;
    }

    ensureContactRingStyle();
    ensureContactRingDecorations(button);
    clearInterval(contactRingIntervalId);
    stopContactRing(button);

    contactRingTimeoutId = window.setTimeout(triggerContactRing, 900);
    contactRingIntervalId = window.setInterval(triggerContactRing, 2500);
}

function toggleContact() {
    isMenuOpen = !isMenuOpen;

    const container = document.getElementById('contact-container');
    const menu = document.getElementById('contact-menu');
    const chatIcon = document.getElementById('btn-chat-icon');
    const closeIcon = document.getElementById('btn-close-icon');
    const contactButton = container ? container.querySelector('button') : null;

    if (isMenuOpen) {
        // open menu
        menu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none', 'translate-y-4');
        menu.classList.add('opacity-100', 'scale-100', 'pointer-events-auto', 'translate-y-0');

        container.classList.add('z-50');
        stopContactRing(contactButton);

        // Rotate and hide icon chat
        chatIcon.classList.remove('rotate-0', 'opacity-100');
        chatIcon.classList.add('rotate-90', 'opacity-0');

        // Rotate and show X
        closeIcon.classList.remove('-rotate-90', 'opacity-0');
        closeIcon.classList.add('rotate-0', 'opacity-100');
    } else {
        // close menu
        menu.classList.add('opacity-0', 'scale-95', 'pointer-events-none', 'translate-y-4');
        menu.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto', 'translate-y-0');

        container.classList.remove('z-50');

        // return icon chat
        chatIcon.classList.add('rotate-0', 'opacity-100');
        chatIcon.classList.remove('rotate-90', 'opacity-0');

        closeIcon.classList.add('-rotate-90', 'opacity-0');
        closeIcon.classList.remove('rotate-0', 'opacity-100');

        clearTimeout(contactRingRestartTimeoutId);
        contactRingRestartTimeoutId = window.setTimeout(triggerContactRing, 250);
    }
}

function redirectToCart(){
    window.location.href = "/cart.html";
}

function loadComponent(id, file) {
    fetch(file)
        .then(res => res.text())
        .then(data => {
            document.getElementById(id).innerHTML = data;
            if (id === "header") {
                initMobileHeaderMenu();
                window.dispatchEvent(new CustomEvent("header:loaded"));
            }
            if (id === "contact-pop") {
                initContactRing();
            }
        });
}

function loadPopup(file) {
    fetch(file)
        .then(res => res.text())
        .then(data => {
            document.body.insertAdjacentHTML("beforeend", data);
        });
}

document.addEventListener("DOMContentLoaded", function () {
    loadComponent("header", "/components/header.html");
    loadComponent("footer", "/components/footer.html");
    loadComponent("contact-pop","/components/contact-popup.html");
});

document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
        stopContactRing(document.querySelector('#contact-container button'));
        return;
    }

    triggerContactRing();
});
