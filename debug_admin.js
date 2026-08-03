const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
        page.on('response', async res => {
            if (res.url().includes('/api/categories')) {
                console.log('API RESPONSE:', res.status(), await res.text());
            }
        });

        await page.evaluateOnNewDocument(() => {
            localStorage.setItem('lx_user', JSON.stringify({id: '123', first_name: 'Test', role: 'admin', token: 'test-token'}));
        });

        await page.goto('http://localhost:3000/admin.html', { waitUntil: 'domcontentloaded' });
        
        await new Promise(r => setTimeout(r, 2000));
        
        const html = await page.evaluate(() => {
            const select = document.getElementById('p-category');
            return select ? select.outerHTML : 'Not found';
        });
        console.log('SELECT HTML:', html);
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer Script Error:", e);
    }
})();
