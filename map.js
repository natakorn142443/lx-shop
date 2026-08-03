// map.js
document.addEventListener('DOMContentLoaded', () => {
    // Only show on larger screens to avoid cluttering mobile
    if (window.innerWidth < 768) return;

    const mapHtml = `
        <div id="live-map-container" class="fixed bottom-6 left-6 w-56 h-56 bg-gamer-dark/80 backdrop-blur-md border border-gamer-teal/30 rounded-2xl overflow-hidden z-[90] shadow-[0_0_30px_rgba(102,252,241,0.15)] group transition-all hover:border-gamer-cyan/50">
            <!-- Simulated Radar / Map Background -->
            <div class="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/4/4b/Thailand_location_map.svg')] bg-contain bg-center bg-no-repeat filter invert"></div>
            
            <div class="absolute inset-0 bg-gradient-to-t from-gamer-dark to-transparent z-10 pointer-events-none"></div>
            
            <div class="absolute top-3 left-4 z-20 flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_#ef4444]"></div>
                <span class="text-xs text-gamer-lightgray font-bold tracking-widest uppercase font-gaming">Live Orders</span>
            </div>

            <!-- Ping Container -->
            <div id="map-pings" class="absolute inset-0 z-30"></div>
            
            <!-- Tooltip Overlay -->
            <div id="map-tooltip" class="absolute bottom-3 left-3 right-3 bg-gamer-dark border border-gamer-cyan/30 text-white text-[11px] p-2 rounded-lg backdrop-blur-sm opacity-0 transition-opacity duration-500 z-40 truncate shadow-[0_0_10px_rgba(102,252,241,0.2)]">
            </div>
            
            <!-- Radar sweep effect -->
            <div class="absolute inset-0 w-[200%] h-[200%] border-r-2 border-gamer-cyan/20 z-0 origin-bottom-left animate-[spin_4s_linear_infinite]" style="top: -50%; left: -50%;"></div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', mapHtml);

    const pingsContainer = document.getElementById('map-pings');
    const tooltip = document.getElementById('map-tooltip');
    
    const locations = [
        { name: 'กรุงเทพฯ', top: '65%', left: '48%' },
        { name: 'เชียงใหม่', top: '25%', left: '30%' },
        { name: 'ภูเก็ต', top: '85%', left: '20%' },
        { name: 'ขอนแก่น', top: '40%', left: '60%' },
        { name: 'ชลบุรี', top: '68%', left: '55%' },
        { name: 'โคราช', top: '45%', left: '55%' },
        { name: 'หาดใหญ่', top: '90%', left: '30%' }
    ];

    const products = ['RTX 4090', 'Ryzen 7 7800X3D', 'Logitech G Pro X', 'Razer DeathAdder', 'ASUS ROG Monitor', 'Corsair 32GB DDR5', 'NZXT Kraken'];

    function createPing() {
        const loc = locations[Math.floor(Math.random() * locations.length)];
        const prod = products[Math.floor(Math.random() * products.length)];

        // Create Ping Element
        const ping = document.createElement('div');
        ping.className = 'absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300';
        ping.style.top = loc.top;
        ping.style.left = loc.left;
        
        const dot = document.createElement('div');
        dot.className = 'w-2 h-2 rounded-full bg-gamer-cyan shadow-[0_0_10px_#66FCF1]';
        
        const ripple = document.createElement('div');
        ripple.className = 'absolute w-12 h-12 rounded-full border-2 border-gamer-cyan animate-[ping_1.5s_ease-out_infinite] opacity-50';
        
        ping.appendChild(ripple);
        ping.appendChild(dot);
        pingsContainer.appendChild(ping);

        // Show Tooltip
        tooltip.innerHTML = `📍 <b>${loc.name}</b><br>เพิ่งสั่งซื้อ <span class="text-gamer-cyan font-bold">${prod}</span>`;
        tooltip.classList.remove('opacity-0');

        setTimeout(() => {
            ping.classList.add('scale-0', 'opacity-0');
            setTimeout(() => ping.remove(), 300);
            tooltip.classList.add('opacity-0');
        }, 4000);
    }

    // Start simulation
    setTimeout(() => {
        createPing();
        setInterval(createPing, 9000 + Math.random() * 6000);
    }, 3000);
});
