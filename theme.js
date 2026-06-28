// theme.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Theme Style
    const style = document.createElement('style');
    style.innerHTML = `
        /* --- Light Mode (Creator White) --- */
        body.theme-light {
            background-color: #f3f4f6 !important;
            color: #1f2937 !important;
        }
        body.theme-light .bg-gamer-dark, body.theme-light .bg-\\[\\#050608\\] { background-color: #ffffff !important; }
        body.theme-light .bg-gamer-gray { background-color: #f9fafb !important; }
        body.theme-light .text-white { color: #111827 !important; }
        body.theme-light .text-gamer-lightgray, body.theme-light .text-gamer-lightgray\\/50, body.theme-light .text-gamer-lightgray\\/70 { color: #4b5563 !important; }
        body.theme-light .border-gamer-teal\\/10, body.theme-light .border-gamer-teal\\/20, body.theme-light .border-gamer-teal\\/30 { border-color: #e5e7eb !important; }
        
        body.theme-light .bg-gamer-cyan { background-color: #2563eb !important; color: #ffffff !important; }
        body.theme-light .text-gamer-cyan { color: #2563eb !important; }
        body.theme-light .border-gamer-cyan, body.theme-light .border-gamer-cyan\\/50 { border-color: #2563eb !important; }
        body.theme-light .hover\\:bg-gamer-cyan:hover { background-color: #1d4ed8 !important; color: #ffffff !important; }
        body.theme-light .hover\\:text-gamer-cyan:hover { color: #2563eb !important; }
        body.theme-light .hover\\:border-gamer-cyan:hover { border-color: #2563eb !important; }
        
        body.theme-light .shadow-\\[0_0_15px_rgba\\(102\\,252\\,241\\,0\\.2\\)\\] { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) !important; }
        
        body.theme-light input, body.theme-light select, body.theme-light textarea {
            background-color: #ffffff !important;
            color: #1f2937 !important;
            border-color: #d1d5db !important;
        }

        /* --- Cyberpunk Mode --- */
        body.theme-cyberpunk {
            background-color: #0b0213 !important; /* Deep Purple */
            color: #e0e0e0 !important;
        }
        body.theme-cyberpunk .bg-gamer-dark, body.theme-cyberpunk .bg-\\[\\#050608\\] { background-color: #120422 !important; }
        body.theme-cyberpunk .bg-gamer-gray { background-color: #1b0a33 !important; }
        
        /* Replace Cyan with Neon Pink */
        body.theme-cyberpunk .bg-gamer-cyan { background-color: #ff0055 !important; color: #ffffff !important; box-shadow: 0 0 10px #ff0055 !important; }
        body.theme-cyberpunk .text-gamer-cyan { color: #ff0055 !important; text-shadow: 0 0 5px rgba(255,0,85,0.5) !important; }
        body.theme-cyberpunk .border-gamer-cyan, body.theme-cyberpunk .border-gamer-cyan\\/50 { border-color: #ff0055 !important; }
        body.theme-cyberpunk .hover\\:bg-gamer-cyan:hover { background-color: #ff3377 !important; color: #ffffff !important; box-shadow: 0 0 20px #ff3377 !important; }
        body.theme-cyberpunk .hover\\:text-gamer-cyan:hover { color: #ff0055 !important; }
        body.theme-cyberpunk .hover\\:border-gamer-cyan:hover { border-color: #ff0055 !important; }
        
        /* Replace Teal with Neon Green/Yellow */
        body.theme-cyberpunk .text-gamer-teal { color: #00ffcc !important; }
        body.theme-cyberpunk .border-gamer-teal\\/10, body.theme-cyberpunk .border-gamer-teal\\/20, body.theme-cyberpunk .border-gamer-teal\\/30 { border-color: rgba(0,255,204,0.3) !important; }
        
        body.theme-cyberpunk .shadow-\\[0_0_15px_rgba\\(102\\,252\\,241\\,0\\.2\\)\\] { box-shadow: 0 0 15px rgba(255,0,85,0.4) !important; }
        
        /* Cyberpunk Font overrides */
        body.theme-cyberpunk .font-gaming { font-family: 'Courier New', Courier, monospace !important; letter-spacing: 0.1em; }

        /* Hide HTML5 Up/Down Spinners */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
            -webkit-appearance: none !important; 
            margin: 0 !important; 
        }
        input[type=number] { 
            -moz-appearance: textfield !important; 
        }
    `;
    document.head.appendChild(style);

    // 2. Load Theme
    let currentTheme = localStorage.getItem('lx_theme_v2') || 'dark';
    
    // Fallback logic for old lx_theme
    if(localStorage.getItem('lx_theme') === 'light' && !localStorage.getItem('lx_theme_v2')) {
        currentTheme = 'light';
    }

    const themes = ['dark', 'light', 'cyberpunk'];
    
    function applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-cyberpunk');
        if (theme !== 'dark') {
            document.body.classList.add(`theme-${theme}`);
        }
        localStorage.setItem('lx_theme_v2', theme);
        currentTheme = theme;
        updateToggleIcons();
    }

    applyTheme(currentTheme);

    // 3. Setup Toggles (Cycle through themes)
    function updateToggleIcons() {
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            if (currentTheme === 'dark') {
                btn.innerHTML = '<i class="fa-solid fa-moon text-gamer-cyan"></i>';
                btn.title = "Gamer Dark";
            } else if (currentTheme === 'light') {
                btn.innerHTML = '<i class="fa-solid fa-sun text-yellow-500"></i>';
                btn.title = "Creator White";
            } else {
                btn.innerHTML = '<i class="fa-solid fa-bolt text-[#ff0055]"></i>';
                btn.title = "Cyberpunk Neon";
            }
        });
    }

    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            let nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
            applyTheme(themes[nextIndex]);
        });
    });

    // 4. Update User UI globally
    try {
        const userStr = localStorage.getItem('lx_user');
        if (userStr && userStr !== 'undefined') {
            const user = JSON.parse(userStr);
            const loginLinks = document.querySelectorAll('a[href="/login.html"]');
            loginLinks.forEach(link => {
                const span = link.querySelector('span');
                if (span) {
                    span.textContent = user.first_name || 'ผู้ใช้';
                }
                link.href = '/profile.html';
                
                // Add logout button if not exists
                if (!link.nextElementSibling || !link.nextElementSibling.classList.contains('text-gamer-red')) {
                    link.insertAdjacentHTML('afterend', `
                        <button onclick="logout()" class="hidden sm:flex text-gamer-red hover:text-white transition-colors items-center gap-2 text-sm font-medium ml-4 border border-gamer-red/30 px-3 py-1 rounded-lg hover:bg-gamer-red hover:border-gamer-red">
                            <i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ
                        </button>
                    `);
                }
            });
        }
    } catch(e) {}
});

if (typeof window.logout === 'undefined') {
    window.logout = function() {
        localStorage.removeItem('lx_user');
        window.location.reload();
    };
}
