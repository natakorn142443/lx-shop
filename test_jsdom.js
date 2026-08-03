const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('c:/LX Shop/admin.html', 'utf8');

const dom = new JSDOM(html, {
    url: "http://localhost:3000/admin.html",
    runScripts: "dangerously",
    resources: "usable"
});

setTimeout(() => {
    const select = dom.window.document.getElementById('p-category');
    console.log("Options count:", select ? select.options.length : 'Select not found');
    if (select) {
        for(let i=0; i<select.options.length; i++) {
            console.log(select.options[i].value, select.options[i].textContent);
        }
    }
    process.exit(0);
}, 2000);
