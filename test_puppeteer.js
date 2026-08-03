const puppeteer = require('puppeteer');
(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('LOG:', msg.text()));
        page.on('pageerror', err => console.log('ERROR:', err.message));
        
        await page.evaluateOnNewDocument(() => {
            localStorage.setItem('lx_user', JSON.stringify({id: '123', first_name: 'Test', role: 'customer'}));
        });
        
        await page.goto('http://localhost:3000', {waitUntil: 'networkidle0'});
        await browser.close();
    } catch (e) {
        console.error("Puppeteer Script Error:", e);
    }
})();
