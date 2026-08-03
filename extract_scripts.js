const fs = require('fs');
const html = fs.readFileSync('c:/LX Shop/admin.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/g);
if (scriptMatch) {
    scriptMatch.forEach((s, i) => {
        const code = s.replace(/<\/?script>/g, '');
        fs.writeFileSync(`c:/LX Shop/temp${i}.js`, code);
    });
}
