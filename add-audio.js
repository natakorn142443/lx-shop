const fs = require('fs');
const files = ['index.html', 'product.html', 'cart.html', 'pc-builder.html', 'profile.html', 'compare.html', 'admin.html', 'login.html', 'checkout.html'];

files.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        if (!content.includes('audio.js')) {
            content = content.replace('</body>', '<script src="/audio.js"></script>\n</body>');
            fs.writeFileSync(f, content);
            console.log('Added audio.js to ' + f);
        }
    }
});
