
    // ===================================
    // JavaScript - เชื่อมหน้าเว็บกับ Backend API
    // ===================================

    const API_URL = '';
    const user = JSON.parse(localStorage.getItem('lx_user') || 'null');

    // --- ตะกร้าและเปรียบเทียบ ---
    function getCart() { return JSON.parse(localStorage.getItem('lx_cart') || '[]'); }
    function saveCart(cart) {
        localStorage.setItem('lx_cart', JSON.stringify(cart));
        updateCartCount();
    }
    
    function addToCompare(id) {
        let list = JSON.parse(localStorage.getItem('lx_compare') || '[]');
        if (list.includes(id)) {
            showToast('สินค้านี้อยู่ในรายการเปรียบเทียบแล้ว');
            return;
        }
        if (list.length >= 2) {
            list.shift(); // Remove oldest
        }
        list.push(id);
        localStorage.setItem('lx_compare', JSON.stringify(list));
        showToast('เพิ่มลงในรายการเปรียบเทียบแล้ว');
        setTimeout(() => { window.location.href = '/compare.html'; }, 1000);
    }
    function addToCart(product) {
        if (product.stock_quantity <= 0) {
            alert('สินค้าหมด');
            return;
        }
        const cart = getCart();
        const existing = cart.find(item => item.id === product.id);
        const currentQty = existing ? existing.quantity : 0;
        
        if (currentQty >= product.stock_quantity) {
            alert('ไม่สามารถเพิ่มสินค้าได้ เนื่องจากถึงขีดจำกัดสต๊อกที่มีอยู่แล้ว');
            return;
        }

        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        saveCart(cart);
        showToast(`เพิ่ม "${product.name.substring(0, 30)}..." ลงตะกร้าแล้ว!`);
    }
    function updateCartCount() {
        const cart = getCart();
        const total = cart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cart-count').textContent = total;
    }

    // --- Toast ---
    function showToast(msg) {
        const toast = document.getElementById('toast');
        document.getElementById('toast-msg').textContent = msg;
        toast.classList.remove('translate-y-20', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            toast.classList.remove('translate-y-0', 'opacity-100');
        }, 2500);
    }

    // --- Wishlist ---
    async function toggleWishlist(productId, btnElement) {
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        try {
            const res = await fetch('/api/wishlists/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, product_id: productId })
            });
            const json = await res.json();
            if (json.success) {
                showToast(json.message);
                const icon = btnElement.querySelector('i');
                if (json.is_wished) {
                    icon.classList.remove('fa-regular');
                    icon.classList.add('fa-solid', 'text-gamer-red');
                } else {
                    icon.classList.remove('fa-solid', 'text-gamer-red');
                    icon.classList.add('fa-regular');
                }
            }
        } catch (err) { console.error(err); }
    }

    // --- ไอคอนประจำหมวดหมู่ ---
    function getCategoryIcon(name) {
        if (name.includes('การ์ดจอ')) return 'fa-solid fa-server';
        if (name.includes('ซีพียู')) return 'fa-solid fa-microchip';
        if (name.includes('แรม')) return 'fa-solid fa-memory';
        if (name.includes('เมนบอร์ด')) return 'fa-solid fa-chess-board';
        if (name.includes('อุปกรณ์')) return 'fa-solid fa-keyboard';
        return 'fa-solid fa-box';
    }

    // --- สีป้ายสภาพสินค้า ---
    function getConditionStyle(condition) {
        if (condition.includes('99%')) return 'border-gamer-cyan/50 text-gamer-cyan';
        if (condition.includes('95%')) return 'border-gamer-teal/50 text-gamer-teal';
        if (condition.includes('นางฟ้า')) return 'border-gamer-cyan/50 text-gamer-cyan';
        if (condition.includes('ไม่มีกล่อง')) return 'border-orange-500/50 text-orange-400';
        return 'border-gamer-teal/50 text-gamer-teal';
    }

    // --- โหลดหมวดหมู่จาก API ---
    let currentCategory = null;

    async function loadCategories() {
        try {
            const res = await fetch(`${API_URL}/api/categories`);
            const json = await res.json();
            const container = document.getElementById('categories-container');

            // ปุ่ม "ทั้งหมด"
            let html = `
                <button onclick="filterByCategory(null)" id="cat-all"
                    class="cat-btn flex items-center gap-3 px-5 py-3 sm:px-8 sm:py-4 bg-gamer-gray border border-gamer-cyan rounded-xl shadow-[0_0_15px_rgba(102,252,241,0.2)] -translate-y-1 transition-all duration-300 group">
                    <i class="fa-solid fa-border-all text-2xl text-gamer-cyan"></i>
                    <span class="font-bold text-gamer-cyan text-sm sm:text-base">ทั้งหมด</span>
                </button>
            `;

            json.data.forEach(cat => {
                html += `
                    <button onclick="filterByCategory(${cat.id}, '${cat.name}')" id="cat-${cat.id}"
                        class="cat-btn flex items-center gap-3 px-5 py-3 sm:px-8 sm:py-4 bg-gamer-gray border border-gamer-teal/30 rounded-xl hover:border-gamer-cyan hover:shadow-[0_0_15px_rgba(102,252,241,0.2)] hover:-translate-y-1 transition-all duration-300 group">
                        <i class="${getCategoryIcon(cat.name)} text-2xl text-gamer-lightgray group-hover:text-gamer-cyan transition-colors"></i>
                        <span class="font-bold text-white group-hover:text-gamer-cyan transition-colors text-sm sm:text-base">${cat.name.split(' (')[0]}</span>
                    </button>
                `;
            });
            container.innerHTML = html;
        } catch (err) {
            console.error('โหลดหมวดหมู่ไม่สำเร็จ:', err);
        }
    }

    // --- กรองตามหมวดหมู่ ---
    async function filterByCategory(categoryId, categoryName) {
        currentCategory = categoryId;
        // อัปเดตหัวข้อ
        document.getElementById('section-title').textContent = categoryId ? categoryName : 'สินค้าแนะนำ';
        // อัปเดตสไตล์ปุ่ม
        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.classList.remove('border-gamer-cyan', 'shadow-[0_0_15px_rgba(102,252,241,0.2)]', '-translate-y-1');
            btn.classList.add('border-gamer-teal/30');
            btn.querySelector('i').classList.remove('text-gamer-cyan');
            btn.querySelector('i').classList.add('text-gamer-lightgray');
            btn.querySelector('span').classList.remove('text-gamer-cyan');
            btn.querySelector('span').classList.add('text-white');
        });
        const activeBtn = document.getElementById(categoryId ? `cat-${categoryId}` : 'cat-all');
        if (activeBtn) {
            activeBtn.classList.add('border-gamer-cyan', 'shadow-[0_0_15px_rgba(102,252,241,0.2)]', '-translate-y-1');
            activeBtn.classList.remove('border-gamer-teal/30');
            activeBtn.querySelector('i').classList.add('text-gamer-cyan');
            activeBtn.querySelector('i').classList.remove('text-gamer-lightgray');
            activeBtn.querySelector('span').classList.add('text-gamer-cyan');
            activeBtn.querySelector('span').classList.remove('text-white');
        }
        await loadProducts(categoryId);
    }

    function filterByPromo() {
        document.getElementById('section-title').textContent = '🔥 สินค้าราคาพิเศษ & โปรโมชั่น';
        currentCategory = 'promo';
        
        // Reset category styles
        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.classList.remove('border-gamer-cyan', 'shadow-[0_0_15px_rgba(102,252,241,0.2)]', '-translate-y-1');
            btn.classList.add('border-gamer-teal/30');
            btn.querySelector('i').classList.remove('text-gamer-cyan');
            btn.querySelector('i').classList.add('text-gamer-lightgray');
            btn.querySelector('span').classList.remove('text-gamer-cyan');
            btn.querySelector('span').classList.add('text-white');
        });

        loadProducts('promo');
    }

    // --- โหลดสินค้าจาก API ---
    async function loadProducts(categoryId) {
        const grid = document.getElementById('products-grid');
        
        // Skeleton Loader
        let skeletonHtml = '';
        for(let i=0; i<8; i++) {
            skeletonHtml += `
                <div class="bg-gamer-dark rounded-2xl overflow-hidden border border-gamer-teal/10 animate-pulse h-full flex flex-col">
                    <div class="w-full h-48 sm:h-56 bg-gamer-gray"></div>
                    <div class="p-5 flex flex-col flex-grow space-y-4">
                        <div class="h-4 bg-gamer-gray rounded w-1/3"></div>
                        <div class="h-5 bg-gamer-gray rounded w-3/4"></div>
                        <div class="h-4 bg-gamer-gray rounded w-1/2"></div>
                        <div class="mt-auto pt-4 flex justify-between items-center">
                            <div class="h-6 bg-gamer-gray rounded w-1/3"></div>
                            <div class="h-10 w-10 bg-gamer-gray rounded-xl"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        grid.innerHTML = skeletonHtml;
        try {
            let urlStr = API_URL ? `${API_URL}/api/products` : '/api/products';
            const params = new URLSearchParams();
            if (categoryId && categoryId !== 'promo') {
                params.append('category', categoryId);
            }

            const conditionFilter = document.getElementById('filter-condition').value;
            const sortFilter = document.getElementById('filter-sort').value;
            const minPrice = document.getElementById('filter-min-price').value;
            const maxPrice = document.getElementById('filter-max-price').value;
            const searchInput = document.getElementById('search-input') ? document.getElementById('search-input').value : '';

            if (conditionFilter && conditionFilter !== 'all') params.append('condition', conditionFilter);
            if (sortFilter && sortFilter !== 'default') params.append('sortBy', sortFilter);
            if (minPrice) params.append('minPrice', minPrice);
            if (maxPrice) params.append('maxPrice', maxPrice);
            if (searchInput) params.append('search', searchInput);

            const queryString = params.toString();
            if (queryString) {
                urlStr += `?${queryString}`;
            }

            const res = await fetch(urlStr);
            const json = await res.json();
            
            let displayData = json.data || [];
            if (categoryId === 'promo') {
                displayData = displayData.filter(p => p.discount_price || p.promo_tag);
            }

            if (displayData.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-20">
                        <i class="fa-solid fa-box-open text-gamer-teal text-5xl mb-4"></i>
                        <p class="text-gamer-lightgray text-lg">ไม่พบสินค้าในหมวดหมู่นี้</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = displayData.map(product => `
                <div class="bg-gamer-gray border border-gamer-teal/20 rounded-2xl overflow-hidden hover:border-gamer-cyan/50 hover:shadow-[0_0_25px_rgba(69,162,158,0.2)] transition-all duration-300 group flex flex-col relative">
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent to-gamer-dark/80 z-10 pointer-events-none"></div>
                    <div class="absolute top-4 right-4 z-30 flex flex-col gap-2">
                        <button onclick="toggleWishlist('${product.id}', this)" class="w-8 h-8 bg-gamer-dark/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-gamer-red hover:text-white transition-all" title="บันทึกที่ถูกใจ">
                            <i class="fa-regular fa-heart text-gamer-lightgray"></i>
                        </button>
                        <button onclick="addToCompare('${product.id}')" class="w-8 h-8 bg-gamer-dark/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-gamer-cyan hover:text-gamer-dark transition-all" title="เปรียบเทียบสเปค">
                            <i class="fa-solid fa-code-compare text-gamer-lightgray"></i>
                        </button>
                    </div>
                    <a href="/product.html?id=${product.id}" class="relative overflow-hidden bg-white/5 aspect-square p-8 flex items-center justify-center cursor-pointer">
                        <span class="absolute top-4 left-4 z-20 bg-gamer-dark/90 backdrop-blur-sm border ${getConditionStyle(product.condition_level)} text-xs font-bold px-2.5 py-1 rounded-md shadow-lg tracking-wide">${product.condition_level}</span>
                        ${product.promo_tag ? `<span class="absolute top-10 left-4 z-20 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-full shadow-lg shadow-red-500/40 animate-pulse tracking-wide"><i class="fa-solid fa-fire mr-1"></i>${product.promo_tag}</span>` : ''}
                        <img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-contain group-hover:scale-110 group-hover:rotate-2 transition-transform duration-500 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)] z-0">
                    </a>
                    <div class="p-6 flex flex-col flex-grow relative z-20 bg-gamer-gray">
                        <div class="text-xs text-gamer-teal mb-2 font-bold tracking-widest">${product.category_name || ''}</div>
                        <a href="/product.html?id=${product.id}" class="text-lg font-bold text-white mb-2 line-clamp-2 leading-snug group-hover:text-gamer-cyan transition-colors cursor-pointer">${product.name}</a>
                        <p class="text-sm text-gamer-lightgray/70 mb-6 flex-grow line-clamp-2">${product.description || ''}</p>
                        <div class="flex items-center justify-between mt-auto">
                            <div>
                                ${product.discount_price 
                                    ? `<div class="text-xs text-gamer-lightgray/50 line-through">฿${Number(product.price).toLocaleString()}</div>
                                       <div class="font-gaming text-2xl sm:text-3xl font-bold text-gamer-cyan">฿${Number(product.discount_price).toLocaleString()}</div>`
                                    : `<div class="font-gaming text-3xl font-bold text-white">฿${Number(product.price).toLocaleString()}</div>`
                                }
                            </div>
                            ${product.stock_quantity > 0 
                                ? `<button onclick='addToCart(${JSON.stringify({ id: product.id, name: product.name, price: product.price, image_url: product.image_url, stock_quantity: product.stock_quantity })})' class="bg-gamer-teal/10 border border-gamer-teal/30 hover:bg-gamer-cyan hover:border-gamer-cyan text-gamer-cyan hover:text-gamer-dark w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-[0_0_15px_rgba(102,252,241,0.5)]">
                                    <i class="fa-solid fa-cart-plus text-lg"></i>
                                </button>`
                                : `<div class="bg-gamer-red/10 border border-gamer-red/30 text-gamer-red text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center whitespace-nowrap">สินค้าหมด</div>`
                            }
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <i class="fa-solid fa-triangle-exclamation text-gamer-red text-5xl mb-4"></i>
                    <p class="text-gamer-lightgray text-lg">ไม่สามารถโหลดสินค้าได้ กรุณาลองใหม่</p>
                </div>
            `;
            console.error('โหลดสินค้าไม่สำเร็จ:', err);
        }
    }

    // --- ค้นหาสินค้า ---
    function searchProducts() {
        const query = document.getElementById('search-input').value.trim();
        if (query) {
            document.getElementById('section-title').textContent = `ผลการค้นหา "${query}"`;
        } else {
            document.getElementById('section-title').textContent = 'สินค้าแนะนำ';
        }
        loadProducts(currentCategory);
    }

    // ค้นหาเมื่อกด Enter
    document.getElementById('search-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') { searchProducts(); document.getElementById('search-dropdown').classList.add('hidden'); } });

    // --- Autocomplete (ช่องค้นหาแบบพิมพ์แล้วขึ้นเลย) ---
    const searchDropdown = document.getElementById('search-dropdown');
    let allProductsCache = [];

    async function loadAllProductsForSearch() {
        try {
            const res = await fetch(`${API_URL}/api/products`);
            const json = await res.json();
            allProductsCache = json.data;
        } catch (e) { console.error('Failed to load products cache for search'); }
    }

    document.getElementById('search-input')?.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
            searchDropdown.classList.add('hidden');
            return;
        }

        // ค้นหาจำกัด 5 รายการ
        const filtered = allProductsCache.filter(p => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query))).slice(0, 5);
        
        if (filtered.length === 0) {
            searchDropdown.innerHTML = `<div class="px-4 py-3 text-sm text-gamer-lightgray/50">ไม่พบสินค้า "${query}"</div>`;
            searchDropdown.classList.remove('hidden');
            return;
        }

        searchDropdown.innerHTML = filtered.map(p => `
            <a href="/product.html?id=${p.id}" class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-b border-gamer-teal/10 last:border-0 transition-colors">
                <img src="${p.image_url}" class="w-10 h-10 object-contain bg-white/5 rounded-md" alt="${p.name}">
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-bold text-white truncate">${p.name}</div>
                    <div class="text-xs text-gamer-teal">
                        ${p.discount_price ? `<span class="line-through text-gamer-lightgray/50 mr-1">฿${Number(p.price).toLocaleString()}</span><span class="text-gamer-cyan">฿${Number(p.discount_price).toLocaleString()}</span>` : `฿${Number(p.price).toLocaleString()}`}
                        ${p.stock_quantity <= 0 ? '<span class="text-gamer-red ml-1 font-bold">(สินค้าหมด)</span>' : ''}
                    </div>
                </div>
            </a>
        `).join('');
        searchDropdown.classList.remove('hidden');
    });

    // ปิด Dropdown เมื่อคลิกที่อื่น
    document.addEventListener('click', (e) => {
        if (!document.getElementById('search-input').contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add('hidden');
        }
    });

    // --- Advanced Filters Events ---
    document.getElementById('filter-condition').addEventListener('change', () => loadProducts(currentCategory));
    document.getElementById('filter-sort').addEventListener('change', () => loadProducts(currentCategory));

    // --- Flash Sale Logic ---
    function initFlashSale() {
        const grid = document.getElementById('flash-sale-grid');
        const flashProducts = allProductsCache.filter(p => p.discount_price).slice(0, 4);
        if (flashProducts.length > 0) {
            document.getElementById('flash-sale-section').classList.remove('hidden');
            grid.innerHTML = flashProducts.map(product => `
                <div class="bg-gamer-dark/80 border border-gamer-red/30 rounded-2xl overflow-hidden hover:border-gamer-red hover:shadow-[0_0_25px_rgba(255,75,75,0.2)] transition-all duration-300 group flex flex-col relative">
                    <a href="/product.html?id=${product.id}" class="relative overflow-hidden bg-white/5 aspect-square p-6 flex items-center justify-center cursor-pointer">
                        <span class="absolute top-3 left-3 z-20 bg-gamer-red text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-full shadow-lg tracking-wide"><i class="fa-solid fa-fire mr-1"></i>ลดเดือด</span>
                        <img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-contain group-hover:scale-110 group-hover:rotate-2 transition-transform duration-500 z-0">
                    </a>
                    <div class="p-4 flex flex-col flex-grow relative z-20">
                        <a href="/product.html?id=${product.id}" class="text-sm font-bold text-white mb-2 line-clamp-2 leading-snug group-hover:text-gamer-cyan transition-colors cursor-pointer">${product.name}</a>
                        <div class="flex items-center justify-between mt-auto">
                            <div>
                                <div class="text-xs text-gamer-lightgray/50 line-through">฿${Number(product.price).toLocaleString()}</div>
                                <div class="font-gaming text-xl font-bold text-yellow-400">฿${Number(product.discount_price).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
            startCountdown();
        }
    }

    function startCountdown() {
        // Set midnight tonight
        const midnight = new Date();
        midnight.setHours(23, 59, 59, 0);

        setInterval(() => {
            const now = new Date().getTime();
            const distance = midnight.getTime() - now;
            
            if (distance < 0) {
                document.getElementById('countdown-timer').innerHTML = "EXPIRED";
                return;
            }
            
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            document.getElementById('cd-hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('cd-minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('cd-seconds').textContent = seconds.toString().padStart(2, '0');
        }, 1000);
    }

    // --- Live Chat Logic ---
    function toggleChat() {
        const box = document.getElementById('chat-box');
        const isHidden = box.classList.contains('scale-0');
        if (isHidden) {
            box.classList.remove('scale-0', 'opacity-0');
            box.classList.add('scale-100', 'opacity-100');
        } else {
            box.classList.add('scale-0', 'opacity-0');
            box.classList.remove('scale-100', 'opacity-100');
        }
    }

    // --- Live Chat Logic (Socket.IO) ---
    const socket = io(); // Connect to Socket.IO Server

    // Listen for replies from Admin
    socket.on('admin_reply_message', (data) => {
        const messages = document.getElementById('chat-messages');
        const typingEl = document.getElementById('typing-indicator');
        if (typingEl) typingEl.remove();

        messages.innerHTML += `
            <div class="bg-gamer-gray text-white text-sm p-3 rounded-xl rounded-tl-none max-w-[85%] border border-gamer-teal/20 border-l-2 border-l-gamer-cyan">
                <i class="fa-solid fa-headset text-gamer-cyan mr-1"></i> <b>Admin:</b> ${data.text}
            </div>
        `;
        messages.scrollTop = messages.scrollHeight;
        
        // Auto-open chat if hidden
        const box = document.getElementById('chat-box');
        if (box.classList.contains('scale-0')) {
            toggleChat();
        }
    });

    function sendChatMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;
        
        const messages = document.getElementById('chat-messages');
        // User message
        messages.innerHTML += `
            <div class="bg-gamer-cyan/20 text-white text-sm p-3 rounded-xl rounded-tr-none max-w-[85%] border border-gamer-cyan/30 self-end ml-auto">
                ${text}
            </div>
        `;
        input.value = '';
        messages.scrollTop = messages.scrollHeight;

        // Send to Server
        const user = JSON.parse(localStorage.getItem('lx_user') || 'null');
        const name = user ? user.first_name : 'ลูกค้าทั่วไป';
        socket.emit('user_message', { text, name });

        // Show typing indicator
        messages.innerHTML += `
            <div class="bg-gamer-gray text-white text-sm p-3 rounded-xl rounded-tl-none max-w-[85%] border border-gamer-teal/20" id="typing-indicator">
                <i class="fa-solid fa-ellipsis fa-fade text-gamer-cyan"></i> แอดมินกำลังพิมพ์...
            </div>
        `;
        messages.scrollTop = messages.scrollHeight;
    }

    // --- เริ่มต้นโหลดข้อมูล ---
    updateCartCount();
    loadCategories();
    loadProducts();
    loadAllProductsForSearch().then(initFlashSale);

    // --- Daily Login Bonus ---
    function checkDailyLogin() {
        const userStr = localStorage.getItem('lx_user');
        if (!userStr) return; // Must be logged in

        const user = JSON.parse(userStr);
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        const lastLogin = localStorage.getItem('lx_last_login_' + user.id);

        if (lastLogin !== today) {
            // Give reward
            setTimeout(() => {
                const modalHtml = `
                    <div id="daily-reward-modal" class="fixed inset-0 bg-[#0B0C10]/90 backdrop-blur-md z-[100] flex items-center justify-center animate-fade-in">
                        <div class="bg-gamer-dark border border-gamer-teal/30 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-[0_0_40px_rgba(102,252,241,0.2)] transform scale-0 animate-pop-in">
                            <i class="fa-solid fa-gift text-6xl text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-bounce"></i>
                            <h2 class="font-gaming text-3xl text-white font-bold mb-2">ยินดีต้อนรับกลับมา!</h2>
                            <p class="text-gamer-lightgray mb-6">คุณได้รับแต้มสะสมฟรีประจำวัน <br><span class="text-gamer-cyan font-bold text-2xl">100 แต้ม</span></p>
                            <button onclick="claimDailyReward('${today}', '${user.id}')" class="w-full bg-gamer-cyan text-gamer-dark font-bold py-3 rounded-xl hover:bg-white transition-all shadow-[0_0_15px_rgba(102,252,241,0.4)]">
                                รับรางวัลเลย!
                            </button>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                
                // Add simple animation styles if not exist
                if (!document.getElementById('daily-anim-style')) {
                    const style = document.createElement('style');
                    style.id = 'daily-anim-style';
                    style.innerHTML = `
                        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                        .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                    `;
                    document.head.appendChild(style);
                }
            }, 1500);
        }
    }

    window.claimDailyReward = async function(today, userId) {
        try {
            // Update points via backend API
            const res = await fetch(`/api/users/${userId}/add-points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points: 100 })
            });
            const json = await res.json();
            
            if (json.success) {
                // Save claim date to localStorage to prevent multiple claims today
                localStorage.setItem('lx_last_login_' + userId, today);
                
                // Update localStorage user points
                const user = JSON.parse(localStorage.getItem('lx_user'));
                if (user) {
                    user.points = (user.points || 0) + 100;
                    localStorage.setItem('lx_user', JSON.stringify(user));
                }
            }
            
            // Trigger Confetti if available
            if (typeof confetti === 'function') {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
            
            const btn = document.querySelector('#daily-reward-modal button');
            btn.innerHTML = '<i class="fa-solid fa-check"></i> รับแล้ว!';
            btn.classList.replace('bg-gamer-cyan', 'bg-green-500');
            btn.classList.replace('text-gamer-dark', 'text-white');
            
            setTimeout(() => {
                document.getElementById('daily-reward-modal').remove();
            }, 1500);
        } catch (e) {
            console.error(e);
        }
    };

    // --- Dynamic Banners Logic ---
    let currentBannerIndex = 0;
    let banners = [];
    let bannerInterval;

    async function loadBanners() {
        try {
            const res = await fetch('/api/banners');
            const json = await res.json();
            if (json.success && json.data.length > 0) {
                banners = json.data;
                document.getElementById('dynamic-banners-section').classList.remove('hidden');
                renderBanners();
                startBannerAutoSlide();
            }
        } catch (err) { console.error(err); }
    }

    function renderBanners() {
        const slider = document.getElementById('banner-slider');
        const dots = document.getElementById('banner-dots');
        
        slider.innerHTML = banners.map(b => `
            <div class="min-w-full h-full cursor-pointer flex-shrink-0 relative group" onclick="${b.link_url ? `window.location.href='${b.link_url}'` : ''}">
                <img src="${b.image_url}" class="w-full h-full object-cover" alt="Banner">
                <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
            </div>
        `).join('');

        dots.innerHTML = banners.map((_, i) => `
            <button onclick="goToBanner(${i})" class="w-3 h-3 rounded-full transition-all ${i === currentBannerIndex ? 'bg-gamer-cyan w-6' : 'bg-white/50 hover:bg-white'}"></button>
        `).join('');

        updateBannerPosition();
    }

    function updateBannerPosition() {
        const slider = document.getElementById('banner-slider');
        slider.style.transform = `translateX(-${currentBannerIndex * 100}%)`;
        
        // Update dots
        const dots = document.getElementById('banner-dots').children;
        for (let i = 0; i < dots.length; i++) {
            if (i === currentBannerIndex) {
                dots[i].className = 'w-6 h-3 rounded-full transition-all bg-gamer-cyan';
            } else {
                dots[i].className = 'w-3 h-3 rounded-full transition-all bg-white/50 hover:bg-white';
            }
        }
    }

    window.nextBanner = () => {
        currentBannerIndex = (currentBannerIndex + 1) % banners.length;
        updateBannerPosition();
        resetBannerInterval();
    };

    window.prevBanner = () => {
        currentBannerIndex = (currentBannerIndex - 1 + banners.length) % banners.length;
        updateBannerPosition();
        resetBannerInterval();
    };

    window.goToBanner = (index) => {
        currentBannerIndex = index;
        updateBannerPosition();
        resetBannerInterval();
    };

    function startBannerAutoSlide() {
        bannerInterval = setInterval(window.nextBanner, 5000); // 5 seconds
    }

    function resetBannerInterval() {
        clearInterval(bannerInterval);
        startBannerAutoSlide();
    }

    loadBanners();
    checkDailyLogin();
    