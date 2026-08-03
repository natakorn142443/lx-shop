const fs = require('fs');
const files = ['index.html', 'product.html', 'cart.html', 'pc-builder.html', 'profile.html', 'compare.html', 'admin.html', 'login.html', 'checkout.html'];

files.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        if (content.includes('<script src="/cursor.js"></script>')) {
            content = content.replace('<script src="/cursor.js"></script>\n', '');
            content = content.replace('<script src="/cursor.js"></script>', '');
            fs.writeFileSync(f, content);
            console.log('Removed cursor.js from ' + f);
        }
    }
});
