// fomo.js - ระบบกระตุ้นการตัดสินใจ (Fear Of Missing Out)

document.addEventListener('DOMContentLoaded', () => {
    // Inject FOMO container
    const containerHTML = `
        <div id="fomo-container" class="fixed bottom-24 left-6 z-40 flex flex-col gap-3 pointer-events-none"></div>
    `;
    document.body.insertAdjacentHTML('beforeend', containerHTML);

    const names = ['สมชาย', 'สมหญิง', 'Kittisak', 'Apirak', 'Waraporn', 'Jirayut', 'Piyawat', 'Nattapong', 'Nadia', 'Bank', 'Max', 'Gamer123'];
    const products = ['RTX 4090 24GB', 'i9-14900K', 'RAM 32GB DDR5', 'SSD 2TB M.2', 'RX 7900 XTX', 'Monitor 240Hz', 'Ryzen 7 7800X3D'];
    const actions = [
        (name, product) => `<i class="fa-solid fa-cart-shopping text-gamer-cyan"></i> <b>${name}</b> เพิ่งสั่งซื้อ ${product}`,
        (name, product) => `<i class="fa-solid fa-fire text-gamer-red"></i> <b>${name}</b> เพิ่ม ${product} ลงในตะกร้า`,
        (name, product) => `<i class="fa-solid fa-eye text-yellow-400"></i> ตอนนี้มีคนกำลังดู ${product} <b>${Math.floor(Math.random() * 15) + 3} คน</b>`
    ];

    function showFOMO() {
        // Random chance to not show anything this tick
        if (Math.random() > 0.7) return;

        const name = names[Math.floor(Math.random() * names.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        const action = actions[Math.floor(Math.random() * actions.length)](name, product);

        const fomoContainer = document.getElementById('fomo-container');
        
        const el = document.createElement('div');
        el.className = 'bg-[#0B0C10]/95 backdrop-blur-md border border-gamer-teal/30 text-white text-xs sm:text-sm px-4 py-3 rounded-xl shadow-[0_0_15px_rgba(69,162,158,0.2)] transform -translate-x-full opacity-0 transition-all duration-500 flex items-center gap-3 w-max max-w-[250px] sm:max-w-xs';
        el.innerHTML = action;

        fomoContainer.appendChild(el);

        // Slide in
        setTimeout(() => {
            el.classList.remove('-translate-x-full', 'opacity-0');
        }, 100);

        // Fade out and remove
        setTimeout(() => {
            el.classList.add('opacity-0', 'translate-y-4');
            setTimeout(() => el.remove(), 500);
        }, 5000);
    }

    // Start random intervals
    setTimeout(() => {
        showFOMO();
        setInterval(showFOMO, Math.floor(Math.random() * 10000) + 15000); // Every 15-25 seconds
    }, 3000); // Initial delay
});
