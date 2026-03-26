let isContactOpen = false;
let isHeaderMenuOpen = false;
let activeHeaderMenuTrigger = null;
let contactRingIntervalId = null;
let contactRingTimeoutId = null;
let contactRingRestartTimeoutId = null;
let productsDataPromise = null;
let headerSearchDebounceId = null;

const HEADER_SEARCH_DEBOUNCE_MS = 500;

function getHeaderMenuElements() {
    return {
        menu: document.getElementById('header-category-menu'),
        overlay: document.getElementById('header-category-overlay'),
        mobileToggle: document.getElementById('header-menu-mobile-toggle'),
        mobileOpenIcon: document.getElementById('header-menu-mobile-open-icon'),
        mobileCloseIcon: document.getElementById('header-menu-mobile-close-icon'),
        desktopToggle: document.getElementById('header-menu-desktop-toggle'),
        desktopOpenIcon: document.getElementById('header-menu-desktop-open-icon'),
        desktopCloseIcon: document.getElementById('header-menu-desktop-close-icon')
    };
}

function syncHeaderMenuBodyState() {
    if (!document.body) {
        return;
    }

    const scrollbarWidth = Math.max(window.innerWidth - document.documentElement.clientWidth, 0);
    const supportsStableScrollbarGutter = Boolean(
        window.CSS &&
        typeof window.CSS.supports === 'function' &&
        window.CSS.supports('scrollbar-gutter: stable')
    );

    document.body.classList.toggle('overflow-hidden', isHeaderMenuOpen);

    if (!isHeaderMenuOpen || supportsStableScrollbarGutter) {
        document.body.style.paddingRight = '';
        return;
    }

    document.body.style.paddingRight = `${scrollbarWidth}px`;
}

function syncHeaderMenuToggleState(toggle, openIcon, closeIcon, isActive, activeClasses) {
    if (!toggle || !openIcon || !closeIcon) {
        return;
    }

    toggle.setAttribute('aria-expanded', String(isActive));
    activeClasses.forEach((className) => {
        toggle.classList.toggle(className, isActive);
    });
    openIcon.classList.toggle('hidden', isActive);
    closeIcon.classList.toggle('hidden', !isActive);
}

