const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function checkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory() && f !== 'node_modules' && f !== '.git' && f !== 'uploads' && f !== 'scratch') {
            checkDir(p);
        } else if (f.endsWith('.js')) {
            try {
                cp.execSync('node --check "' + p + '"', { stdio: 'pipe' });
            } catch (e) {
                console.error('Syntax Error in ' + p + ':\n', e.stderr ? e.stderr.toString() : e.message);
            }
        }
    });
}
console.log('Checking syntax...');
checkDir('.');
console.log('Syntax check complete');
