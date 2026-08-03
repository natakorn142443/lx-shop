const fs = require('fs');
const files = ['index.html', 'product.html'];
files.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        if (!content.includes('fomo.js')) {
            content = content.replace('</body>', '<script src="/fomo.js"></script>\n</body>');
            fs.writeFileSync(f, content);
            console.log('Added FOMO to ' + f);
        }
    }
});