function updateHeaderMenuPosition() {
    const { menu, mobileToggle, desktopToggle } = getHeaderMenuElements();
    const trigger = activeHeaderMenuTrigger === 'mobile' ? mobileToggle : desktopToggle;
    const header = document.querySelector('#header > header');

    if (!menu || !trigger) {
        return;
    }

    const horizontalPadding = 16;
    const menuWidth = Math.min(340, window.innerWidth - (horizontalPadding * 2));
    const triggerRect = trigger.getBoundingClientRect();
    const headerRect = header ? header.getBoundingClientRect() : null;
    const left = Math.min(
        Math.max(triggerRect.left, horizontalPadding),
        Math.max(horizontalPadding, window.innerWidth - menuWidth - horizontalPadding)
    );

    menu.style.width = `${menuWidth}px`;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(headerRect ? headerRect.bottom - 2 : triggerRect.bottom)}px`;
}

function syncHeaderMenuOverlayState() {
    const { overlay } = getHeaderMenuElements();

    if (!overlay) {
        syncHeaderMenuBodyState();
        return;
    }

    overlay.classList.toggle('pointer-events-none', !isHeaderMenuOpen);
    overlay.classList.toggle('opacity-0', !isHeaderMenuOpen);
    overlay.classList.toggle('opacity-100', isHeaderMenuOpen);
    syncHeaderMenuBodyState();
}

function updateHeaderMenuState(nextState, trigger = activeHeaderMenuTrigger) {
    const {
        menu,
        mobileToggle,
        mobileOpenIcon,
        mobileCloseIcon,
        desktopToggle,
        desktopOpenIcon,
        desktopCloseIcon
    } = getHeaderMenuElements();

    if (!menu) {
        isHeaderMenuOpen = false;
        activeHeaderMenuTrigger = null;
        syncHeaderMenuOverlayState();
        return;
    }

    isHeaderMenuOpen = nextState;
    activeHeaderMenuTrigger = nextState ? (trigger || activeHeaderMenuTrigger || 'desktop') : null;

    if (nextState) {
        updateHeaderMenuPosition();
    } else {
        menu.style.left = '0px';
        menu.style.top = '0px';
    }

    menu.classList.toggle('invisible', !nextState);
    menu.classList.toggle('pointer-events-none', !nextState);
    menu.classList.toggle('opacity-0', !nextState);
    menu.classList.toggle('-translate-y-2', !nextState);
    menu.classList.toggle('scale-95', !nextState);
    menu.classList.toggle('pointer-events-auto', nextState);
    menu.classList.toggle('opacity-100', nextState);
    menu.classList.toggle('translate-y-0', nextState);
    menu.classList.toggle('scale-100', nextState);

    syncHeaderMenuToggleState(
        mobileToggle,
        mobileOpenIcon,
        mobileCloseIcon,
        nextState && activeHeaderMenuTrigger === 'mobile',
        ['border-primary', 'text-primary', 'shadow-lg']
    );
    syncHeaderMenuToggleState(
        desktopToggle,
        desktopOpenIcon,
        desktopCloseIcon,
        nextState && activeHeaderMenuTrigger === 'desktop',
        ['ring-2', 'ring-green-100', 'shadow-2xl']
    );
    syncHeaderMenuOverlayState();
}

function closeHeaderMenu() {
    updateHeaderMenuState(false);
}

function toggleHeaderMenu(trigger) {
    const shouldOpen = !isHeaderMenuOpen || activeHeaderMenuTrigger !== trigger;
    updateHeaderMenuState(shouldOpen, trigger);
}

function closeHeaderMenus() {
    closeHeaderMenu();
}

function handleHeaderCategoryKeydown(event) {
    if (event.key !== 'Escape' || !isHeaderMenuOpen) {
        return;
    }

    closeHeaderMenu();
}

function handleHeaderMenuResize() {
    if (!isHeaderMenuOpen) {
        return;
    }

    const isDesktop = window.innerWidth >= 1024;

    if ((activeHeaderMenuTrigger === 'desktop' && !isDesktop) || (activeHeaderMenuTrigger === 'mobile' && isDesktop)) {
        closeHeaderMenu();
        return;
    }

    updateHeaderMenuPosition();
}

function initHeaderMenu() {
    closeHeaderMenu();
    document.removeEventListener('keydown', handleHeaderCategoryKeydown);
    document.addEventListener('keydown', handleHeaderCategoryKeydown);
    window.removeEventListener('resize', handleHeaderMenuResize);
    window.addEventListener('resize', handleHeaderMenuResize);
}

function normalizeSearchText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0111/g, 'd')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function filterProductsByKeyword(products, keyword, limit = null) {
    const sourceProducts = Array.isArray(products) ? products : [];
    const normalizedKeyword = normalizeSearchText(keyword);

    let matches = normalizedKeyword
        ? sourceProducts.filter(function (product) {
            return normalizeSearchText(product && product.name).includes(normalizedKeyword);
        })
        : sourceProducts.slice();

    const maxItems = Number(limit);
    if (maxItems > 0) {
        matches = matches.slice(0, maxItems);
    }

    return matches;
}

function getAllProductsData() {
    if (!productsDataPromise) {
        productsDataPromise = fetch('/data/products.json')
            .then(function (res) {
                if (!res.ok) {
                    throw new Error('Can not load products.json');
                }

                return res.json();
            })
            .then(function (products) {
                return Array.isArray(products) ? products : [];
            })
            .catch(function (error) {
                productsDataPromise = null;
                throw error;
            });
    }

    return productsDataPromise;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resolveAssetPath(path) {
    const normalizedPath = String(path || '').trim();

    if (!normalizedPath) {
        return '';
    }

    if (/^https?:\/\//i.test(normalizedPath)) {
        return normalizedPath;
    }

    return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
}

function buildProductSearchUrl(keyword) {
    const trimmedKeyword = String(keyword || '').trim();
    const params = new URLSearchParams();

    if (trimmedKeyword) {
        params.set('keyword', trimmedKeyword);
    }

    const queryString = params.toString();
    return `/all-products.html${queryString ? `?${queryString}` : ''}`;
}

function getHeaderSearchElements() {
    return {
        wrapper: document.getElementById('header-product-search'),
        form: document.getElementById('header-product-search-form'),
        input: document.getElementById('header-product-search-input'),
        dropdown: document.getElementById('header-product-search-dropdown'),
        results: document.getElementById('header-product-search-results'),
        empty: document.getElementById('header-product-search-empty'),
        viewAll: document.getElementById('header-product-search-view-all')
    };
}

function clearHeaderSearchDebounce() {
    if (!headerSearchDebounceId) {
        return;
    }

    window.clearTimeout(headerSearchDebounceId);
    headerSearchDebounceId = null;
}

function resetHeaderSearchResults(elements) {
    if (!elements.results || !elements.empty || !elements.viewAll) {
        return;
    }

    elements.results.innerHTML = '';
    elements.empty.classList.add('hidden');
    elements.viewAll.classList.add('hidden');
}

function setHeaderSearchDropdownState(isOpen) {
    const { dropdown, input } = getHeaderSearchElements();
    if (!dropdown) {
        return;
    }

    dropdown.classList.toggle('hidden', !isOpen);

    if (input) {
        input.setAttribute('aria-expanded', String(isOpen));
    }
}

function closeHeaderSearchResults() {
    clearHeaderSearchDebounce();
    setHeaderSearchDropdownState(false);
}

function scheduleHeaderSearchResults(keyword, options = {}) {
    const elements = getHeaderSearchElements();
    if (!elements.input || !elements.results || !elements.empty || !elements.viewAll) {
        return;
    }

    const trimmedKeyword = String(keyword || '').trim();
    const shouldRenderImmediately = Boolean(options.immediate);

    clearHeaderSearchDebounce();

    if (!trimmedKeyword) {
        resetHeaderSearchResults(elements);
        setHeaderSearchDropdownState(false);
        return;
    }

    if (shouldRenderImmediately) {
        renderHeaderSearchResults(trimmedKeyword);
        return;
    }

    headerSearchDebounceId = window.setTimeout(function () {
        headerSearchDebounceId = null;
        renderHeaderSearchResults(trimmedKeyword);
    }, HEADER_SEARCH_DEBOUNCE_MS);
}

function renderHeaderSearchResults(keyword) {
    const elements = getHeaderSearchElements();
    if (!elements.input || !elements.results || !elements.empty || !elements.viewAll) {
        return;
    }

    const trimmedKeyword = String(keyword || '').trim();

    if (!trimmedKeyword) {
        resetHeaderSearchResults(elements);
        closeHeaderSearchResults();
        return;
    }

    elements.viewAll.href = buildProductSearchUrl(trimmedKeyword);

    getAllProductsData()
        .then(function (products) {
            if (elements.input.value.trim() !== trimmedKeyword) {
                return;
            }

            const matches = filterProductsByKeyword(products, trimmedKeyword, 4);
            elements.viewAll.classList.remove('hidden');

            if (!matches.length) {
                elements.results.innerHTML = '';
                elements.empty.classList.remove('hidden');
                setHeaderSearchDropdownState(true);
                return;
            }

            elements.empty.classList.add('hidden');
            elements.results.innerHTML = matches.map(function (product) {
                const productName = escapeHtml(product.name || 'San pham');
                const productImage = escapeHtml(resolveAssetPath(product.img));
                const productPrice = formatProductMoney(product.finalprice || product.price || 0);

                return `
                    <a href="/product.html?id=${encodeURIComponent(product.id)}"
                        class="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50">
                        <span class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                            <img src="${productImage}" alt="${productName}" class="h-full w-full object-cover">
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="block truncate text-sm font-semibold text-gray-800">${productName}</span>
                            <span class="mt-1 block text-xs font-bold text-primary">${productPrice}</span>
                        </span>
                    </a>
                `;
            }).join('');

            setHeaderSearchDropdownState(true);
        })
        .catch(function (error) {
            console.error('renderHeaderSearchResults error:', error);

            if (elements.input.value.trim() !== trimmedKeyword) {
                return;
            }

            elements.results.innerHTML = '';
            elements.empty.classList.remove('hidden');
            elements.viewAll.classList.remove('hidden');
            setHeaderSearchDropdownState(true);
        });
}

function submitHeaderProductSearch() {
    const { input } = getHeaderSearchElements();
    if (!input) {
        return;
    }

    window.location.href = buildProductSearchUrl(input.value);
}

function handleHeaderSearchDocumentClick(event) {
    const { wrapper } = getHeaderSearchElements();
    if (!wrapper || wrapper.contains(event.target)) {
        return;
    }

    closeHeaderSearchResults();
}

function handleHeaderSearchGlobalKeydown(event) {
    if (event.key !== 'Escape') {
        return;
    }

    closeHeaderSearchResults();
}

function initHeaderSearch() {
    const elements = getHeaderSearchElements();
    if (!elements.form || !elements.input) {
        return;
    }

    elements.input.value = new URLSearchParams(window.location.search).get('keyword') || '';

    elements.form.addEventListener('submit', function (event) {
        event.preventDefault();
        submitHeaderProductSearch();
    });

    elements.input.addEventListener('input', function (event) {
        scheduleHeaderSearchResults(event.target.value);
    });

    elements.input.addEventListener('focus', function () {
        if (elements.input.value.trim()) {
            scheduleHeaderSearchResults(elements.input.value, { immediate: true });
        }
    });

    if (elements.viewAll) {
        elements.viewAll.addEventListener('click', function () {
            closeHeaderSearchResults();
        });
    }
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

    if (!button || isContactOpen || document.hidden) {
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
    isContactOpen = !isContactOpen;

    const container = document.getElementById('contact-container');
    const menu = document.getElementById('contact-menu');
    const chatIcon = document.getElementById('btn-chat-icon');
    const closeIcon = document.getElementById('btn-close-icon');
    const contactButton = container ? container.querySelector('button') : null;

    if (isContactOpen) {
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

function handleAddToCartAndOrder(productSlug) {
            window.location.href = "product.html?slug=" + encodeURIComponent(productSlug);
        }

function loadComponent(id, file) {
    fetch(file)
        .then(res => {
            if (!res.ok) {
                throw new Error(`Can not load component: ${file}`);
            }

            return res.text();
        })
        .then(data => {
            const container = document.getElementById(id);
            if (!container) {
                console.warn(`loadComponent target not found: #${id}`);
                return;
            }

            container.innerHTML = data;
            if (id === "header") {
                initHeaderMenu();
                initHeaderSearch();
                window.dispatchEvent(new CustomEvent("header:loaded"));
            }
            if (id === "contact-pop") {
                initContactRing();
            }
        })
        .catch(error => {
            console.error("loadComponent error:", error);
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

document.addEventListener('click', handleHeaderSearchDocumentClick);
document.addEventListener('keydown', handleHeaderSearchGlobalKeydown);

function formatProductMoney(amount) {
    return Number(amount || 0).toLocaleString("vi-VN") + " \u20AB";
}
