// mobile-nav.js - แถบเมนูด้านล่างสำหรับมือถือ (Mobile Bottom Navigation)

document.addEventListener('DOMContentLoaded', () => {
    const navHTML = `
        <div class="fixed bottom-0 left-0 right-0 bg-[#0B0C10]/95 backdrop-blur-md border-t border-gamer-cyan/20 z-50 md:hidden pb-safe">
            <div class="flex justify-around items-center h-16">
                <a href="/" class="flex flex-col items-center justify-center w-full h-full text-gamer-lightgray hover:text-gamer-cyan transition-colors">
                    <i class="fa-solid fa-house text-xl mb-1"></i>
                    <span class="text-[10px] font-bold">หน้าแรก</span>
                </a>
                <a href="/pc-builder.html" class="flex flex-col items-center justify-center w-full h-full text-gamer-lightgray hover:text-gamer-cyan transition-colors">
                    <i class="fa-solid fa-desktop text-xl mb-1"></i>
                    <span class="text-[10px] font-bold">จัดสเปค</span>
                </a>
                <a href="/cart.html" class="flex flex-col items-center justify-center w-full h-full text-gamer-lightgray hover:text-gamer-cyan transition-colors relative">
                    <i class="fa-solid fa-cart-shopping text-xl mb-1"></i>
                    <span class="text-[10px] font-bold">ตะกร้า</span>
                    <span id="mobile-cart-badge" class="absolute top-1 right-3 bg-gamer-red text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-[0_0_10px_rgba(255,75,75,0.8)]">0</span>
                </a>
                <a href="/profile.html" class="flex flex-col items-center justify-center w-full h-full text-gamer-lightgray hover:text-gamer-cyan transition-colors">
                    <i class="fa-solid fa-user text-xl mb-1"></i>
                    <span class="text-[10px] font-bold">โปรไฟล์</span>
                </a>
            </div>
        </div>
        <style>
            /* เพิ่ม padding-bottom ให้ body เพื่อไม่ให้ content ถูกบัง */
            @media (max-width: 768px) {
                body {
                    padding-bottom: 5rem !important;
                }
                .pb-safe {
                    padding-bottom: env(safe-area-inset-bottom);
                }
            }
        </style>
    `;

    document.body.insertAdjacentHTML('beforeend', navHTML);

    // Sync cart count
    function syncCartCount() {
        const cart = JSON.parse(localStorage.getItem('lx_cart') || '[]');
        const total = cart.reduce((sum, item) => sum + item.quantity, 0);
        const badge = document.getElementById('mobile-cart-badge');
        if (badge) {
            badge.textContent = total;
            badge.style.display = total > 0 ? 'block' : 'none';
        }
    }

    syncCartCount();

    // Listen for cart updates
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        const event = new Event('itemInserted');
        event.key = key;
        event.value = value;
        document.dispatchEvent(event);
        originalSetItem.apply(this, arguments);
    };

    document.addEventListener('itemInserted', function (e) {
        if (e.key === 'lx_cart') {
            syncCartCount();
        }
    });

    // Highlight active link
    const path = window.location.pathname;
    document.querySelectorAll('.md\\:hidden a').forEach(link => {
        if (link.getAttribute('href') === path || (path === '/' && link.getAttribute('href') === '/index.html')) {
            link.classList.remove('text-gamer-lightgray');
            link.classList.add('text-gamer-cyan');
            link.querySelector('i').classList.add('shadow-[0_0_15px_rgba(102,252,241,0.5)]', 'drop-shadow-[0_0_5px_rgba(102,252,241,1)]');
        }
    });
});
