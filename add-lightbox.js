const fs = require('fs');
let content = fs.readFileSync('product.html', 'utf8');

// Update image tag
content = content.replace(
    '<img id="product-image" src="" alt="" class="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-500">',
    '<img id="product-image" src="" alt="" onclick="openLightbox()" class="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-500 cursor-pointer" title="คลิกเพื่อขยายภาพ">'
);

// Add Lightbox HTML and JS before </body>
const lightboxHTML = `
    <!-- Lightbox Overlay -->
    <div id="lightbox-overlay" class="fixed inset-0 bg-[#0B0C10]/95 backdrop-blur-xl z-[100] hidden flex-col items-center justify-center opacity-0 transition-opacity duration-300">
        <button onclick="closeLightbox()" class="absolute top-6 right-6 text-white hover:text-gamer-cyan text-4xl bg-gamer-gray/50 w-14 h-14 rounded-full flex items-center justify-center transition-colors">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <img id="lightbox-image" src="" alt="" class="max-w-[90%] max-h-[90%] object-contain drop-shadow-[0_0_30px_rgba(102,252,241,0.3)] transform scale-95 transition-transform duration-300">
    </div>

    <script>
        function openLightbox() {
            const overlay = document.getElementById('lightbox-overlay');
            const img = document.getElementById('lightbox-image');
            img.src = document.getElementById('product-image').src;
            overlay.classList.remove('hidden');
            // Trigger reflow
            void overlay.offsetWidth;
            overlay.classList.remove('opacity-0');
            img.classList.remove('scale-95');
            img.classList.add('scale-100');
        }

        function closeLightbox() {
            const overlay = document.getElementById('lightbox-overlay');
            const img = document.getElementById('lightbox-image');
            overlay.classList.add('opacity-0');
            img.classList.remove('scale-100');
            img.classList.add('scale-95');
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 300);
        }
    </script>
</body>`;

if (!content.includes('id="lightbox-overlay"')) {
    content = content.replace('</body>', lightboxHTML);
    fs.writeFileSync('product.html', content);
    console.log('Added Lightbox');
}
