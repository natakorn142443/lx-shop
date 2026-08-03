const puppeteer = require('puppeteer');
(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('LOG:', msg.text()));
        page.on('pageerror', err => console.log('ERROR:', err.message));
        
        await page.goto('http://localhost:3000/admin.html', {waitUntil: 'networkidle0'});
        
        // wait a bit
        await new Promise(r => setTimeout(r, 2000));
        
        const html = await page.evaluate(() => {
            const select = document.getElementById('p-category');
            return select ? select.outerHTML : 'Not found';
        });
        console.log('Select HTML:', html);
        await browser.close();
    } catch (e) {
        console.error("Puppeteer Script Error:", e);
        process.exit(1);
    }
})();
