
    // --- ระบบตรวจสอบสิทธิ์ความปลอดภัยแอดมิน (Security Auth Check) ---
    (function() {
        const userStr = localStorage.getItem('lx_user');
        const token = localStorage.getItem('lx_token');
        let user = null;
        try {
            if (userStr) user = JSON.parse(userStr);
        } catch (e) {}
        
        if (!token || !user || user.role !== 'admin') {
            alert('❌ คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาเข้าสู่ระบบแอดมิน');
            window.location.href = '/login.html';
            // ป้องกันเบราว์เซอร์ดาวน์โหลดข้อมูลต่อ
            throw new Error("Access Denied");
        }
    })();

    // --- Fetch Interceptor สำหรับส่งโทเค็นแอดมิน ---
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        options = options || {};
        options.headers = options.headers || {};
        const token = localStorage.getItem('lx_token');
        if (token) {
            if (options.headers instanceof Headers) {
                options.headers.set('Authorization', 'Bearer ' + token);
            } else {
                options.headers['Authorization'] = 'Bearer ' + token;
            }
        }
        return originalFetch(url, options);
    };

    function showToast(msg) {
        const toast = document.getElementById('toast');
        document.getElementById('toast-msg').textContent = msg;
        toast.classList.remove('translate-y-20', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        setTimeout(() => { toast.classList.add('translate-y-20', 'opacity-0'); toast.classList.remove('translate-y-0', 'opacity-100'); }, 2500);
    }

    function logout() { localStorage.removeItem('lx_user'); window.location.href = '/'; }

    let globalUnreadCount = 0;

    function showTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('bg-gamer-cyan', 'text-gamer-dark'); b.classList.add('bg-gamer-gray', 'text-gamer-lightgray'); });
        document.getElementById(`tab-${tab}`).classList.add('bg-gamer-cyan', 'text-gamer-dark');
        document.getElementById(`tab-${tab}`).classList.remove('bg-gamer-gray', 'text-gamer-lightgray');
        
        document.getElementById('panel-dashboard').classList.toggle('hidden', tab !== 'dashboard');
        document.getElementById('panel-products').classList.toggle('hidden', tab !== 'products');
        document.getElementById('panel-orders').classList.toggle('hidden', tab !== 'orders');
        document.getElementById('panel-users').classList.toggle('hidden', tab !== 'users');
        document.getElementById('panel-chat').classList.toggle('hidden', tab !== 'chat');
        document.getElementById('panel-banners').classList.toggle('hidden', tab !== 'banners');
        document.getElementById('panel-consignments').classList.toggle('hidden', tab !== 'consignments');
        document.getElementById('panel-escrow').classList.toggle('hidden', tab !== 'escrow');
        document.getElementById('panel-promocodes').classList.toggle('hidden', tab !== 'promocodes');

        if (tab === 'dashboard') loadDashboard();
        if (tab === 'orders') loadOrders();
        if (tab === 'users') { loadUsers(); loadKycRequests(); }
        if (tab === 'banners') loadBanners();
        if (tab === 'consignments') loadAdminConsignments();
        if (tab === 'escrow') loadEscrowPayouts();
        if (tab === 'promocodes') loadPromoCodes();
        if (tab === 'chat') {
            globalUnreadCount = 0;
            const badge = document.getElementById('chat-badge');
            if (badge) {
                badge.textContent = '0';
                badge.classList.add('hidden');
            }
            if (typeof loadChatUsers === 'function') loadChatUsers();
        }
    }

    // --- โหลดหมวดหมู่ ---
    async function loadCategories() {
        const res = await fetch('/api/categories');
        const json = await res.json();
        const select = document.getElementById('p-category');
        json.data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id; opt.textContent = c.name;
            select.appendChild(opt);
        });
    }

    // --- โหลดสินค้า ---
    async function loadProducts() {
        const res = await fetch('/api/products');
        const json = await res.json();
        const tbody = document.getElementById('products-table');
        if (json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-gamer-lightgray/50">ยังไม่มีสินค้า</td></tr>';
            return;
        }
        tbody.innerHTML = json.data.map(p => `
            <tr class="border-b border-gamer-teal/10 hover:bg-white/5">
                <td class="py-3 px-4"><img src="${p.image_url || ''}" class="w-12 h-12 object-contain rounded-lg bg-white/5"></td>
                <td class="py-3 px-4 text-white font-medium max-w-[200px]"><span class="line-clamp-1">${p.name}</span></td>
                <td class="py-3 px-4 text-gamer-teal text-xs">${p.category_name || '-'}</td>
                <td class="py-3 px-4 text-right">
                    <div class="text-xs text-gamer-lightgray/50">ทุน: ฿${Number(p.cost_price || 0).toLocaleString()}</div>
                    <div class="text-white font-bold mt-1">
                        ${p.discount_price ? `<span class="text-xs text-gamer-lightgray/50 line-through mr-1">฿${Number(p.price).toLocaleString()}</span><span class="text-gamer-cyan">฿${Number(p.discount_price).toLocaleString()}</span>` : `฿${Number(p.price).toLocaleString()}`}
                    </div>
                    ${p.promo_tag ? `<div class="text-[10px] text-gamer-red mt-1">${p.promo_tag}</div>` : ''}
                </td>
                <td class="py-3 px-4 text-center text-white font-bold text-lg">${p.stock_quantity}</td>
                <td class="py-3 px-4 text-center">
                    <span class="px-2 py-1 rounded-full text-xs font-bold ${p.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}">
                        ${p.is_active ? 'แสดง' : 'ซ่อน'}
                    </span>
                </td>
                <td class="py-3 px-4 text-center whitespace-nowrap">
                    <button onclick="openStockInModal('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="bg-gamer-teal/20 text-gamer-teal border border-gamer-teal/50 hover:bg-gamer-teal hover:text-gamer-dark px-2 py-1 rounded-lg text-xs font-bold transition-colors mr-2" title="นำเข้าสต๊อก">
                        <i class="fa-solid fa-truck-loading"></i> รับเข้า
                    </button>
                    <button onclick='openEditModal(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="text-gamer-cyan/70 hover:text-gamer-cyan transition-colors mr-2" title="แก้ไขสินค้า">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteProduct('${p.id}')" class="text-gamer-red/50 hover:text-gamer-red transition-colors" title="ลบสินค้า">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // --- แก้ไขสินค้า ---
    function openEditModal(p) {
        document.getElementById('edit-modal').classList.remove('hidden');
        
        // Populate edit categories if empty
        const editSelect = document.getElementById('edit-category');
        const mainSelect = document.getElementById('p-category');
        if (editSelect.options.length <= 1 && mainSelect.options.length > 1) {
            editSelect.innerHTML = mainSelect.innerHTML;
        }

        document.getElementById('edit-id').value = p.id;
        document.getElementById('edit-category').value = p.category_id || '';
        document.getElementById('edit-price').value = p.price;
        document.getElementById('edit-cost-price').value = p.cost_price || '';
        document.getElementById('edit-stock').value = p.stock_quantity;
        document.getElementById('edit-discount').value = p.discount_price || '';
    }

    function closeEditModal() {
        document.getElementById('edit-modal').classList.add('hidden');
    }

    async function submitEditProduct(e) {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const body = {
            price: document.getElementById('edit-price').value,
            cost_price: document.getElementById('edit-cost-price').value || 0,
            stock_quantity: document.getElementById('edit-stock').value,
            discount_price: document.getElementById('edit-discount').value || null
        };
        const res = await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json();
        if (json.success) {
            showToast('แก้ไขสินค้าสำเร็จ!');
            closeEditModal();
            loadProducts();
        } else {
            alert('ข้อผิดพลาด: ' + json.message);
        }
    }

    // --- รับเข้าสต๊อก (Stock In) ---
    function openStockInModal(id, name) {
        document.getElementById('stock-in-modal').classList.remove('hidden');
        document.getElementById('stock-in-id').value = id;
        document.getElementById('stock-in-product-name').textContent = name;
        document.getElementById('stock-in-qty').value = 1;
        document.getElementById('stock-in-cost').value = '';
    }

    function closeStockInModal() {
        document.getElementById('stock-in-modal').classList.add('hidden');
    }

    async function submitStockIn(e) {
        e.preventDefault();
        const id = document.getElementById('stock-in-id').value;
        const body = {
            quantity: parseInt(document.getElementById('stock-in-qty').value),
            cost_price: parseFloat(document.getElementById('stock-in-cost').value)
        };
        const res = await fetch(`/api/products/${id}/stock-in`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json();
        if (json.success) {
            showToast('รับเข้าสต๊อกสำเร็จ!');
            closeStockInModal();
            loadProducts();
        } else {
            alert('ข้อผิดพลาด: ' + json.message);
        }
    }

    // --- เพิ่มสินค้า ---
    document.getElementById('add-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let imageUrl = '';
        const fileInput = document.getElementById('p-image');
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            try {
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                const uploadJson = await uploadRes.json();
                if (uploadJson.success) {
                    imageUrl = uploadJson.url;
                } else {
                    alert('อัปโหลดรูปไม่สำเร็จ: ' + uploadJson.message);
                    return;
                }
            } catch (err) {
                alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message);
                return;
            }
        }

        const body = {
            name: document.getElementById('p-name').value,
            category_id: document.getElementById('p-category').value,
            price: document.getElementById('p-price').value,
            cost_price: document.getElementById('p-cost-price').value || 0,
            condition_level: document.getElementById('p-condition').value,
            warranty_status: document.getElementById('p-warranty').value,
            stock_quantity: document.getElementById('p-stock').value || 1,
            image_url: imageUrl,
            description: document.getElementById('p-desc').value,
            discount_price: document.getElementById('p-discount').value || null,
            promo_tag: document.getElementById('p-tag').value || null
        };
        const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json();
        if (json.success) {
            showToast('เพิ่มสินค้าสำเร็จ!');
            document.getElementById('add-product-form').reset();
            loadProducts();
        } else { alert('เกิดข้อผิดพลาด: ' + json.message); }
    });

    // --- ลบสินค้า ---
    async function deleteProduct(id) {
        if (!confirm('ต้องการลบสินค้านี้หรือไม่?')) return;
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) { showToast('ลบสินค้าสำเร็จ'); loadProducts(); }
    }

    // --- โหลดคำสั่งซื้อ (ทั้งหมด) ---
    async function loadOrders() {
        const list = document.getElementById('orders-list');
        list.innerHTML = '<p class="text-center text-gamer-lightgray/50 py-8"><i class="fa-solid fa-spinner fa-spin mr-2"></i>กำลังโหลด...</p>';
        try {
            const res = await fetch('/api/orders/all');
            const json = await res.json();
            if (!json.success || json.data.length === 0) {
                list.innerHTML = '<p class="text-center text-gamer-lightgray/50 py-8">ยังไม่มีคำสั่งซื้อ</p>';
                return;
            }
            list.innerHTML = json.data.map(o => `
                <div class="bg-gamer-dark border border-gamer-teal/20 rounded-xl p-4 space-y-3">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-white font-bold">คำสั่งซื้อ #${o.id.substring(0, 8).toUpperCase()}</p>
                            <p class="text-gamer-lightgray/50 text-xs">${new Date(o.created_at).toLocaleString('th-TH')}</p>
                        </div>
                        <select id="status-select-${o.id}" onchange="handleStatusChange('${o.id}', this.value, '${o.status}')" class="bg-gamer-gray text-white border border-gamer-teal/30 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-gamer-cyan font-bold">
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>⏳ รอดำเนินการ (Pending)</option>
                            <option value="paid" ${o.status === 'paid' ? 'selected' : ''}>💵 ชำระเงินแล้ว (Paid)</option>
                            <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>📦 กำลังจัดเตรียม (Processing)</option>
                            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>🚚 กำลังจัดส่ง (Shipped)</option>
                            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>✅ สำเร็จ (Delivered)</option>
                            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>❌ ยกเลิกแล้ว (Cancelled)</option>
                        </select>
                    </div>
                    
                    <div class="bg-gamer-gray/30 p-3 rounded-lg border border-gamer-teal/10 space-y-2">
                        <div class="text-xs text-gamer-lightgray font-bold uppercase tracking-wider">ที่อยู่จัดส่ง:</div>
                        <div class="text-sm text-gamer-lightgray/80">${o.shipping_address ? o.shipping_address.replace(/\n/g, '<br>') : '-'}</div>
                    </div>

                    <div class="bg-gamer-gray/20 p-3 rounded-lg border border-gamer-teal/5">
                        <div class="text-xs text-gamer-lightgray font-bold uppercase tracking-wider mb-2">รายการสินค้า:</div>
                        <div class="space-y-1.5">
                            ${(o.items || []).map(item => `
                                <div class="flex justify-between text-xs text-gamer-lightgray/70">
                                    <span>• ${item.product_name || 'ไม่พบสินค้า'} x ${item.quantity}</span>
                                    <span class="text-white font-semibold">฿${Number(item.unit_price * item.quantity).toLocaleString()}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="flex justify-between items-center pt-2 border-t border-gamer-teal/10">
                        <span class="text-gamer-lightgray/50 text-sm">${o.items ? o.items.length + ' รายการ' : ''}</span>
                        <div class="flex items-center gap-3">
                            ${o.payment_slip_url ? `<a href="${o.payment_slip_url}" target="_blank" class="text-xs bg-gamer-teal/20 text-gamer-cyan px-2 py-1 rounded hover:bg-gamer-teal/40"><i class="fa-solid fa-file-invoice"></i> ดูสลิป</a>` : ''}
                            <span class="text-gamer-cyan font-bold text-lg">฿${Number(o.total_amount).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            list.innerHTML = '<p class="text-center text-gamer-lightgray/50 py-8">ไม่สามารถโหลดข้อมูลได้</p>';
        }
    }

    // --- อัปเดตสถานะคำสั่งซื้อ ---
    async function handleStatusChange(orderId, newStatus, oldStatus) {
        if (newStatus === 'shipped') {
            const courier = prompt('กรุณากรอกชื่อบริษัทขนส่ง (เช่น Kerry, Flash, J&T):');
            if (!courier) {
                document.getElementById(`status-select-${orderId}`).value = oldStatus;
                return;
            }
            const tracking = prompt('กรุณากรอกเลขพัสดุ (Tracking Number):');
            if (!tracking) {
                document.getElementById(`status-select-${orderId}`).value = oldStatus;
                return;
            }
            await updateOrderStatus(orderId, newStatus, tracking, courier);
        } else {
            await updateOrderStatus(orderId, newStatus);
        }
    }

    async function updateOrderStatus(orderId, status, tracking_number = null, shipping_courier = null) {
        try {
            const res = await fetch(`/api/orders/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, status, tracking_number, shipping_courier })
            });
            const json = await res.json();
            if (json.success) {
                alert('อัปเดตสถานะคำสั่งซื้อสำเร็จ');
                loadOrders(); // รีเฟรชตาราง
            } else {
                alert('อัปเดตไม่สำเร็จ: ' + json.message);
                loadOrders();
            }
        } catch (err) { console.error(err); }
    }

    // ================== Banners Management ==================
    async function loadBanners() {
        try {
            const res = await fetch('/api/banners?all=true');
            const json = await res.json();
            const table = document.getElementById('banners-table');
            if (json.data && json.data.length > 0) {
                table.innerHTML = json.data.map(b => `
                    <tr class="border-b border-gamer-teal/10 hover:bg-white/5 transition-colors">
                        <td class="py-3 px-4">
                            <img src="${b.image_url}" class="h-16 w-32 object-cover rounded border border-gamer-teal/30">
                        </td>
                        <td class="py-3 px-4 text-gamer-lightgray truncate max-w-[200px]">${b.link_url || '-'}</td>
                        <td class="py-3 px-4 text-center">
                            <button onclick="toggleBanner('${b.id}')" class="px-3 py-1 rounded text-xs font-bold ${b.is_active ? 'bg-gamer-green/20 text-gamer-green border border-gamer-green/50' : 'bg-gamer-gray text-gamer-lightgray border border-gamer-teal/30'}">
                                ${b.is_active ? 'เปิดใช้งาน' : 'ปิดการแสดงผล'}
                            </button>
                        </td>
                        <td class="py-3 px-4 text-center">
                            <button onclick="deleteBanner('${b.id}')" class="text-gamer-red hover:text-red-400 transition-colors" title="ลบ"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            } else {
                table.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-gamer-lightgray/50">ยังไม่มีข้อมูลแบนเนอร์</td></tr>';
            }
        } catch (err) {
            console.error(err);
        }
    }

    document.getElementById('add-banner-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('b-image').files[0];
        const link = document.getElementById('b-link').value;
        if (!file) return alert('กรุณาเลือกรูปภาพ');

        const formData = new FormData();
        formData.append('image', file);

        try {
            // Upload image first
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            const uploadJson = await uploadRes.json();
            if (!uploadJson.success) return alert(uploadJson.message);

            // Add banner to DB
            const res = await fetch('/api/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_url: uploadJson.url, link_url: link })
            });
            const json = await res.json();
            if (json.success) {
                alert('เพิ่มแบนเนอร์สำเร็จ');
                document.getElementById('add-banner-form').reset();
                loadBanners();
            } else {
                alert(json.message);
            }
        } catch (err) { console.error(err); }
    });

    document.getElementById('add-promo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('promo-code').value.toUpperCase();
        const type = document.getElementById('promo-type').value;
        const amount = document.getElementById('promo-amount').value;

        try {
            const res = await fetch('/api/admin/promocodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify({ code, discount_type: type, discount_value: amount })
            });
            const json = await res.json();
            if (json.success) {
                alert('สร้างโค้ดส่วนลดสำเร็จ');
                document.getElementById('add-promo-form').reset();
                loadPromoCodes();
            } else alert(json.message);
        } catch (err) { console.error(err); }
    });

    async function loadPromoCodes() {
        try {
            const res = await fetch('/api/admin/promocodes', {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const json = await res.json();
            const table = document.getElementById('promocodes-table');
            if (json.success && json.data.length > 0) {
                table.innerHTML = json.data.map(p => `
                    <tr class="border-b border-gamer-teal/10 hover:bg-gamer-teal/5 transition-colors">
                        <td class="py-3 px-4 font-bold text-gamer-cyan">${p.code}</td>
                        <td class="py-3 px-4">${p.discount_type === 'percent' ? p.discount_value + '%' : '฿' + p.discount_value}</td>
                        <td class="py-3 px-4">${p.discount_type === 'percent' ? 'เปอร์เซ็นต์' : 'เงินสด'}</td>
                        <td class="py-3 px-4 text-center">
                            <span class="px-2 py-1 rounded text-xs ${p.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                                ${p.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                            </span>
                        </td>
                        <td class="py-3 px-4 text-center space-x-2">
                            <button onclick="togglePromoStatus(${p.id}, ${!p.is_active})" class="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500 hover:text-black px-3 py-1 rounded transition-colors text-sm">
                                ${p.is_active ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                            </button>
                            <button onclick="deletePromo(${p.id})" class="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-black px-3 py-1 rounded transition-colors text-sm">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            } else {
                table.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-gamer-lightgray/50">ยังไม่มีโค้ดส่วนลด</td></tr>';
            }
        } catch (err) { console.error(err); }
    }

    window.togglePromoStatus = async (id, isActive) => {
        try {
            const res = await fetch(`/api/admin/promocodes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify({ is_active: isActive })
            });
            const json = await res.json();
            if (json.success) loadPromoCodes();
        } catch (err) { console.error(err); }
    };

    window.deletePromo = async (id) => {
        if (!confirm('ยืนยันการลบโค้ดส่วนลดนี้?')) return;
        try {
            const res = await fetch(`/api/admin/promocodes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const json = await res.json();
            if (json.success) loadPromoCodes();
        } catch (err) { console.error(err); }
    };

    initAdmin();

    async function toggleBanner(id) {
        try {
            await fetch(`/api/banners/${id}/toggle`, { method: 'PUT' });
            loadBanners();
        } catch (err) { console.error(err); }
    }

    async function deleteBanner(id) {
        if (!confirm('ยืนยันการลบแบนเนอร์นี้?')) return;
        try {
            await fetch(`/api/banners/${id}`, { method: 'DELETE' });
            loadBanners();
        } catch (err) { console.error(err); }
    }

    // ================== C2C Consignments Management ==================
    async function loadAdminConsignments() {
        try {
            const res = await fetch('/api/consignments/admin/all');
            const json = await res.json();
            const table = document.getElementById('consignments-table');
            if (json.data && json.data.length > 0) {
                table.innerHTML = json.data.map(p => {
                    let statusColor = 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
                    let statusText = 'รอตรวจสอบ';
                    if (p.status === 'approved') {
                        statusColor = 'text-gamer-green bg-gamer-green/10 border-gamer-green/20';
                        statusText = 'อนุมัติแล้ว';
                    } else if (p.status === 'rejected') {
                        statusColor = 'text-gamer-red bg-gamer-red/10 border-gamer-red/20';
                        statusText = 'ปฏิเสธ';
                    } else if (p.status === 'sold') {
                        statusColor = 'text-gamer-lightgray/50 bg-gamer-lightgray/5 border-gamer-lightgray/10';
                        statusText = 'ขายแล้ว';
                    }

                    let actionHtml = '';
                    if (p.status === 'pending') {
                        actionHtml = `
                            <button onclick="updateConsignmentStatus('${p.id}', 'approved')" class="bg-gamer-green/20 text-gamer-green border border-gamer-green/50 hover:bg-gamer-green hover:text-gamer-dark px-3 py-1 rounded text-xs font-bold mr-2 transition-all">อนุมัติ</button>
                            <button onclick="updateConsignmentStatus('${p.id}', 'rejected')" class="bg-gamer-red/20 text-gamer-red border border-gamer-red/50 hover:bg-gamer-red hover:text-white px-3 py-1 rounded text-xs font-bold transition-all">ปฏิเสธ</button>
                        `;
                    } else if (p.status === 'approved') {
                        actionHtml = `
                            <button onclick="updateConsignmentStatus('${p.id}', 'sold')" class="bg-gamer-teal/20 text-gamer-cyan border border-gamer-cyan/30 hover:bg-gamer-cyan hover:text-gamer-dark px-3 py-1 rounded text-xs font-bold transition-all">ทำเครื่องหมายขายแล้ว</button>
                        `;
                    } else {
                        actionHtml = '-';
                    }

                    return `
                        <tr class="border-b border-gamer-teal/10 hover:bg-white/5 transition-colors text-xs">
                            <td class="py-3 px-4 flex items-center gap-3">
                                ${p.image_url ? `<img src="${p.image_url}" class="h-10 w-10 object-cover rounded border border-gamer-teal/20">` : `<div class="h-10 w-10 bg-gamer-gray rounded border border-gamer-teal/10 flex items-center justify-center text-gamer-teal/40 text-xs font-bold"><i class="fa-solid fa-box"></i></div>`}
                                <div>
                                    <p class="font-bold text-white">${p.product_name}</p>
                                    <p class="text-[10px] text-gamer-lightgray/50">${p.category_name || 'ทั่วไป'}</p>
                                </div>
                            </td>
                            <td class="py-3 px-4">
                                <p class="text-white">${p.first_name} ${p.last_name}</p>
                                <p class="text-[10px] text-gamer-lightgray/50">${p.email}</p>
                            </td>
                            <td class="py-3 px-4 text-gamer-lightgray font-mono text-xs">${p.contact_info}</td>
                            <td class="py-3 px-4 font-bold text-white">฿${Number(p.price).toLocaleString()}</td>
                            <td class="py-3 px-4 text-center">
                                <span class="px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusColor}">${statusText}</span>
                            </td>
                            <td class="py-3 px-4 text-center">${actionHtml}</td>
                        </tr>
                    `;
                }).join('');
            } else {
                table.innerHTML = '<tr><td colspan="6" class="py-10 text-center text-gamer-lightgray/50">ไม่มีข้อมูลคำขอฝากขาย C2C</td></tr>';
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function updateConsignmentStatus(id, status) {
        if (!confirm(`ยืนยันการทำรายการเป็น "${status}"?`)) return;
        try {
            const res = await fetch(`/api/consignments/admin/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const json = await res.json();
            if (json.success) {
                showToast(`อัปเดตสถานะสำเร็จ!`);
                loadAdminConsignments();
            } else {
                alert(json.message);
            }
        } catch (err) {
            console.error(err);
        }
    }

    // --- โหลดข้อมูล Escrow Payouts ---
    async function loadEscrowPayouts() {
        const table = document.getElementById('escrow-tbody');
        table.innerHTML = '<tr><td colspan="6" class="py-10 text-center text-gamer-lightgray/50"><i class="fa-solid fa-spinner fa-spin mr-2"></i>กำลังโหลด...</td></tr>';
        
        try {
            const res = await fetch('/api/admin/escrow-payouts');
            const json = await res.json();
            
            if (json.success && json.data.length > 0) {
                table.innerHTML = json.data.map(p => {
                    let statusColor = 'text-gamer-lightgray';
                    let statusText = 'ไม่ระบุ';
                    let actionHtml = '';

                    if (p.escrow_status === 'holding') {
                        statusColor = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
                        statusText = 'ลูกค้าชำระเงินแล้ว (ระบบถือเงินไว้)';
                        if (p.order_status === 'delivered') {
                            actionHtml = `<button onclick="releaseEscrowFund('${p.id}')" class="bg-gamer-cyan text-gamer-dark hover:bg-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-[0_0_10px_rgba(102,252,241,0.3)]">โอนเงินให้ผู้ขาย</button>`;
                        } else {
                            actionHtml = `<span class="text-xs text-gamer-lightgray/50">รอผู้ซื้อกดยืนยันรับของ</span>`;
                        }
                    } else if (p.escrow_status === 'released_to_seller') {
                        statusColor = 'bg-green-500/20 text-green-400 border-green-500/30';
                        statusText = 'โอนเงินให้ผู้ขายแล้ว';
                        actionHtml = `<i class="fa-solid fa-check text-green-400"></i>`;
                    }

                    return `
                        <tr class="border-b border-gamer-teal/10 hover:bg-white/5 transition-colors">
                            <td class="py-3 px-4 font-mono text-xs text-gamer-lightgray/80">${p.id}</td>
                            <td class="py-3 px-4 text-white font-bold">${p.product_name}</td>
                            <td class="py-3 px-4 font-gaming text-gamer-cyan font-bold text-lg">฿${Number(p.price).toLocaleString()}</td>
                            <td class="py-3 px-4">
                                <p class="text-white text-xs">${p.first_name} ${p.last_name}</p>
                                <p class="text-[10px] text-gamer-lightgray/50">${p.bank_name || '-'} / ${p.bank_account_no || '-'}</p>
                            </td>
                            <td class="py-3 px-4 text-center">
                                <span class="px-2 py-0.5 rounded border text-xs font-bold ${statusColor}">${statusText}</span>
                            </td>
                            <td class="py-3 px-4 text-center">${actionHtml}</td>
                        </tr>
                    `;
                }).join('');
            } else {
                table.innerHTML = '<tr><td colspan="6" class="py-10 text-center text-gamer-lightgray/50">ไม่มีข้อมูล Escrow ที่ต้องจัดการ</td></tr>';
            }
        } catch (err) {
            console.error(err);
            table.innerHTML = '<tr><td colspan="6" class="py-10 text-center text-gamer-red/50">เกิดข้อผิดพลาดในการโหลด</td></tr>';
        }
    }

    async function releaseEscrowFund(id) {
        if (!confirm('ยืนยันว่าคุณได้โอนเงินเข้าบัญชีผู้ขายเรียบร้อยแล้วใช่หรือไม่?\nหากยืนยัน สถานะจะเปลี่ยนเป็น "โอนเงินให้ผู้ขายแล้ว"')) return;
        
        try {
            const res = await fetch(`/api/admin/escrow-payouts/${id}/release`, { method: 'PUT' });
            const json = await res.json();
            if (json.success) {
                showToast('อัปเดตสถานะการโอนเงินสำเร็จ!');
                loadEscrowPayouts();
            } else {
                alert('เกิดข้อผิดพลาด: ' + json.message);
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด');
        }
    }

    // --- โหลดข้อมูลลูกค้า (Users) ---
    async function loadUsers() {
        const tbody = document.getElementById('users-table');
        const summary = document.getElementById('users-summary');
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gamer-lightgray/50"><i class="fa-solid fa-spinner fa-spin mr-2"></i>กำลังโหลด...</td></tr>';
        summary.textContent = '';
        
        try {
            const res = await fetch('/api/users/all');
            const json = await res.json();
            
            if (!json.success || json.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gamer-lightgray/50">ยังไม่มีผู้ใช้ในระบบ</td></tr>';
                return;
            }
            
            summary.textContent = `ผู้ใช้ทั้งหมด: ${json.data.length} คน`;
            
            tbody.innerHTML = json.data.map(u => `
                <tr class="border-b border-gamer-teal/10 hover:bg-white/5">
                    <td class="py-3 px-4 text-white font-medium">
                        ${u.first_name || ''} ${u.last_name || ''}
                        ${u.kyc_status === 'verified' ? '<i class="fa-solid fa-circle-check text-green-400 ml-1" title="ยืนยันตัวตนแล้ว"></i>' : ''}
                        ${u.role === 'admin' ? '<span class="bg-gamer-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded ml-2">ADMIN</span>' : ''}
                    </td>
                    <td class="py-3 px-4 text-gamer-teal">${u.email}</td>
                    <td class="py-3 px-4 text-center text-gamer-lightgray/70">${new Date(u.created_at).toLocaleDateString('th-TH')}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2 py-1 rounded-full text-xs font-bold ${u.total_orders > 0 ? 'bg-gamer-cyan/10 text-gamer-cyan' : 'bg-gray-500/10 text-gray-400'}">
                            ${u.total_orders} ครั้ง
                        </span>
                    </td>
                    <td class="py-3 px-4 text-right text-white font-bold">฿${Number(u.total_spent).toLocaleString()}</td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gamer-red/50">ไม่สามารถโหลดข้อมูลผู้ใช้ได้</td></tr>';
        }
    }

    // --- โหลดคำขอ KYC ---
    async function loadKycRequests() {
        const tbody = document.getElementById('kyc-table');
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gamer-lightgray/50"><i class="fa-solid fa-spinner fa-spin mr-2"></i>กำลังโหลด...</td></tr>';
        
        try {
            const res = await fetch('/api/admin/kyc-requests');
            const json = await res.json();
            
            if (!json.success || json.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gamer-lightgray/50">ไม่มีคำขอที่รอการอนุมัติ</td></tr>';
                return;
            }

            tbody.innerHTML = json.data.map(k => `
                <tr class="border-b border-gamer-teal/10 hover:bg-white/5">
                    <td class="py-3 px-4 text-gamer-lightgray text-xs">${new Date(k.updated_at).toLocaleString('th-TH')}</td>
                    <td class="py-3 px-4">
                        <p class="text-white font-bold">${k.first_name} ${k.last_name}</p>
                        <p class="text-[10px] text-gamer-teal">${k.email}</p>
                    </td>
                    <td class="py-3 px-4 text-xs">
                        <p class="text-gamer-lightgray/80">ธนาคาร: <span class="text-white">${k.bank_name}</span></p>
                        <p class="text-gamer-lightgray/80">ชื่อบัญชี: <span class="text-white">${k.bank_account_name}</span></p>
                        <p class="text-gamer-lightgray/80 font-mono">เลขที่บัญชี: <span class="text-gamer-cyan">${k.bank_account_no}</span></p>
                    </td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex gap-2 justify-center">
                            <a href="${k.id_card_url}" target="_blank" class="text-gamer-cyan hover:underline text-xs bg-gamer-teal/10 px-2 py-1 rounded"><i class="fa-solid fa-image"></i> บัตร ปชช.</a>
                            <a href="${k.bank_passbook_url}" target="_blank" class="text-gamer-cyan hover:underline text-xs bg-gamer-teal/10 px-2 py-1 rounded"><i class="fa-solid fa-image"></i> หน้าสมุดบัญชี</a>
                        </div>
                    </td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex gap-2 justify-center">
                            <button onclick="updateKycStatus('${k.id}', 'verified')" class="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white px-3 py-1 rounded transition-colors text-xs font-bold"><i class="fa-solid fa-check"></i> อนุมัติ</button>
                            <button onclick="updateKycStatus('${k.id}', 'rejected')" class="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1 rounded transition-colors text-xs font-bold"><i class="fa-solid fa-xmark"></i> ไม่อนุมัติ</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gamer-red/50">เกิดข้อผิดพลาดในการโหลดข้อมูล KYC</td></tr>';
        }
    }

    async function updateKycStatus(userId, status) {
        if (!confirm(`ยืนยันการทำรายการเป็น "${status === 'verified' ? 'อนุมัติ' : 'ไม่อนุมัติ'}" ใช่หรือไม่?`)) return;
        
        try {
            const res = await fetch(`/api/admin/kyc/${userId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const json = await res.json();
            if (json.success) {
                showToast('อัปเดตสถานะ KYC สำเร็จ');
                loadKycRequests();
            } else {
                alert('เกิดข้อผิดพลาด: ' + json.message);
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด');
        }
    }

    // --- โหลดแดชบอร์ด (Dashboard) ---
    let salesChartInstance = null;
    let topProductsChartInstance = null;

    async function loadDashboard() {
        try {
            const res = await fetch('/api/admin/analytics');
            const json = await res.json();
            if (!json.success) return;

            const { summary, salesByDay, topProducts } = json.data;

            // อัปเดต Summary
            document.getElementById('dash-revenue').textContent = '฿' + Number(summary.totalRevenue).toLocaleString();
            document.getElementById('dash-orders').textContent = summary.totalOrders;
            document.getElementById('dash-users').textContent = summary.totalUsers;

            // สร้างกราฟยอดขาย
            const ctxSales = document.getElementById('salesChart').getContext('2d');
            if (salesChartInstance) salesChartInstance.destroy();
            salesChartInstance = new Chart(ctxSales, {
                type: 'line',
                data: {
                    labels: salesByDay.map(d => new Date(d.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })),
                    datasets: [{
                        label: 'ยอดขาย (บาท)',
                        data: salesByDay.map(d => d.revenue),
                        borderColor: '#66FCF1',
                        backgroundColor: 'rgba(102, 252, 241, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#C5C6C7' } },
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#C5C6C7' } }
                    }
                }
            });

            // สร้างกราฟสินค้าขายดี
            const ctxTop = document.getElementById('topProductsChart').getContext('2d');
            if (topProductsChartInstance) topProductsChartInstance.destroy();
            topProductsChartInstance = new Chart(ctxTop, {
                type: 'bar',
                data: {
                    labels: topProducts.map(p => p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name),
                    datasets: [{
                        label: 'จำนวนที่ขายได้',
                        data: topProducts.map(p => p.sold_qty),
                        backgroundColor: '#45A29E',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#C5C6C7', stepSize: 1 } },
                        x: { grid: { display: false }, ticks: { color: '#C5C6C7' } }
                    }
                }
            });

        } catch (err) {
            console.error('Error loading dashboard:', err);
        }
    }

    // --- Live Chat Logic (Admin) ---
    let activeChatUser = null; // userId
    const chatUsers = {}; // { userId: { name, messages: [], unreadCount: 0, online: false } }

    function updateBadges() {
        globalUnreadCount = Object.values(chatUsers).reduce((sum, u) => sum + (u.unreadCount || 0), 0);
        const badge = document.getElementById('chat-badge');
        if (badge) {
            if (globalUnreadCount > 0) {
                badge.textContent = globalUnreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    async function loadChatUsers() {
        try {
            const res = await fetch('/api/chat/users');
            const json = await res.json();
            if (json.success) {
                json.data.forEach(u => {
                    if (!chatUsers[u.user_id]) {
                        chatUsers[u.user_id] = { name: u.name, messages: [], unreadCount: 0, online: false };
                    } else {
                        chatUsers[u.user_id].name = u.name;
                    }
                });
                renderChatUsers();
            }
        } catch (err) {
            console.error('Error loading chat users:', err);
        }
    }

    function initAdminChat() {
        if (typeof io === 'undefined') return;
        const socket = io();

        socket.emit('join_admin');

        // เมื่อผู้ใช้ออนไลน์
        socket.on('user_online', (data) => {
            const { userId, name } = data;
            if (!chatUsers[userId]) {
                chatUsers[userId] = { name, messages: [], unreadCount: 0, online: true };
            } else {
                chatUsers[userId].online = true;
            }
            renderChatUsers();
        });

        // เมื่อผู้ใช้ออฟไลน์
        socket.on('user_offline', (data) => {
            const { userId } = data;
            if (chatUsers[userId]) {
                chatUsers[userId].online = false;
            }
            renderChatUsers();
        });

        // เมื่อมีข้อความใหม่เข้ามา
        socket.on('new_user_message', (data) => {
            const { userId, text, name, time } = data;
            
            if (!chatUsers[userId]) {
                chatUsers[userId] = { name, messages: [], unreadCount: 0, online: true };
            }
            
            chatUsers[userId].messages.push({ sender: 'user', text, time });
            
            const isChatTabHidden = document.getElementById('panel-chat').classList.contains('hidden');
            const isInactiveChat = activeChatUser !== userId;
            
            if (isInactiveChat || isChatTabHidden) {
                chatUsers[userId].unreadCount = (chatUsers[userId].unreadCount || 0) + 1;
                updateBadges();
                
                showToast(`💬 ข้อความใหม่จากคุณ ${name}: "${text}"`);
                
                if (typeof playSuccessSound === 'function') {
                    playSuccessSound();
                }
            } else {
                if (typeof playHoverSound === 'function') {
                    playHoverSound();
                }
            }
            
            renderChatUsers();
            
            if (activeChatUser === userId) {
                renderChatMessages();
            }
        });

        socket.on('low_stock_alert', (data) => {
            alert(`⚠️ แจ้งเตือนสต๊อกต่ำ!\nสินค้า: ${data.product_name}\nเหลือเพียง: ${data.stock_quantity} ชิ้น`);
            showToast(`แจ้งเตือน: ${data.product_name} ใกล้หมดแล้ว!`);
        });

        window.sendAdminReply = () => {
            if (!activeChatUser) return;
            const input = document.getElementById('admin-chat-input');
            const text = input.value.trim();
            if (!text) return;

            socket.emit('admin_reply', { toUserId: activeChatUser, text });
            
            chatUsers[activeChatUser].messages.push({ sender: 'admin', text, time: new Date() });
            input.value = '';
            renderChatMessages();
        };

        document.getElementById('admin-chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                sendAdminReply();
            }
        });

        window.selectChatUser = async (userId) => {
            activeChatUser = userId;
            if (chatUsers[userId]) {
                chatUsers[userId].unreadCount = 0;
            }
            updateBadges();
            
            document.getElementById('admin-chat-input').disabled = false;
            document.getElementById('admin-chat-send-btn').disabled = false;

            // โหลดประวัติแชทลูกค้าจาก API
            const messagesContainer = document.getElementById('admin-chat-messages');
            messagesContainer.innerHTML = '<p class="text-gamer-lightgray/50 text-center text-xs my-4">กำลังโหลดประวัติแชท...</p>';
            try {
                const res = await fetch(`/api/chat/history-admin/${userId}`);
                const json = await res.json();
                if (json.success) {
                    chatUsers[userId].messages = json.data.map(m => ({
                        sender: m.sender_type,
                        text: m.message,
                        time: m.created_at
                    }));
                }
            } catch (err) {
                console.error('Error fetching chat history:', err);
            }
            
            renderChatUsers();
            renderChatMessages();
        };

        function renderChatUsers() {
            const container = document.getElementById('admin-chat-users');
            if (Object.keys(chatUsers).length === 0) {
                container.innerHTML = '<p class="text-gamer-lightgray/50 text-center text-sm mt-4">ไม่มีแชทที่กำลังสนทนา</p>';
                return;
            }
            container.innerHTML = Object.keys(chatUsers).map(uid => {
                const u = chatUsers[uid];
                const unreadBadge = u.unreadCount > 0 
                    ? `<span class="bg-gamer-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto animate-pulse">${u.unreadCount}</span>` 
                    : '';
                const onlineDot = u.online 
                    ? `<span class="w-2.5 h-2.5 rounded-full bg-green-500 inline-block mr-2" title="ออนไลน์"></span>` 
                    : `<span class="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block mr-2" title="ออฟไลน์"></span>`;
                return `
                    <div id="chat-user-${uid}" onclick="selectChatUser('${uid}')" class="p-3 rounded-xl cursor-pointer transition-colors border-2 flex items-center justify-between ${activeChatUser === uid ? 'bg-gamer-teal/20 border-gamer-teal' : 'bg-gamer-gray border-transparent hover:bg-gamer-teal/10'}">
                        <p class="text-white font-bold text-sm truncate flex-grow flex items-center">
                            ${onlineDot}
                            <span class="truncate">${u.name}</span>
                        </p>
                        ${unreadBadge}
                    </div>
                `;
            }).join('');
        }

        function renderChatMessages() {
            const container = document.getElementById('admin-chat-messages');
            if (!activeChatUser || !chatUsers[activeChatUser]) return;
            
            const msgs = chatUsers[activeChatUser].messages;
            container.innerHTML = msgs.map(m => {
                if (m.sender === 'system') return `<p class="text-gamer-lightgray/50 text-center text-xs my-2">${m.text}</p>`;
                const isMe = m.sender === 'admin';
                return `
                    <div class="${isMe ? 'bg-gamer-teal/20 text-white self-end ml-auto rounded-tr-none border-gamer-teal/30' : 'bg-gamer-cyan/10 text-white self-start mr-auto rounded-tl-none border-gamer-cyan/30'} text-sm p-3 rounded-xl max-w-[85%] border w-fit mb-2">
                        ${m.text}
                    </div>
                `;
            }).join('');
            container.scrollTop = container.scrollHeight;
        }
    }

    loadCategories();
    loadProducts();
    
    // Default Tab
    showTab('dashboard');
    