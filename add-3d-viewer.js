const fs = require('fs');
let content = fs.readFileSync('product.html', 'utf8');

const htmlToInject = `
    <!-- 3D Viewer Modal -->
    <div id="viewer-3d-overlay" class="fixed inset-0 bg-[#0B0C10]/95 backdrop-blur-xl z-[100] hidden flex-col items-center justify-center opacity-0 transition-opacity duration-300 perspective-1000">
        <button onclick="close3DViewer()" class="absolute top-6 right-6 text-white hover:text-gamer-cyan text-4xl bg-gamer-gray/50 w-14 h-14 rounded-full flex items-center justify-center transition-colors z-50">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <h3 class="absolute top-8 left-8 font-gaming text-3xl font-bold text-gamer-cyan drop-shadow-[0_0_10px_rgba(102,252,241,0.5)] z-50"><i class="fa-solid fa-cube"></i> 3D Hologram Simulator</h3>
        <p class="absolute bottom-8 text-gamer-lightgray animate-pulse z-50">ใช้เมาส์ลากเพื่อหมุนดูรอบทิศทาง</p>
        
        <!-- 3D Container -->
        <div id="viewer-3d-container" class="relative w-64 h-64 sm:w-96 sm:h-96 transform-style-3d cursor-move mt-10">
            <!-- Box Faces -->
            <div class="absolute inset-0 border-2 border-gamer-cyan/50 bg-gamer-gray/80 backdrop-blur-sm flex items-center justify-center face-front shadow-[0_0_30px_rgba(102,252,241,0.2)]">
                <img src="" class="product-3d-img w-3/4 h-3/4 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            </div>
            <div class="absolute inset-0 border-2 border-gamer-teal/50 bg-gamer-dark/90 flex items-center justify-center face-back shadow-[0_0_30px_rgba(69,162,158,0.2)]">
                <div class="text-gamer-cyan font-gaming text-4xl font-bold opacity-30 tracking-widest transform rotate-y-180">LX SHOP</div>
            </div>
            <div class="absolute inset-0 border-2 border-gamer-cyan/50 bg-gamer-gray/80 flex items-center justify-center face-right">
                <img src="" class="product-3d-img w-3/4 h-3/4 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            </div>
            <div class="absolute inset-0 border-2 border-gamer-teal/50 bg-gamer-dark/90 flex items-center justify-center face-left">
                <img src="" class="product-3d-img w-3/4 h-3/4 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            </div>
            <div class="absolute inset-0 border-2 border-gamer-cyan/50 bg-gamer-dark/80 flex items-center justify-center face-top"></div>
            <div class="absolute inset-0 border-2 border-gamer-teal/50 bg-gamer-dark/80 flex items-center justify-center face-bottom shadow-[0_50px_100px_rgba(102,252,241,0.4)]"></div>
        </div>
    </div>

    <style>
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; transition: transform 0.1s ease-out; }
        .face-front  { transform: rotateY(  0deg) translateZ(12rem); }
        .face-back   { transform: rotateY(180deg) translateZ(12rem); }
        .face-right  { transform: rotateY( 90deg) translateZ(12rem); }
        .face-left   { transform: rotateY(-90deg) translateZ(12rem); }
        .face-top    { transform: rotateX( 90deg) translateZ(12rem); }
        .face-bottom { transform: rotateX(-90deg) translateZ(12rem); }
        @media (max-width: 640px) {
            .face-front  { transform: rotateY(  0deg) translateZ(8rem); }
            .face-back   { transform: rotateY(180deg) translateZ(8rem); }
            .face-right  { transform: rotateY( 90deg) translateZ(8rem); }
            .face-left   { transform: rotateY(-90deg) translateZ(8rem); }
            .face-top    { transform: rotateX( 90deg) translateZ(8rem); }
            .face-bottom { transform: rotateX(-90deg) translateZ(8rem); }
        }
        .anim-spin-3d {
            animation: spin3D 10s linear infinite;
        }
        @keyframes spin3D {
            from { transform: rotateX(-10deg) rotateY(0deg); }
            to { transform: rotateX(-10deg) rotateY(360deg); }
        }
    </style>

    <script>
        let isDragging3D = false;
        let startX, startY;
        let currentX = -10, currentY = 0;
        const container3D = document.getElementById('viewer-3d-container');

        function open3DViewer() {
            const overlay = document.getElementById('viewer-3d-overlay');
            const imgSrc = document.getElementById('product-image').src;
            
            document.querySelectorAll('.product-3d-img').forEach(img => img.src = imgSrc);
            
            overlay.classList.remove('hidden');
            void overlay.offsetWidth;
            overlay.classList.remove('opacity-0');
            
            // Auto spin initially
            container3D.classList.add('anim-spin-3d');
            currentX = -10; currentY = 0;
            container3D.style.transform = '';
        }

        function close3DViewer() {
            const overlay = document.getElementById('viewer-3d-overlay');
            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.classList.add('hidden'), 300);
            container3D.classList.remove('anim-spin-3d');
        }

        // Mouse Drag to Rotate 3D Model
        document.getElementById('viewer-3d-overlay').addEventListener('mousedown', (e) => {
            if(e.target.closest('button')) return;
            isDragging3D = true;
            startX = e.clientX;
            startY = e.clientY;
            container3D.classList.remove('anim-spin-3d');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging3D) return;
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            currentY += deltaX * 0.5;
            currentX -= deltaY * 0.5;
            
            // Limit X rotation
            if(currentX > 80) currentX = 80;
            if(currentX < -80) currentX = -80;

            container3D.style.transform = \`rotateX(\${currentX}deg) rotateY(\${currentY}deg)\`;
            
            startX = e.clientX;
            startY = e.clientY;
        });

        document.addEventListener('mouseup', () => { isDragging3D = false; });
    </script>
`;

if (!content.includes('viewer-3d-overlay')) {
    content = content.replace('</body>', htmlToInject + '\n</body>');
    fs.writeFileSync('product.html', content);
    console.log('Added 3D Viewer to product.html');
}
