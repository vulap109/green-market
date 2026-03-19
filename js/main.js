let isMenuOpen = false;

function toggleContact() {
    isMenuOpen = !isMenuOpen;

    const container = document.getElementById('contact-container');
    const menu = document.getElementById('contact-menu');
    const chatIcon = document.getElementById('btn-chat-icon');
    const closeIcon = document.getElementById('btn-close-icon');

    if (isMenuOpen) {
        // open menu
        menu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none', 'translate-y-4');
        menu.classList.add('opacity-100', 'scale-100', 'pointer-events-auto', 'translate-y-0');

        container.classList.add('z-50');

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
                window.dispatchEvent(new CustomEvent("header:loaded"));
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
