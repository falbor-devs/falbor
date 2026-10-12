const fs = require('fs');
const path = require('path');

function fixEnv(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixEnv(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      if (content.includes('import.meta.env')) {
        content = content.replace(/import\.meta\.env\.DEV/g, "(process.env.NODE_ENV === 'development')");
        content = content.replace(/import\.meta\.env\.PROD/g, "(process.env.NODE_ENV === 'production')");
        content = content.replace(/import\.meta\.env\.VITE_([A-Za-z0-9_]+)/g, 'process.env.NEXT_PUBLIC_$1');
        content = content.replace(/import\.meta\.env\.([A-Za-z0-9_]+)/g, 'process.env.$1');
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed Vite env variables in ${file}`);
      }
    }
  }
}

fixEnv(path.join(__dirname, 'app'));
console.log('Finished fixing environment variables.');
