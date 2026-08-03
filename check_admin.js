const puppeteer = require('puppeteer');
(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('LOG:', msg.text()));
        page.on('pageerror', err => console.log('ERROR:', err.message));
        
        await page.goto('http://localhost:3000/admin.html', {waitUntil: 'networkidle0'});
        const optionsCount = await page.evaluate(() => {
            const select = document.getElementById('p-category');
            return select ? select.options.length : -1;
        });
        console.log('Categories count in select:', optionsCount);
        await browser.close();
    } catch (e) {
        console.error("Puppeteer Script Error:", e);
    }
})();
