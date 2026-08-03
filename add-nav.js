const fs = require('fs');
const files = ['index.html', 'product.html', 'cart.html', 'pc-builder.html', 'profile.html', 'compare.html', 'admin.html', 'login.html', 'checkout.html'];
files.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        if (!content.includes('mobile-nav.js')) {
            content = content.replace('</body>', '<script src="/mobile-nav.js"></script>\n</body>');
            fs.writeFileSync(f, content);
            console.log('Added to ' + f);
        }
    }
});
