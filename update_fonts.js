const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/family=Prompt:wght@400;500;600;700&display=swap/g, 'family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Prompt:wght@400;500;600;700&display=swap');
  content = content.replace(/body\s*\{\s*font-family:\s*'Prompt',\s*sans-serif;\s*\}/g, "body { font-family: 'IBM Plex Sans Thai', sans-serif; }");
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
}
