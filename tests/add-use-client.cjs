const fs = require('fs');
const path = require('path');

function addUseClient(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      addUseClient(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // If the file uses React hooks or DOM APIs, it needs 'use client'
      if (content.match(/use(State|Effect|Ref|Context|Memo|Callback|Store|Theme|Navigate|Router|Match)/) || content.match(/window\./) || content.match(/document\./)) {
        if (!content.includes("'use client'") && !content.includes('"use client"')) {
          content = "'use client';\n" + content;
          fs.writeFileSync(fullPath, content);
          console.log(`Added 'use client' to ${file}`);
        }
      }
    }
  }
}

addUseClient(path.join(__dirname, 'app', 'components'));
console.log('Finished adding use client directives.');
