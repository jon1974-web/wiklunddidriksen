const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'public', 'docs');
const htmlFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.html'));

console.log(`Found ${htmlFiles.length} HTML files to update\n`);

htmlFiles.forEach(file => {
  const filePath = path.join(docsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Track changes
  let changes = 0;
  const original = content;
  
  // 1. Replace Familiesenter with fampad in titles/headings
  content = content.replace(/Familiesenter/g, 'fampad');
  if (content !== original) changes++;
  
  // 2. Replace teal #0097A7 with slate gray #3b5a75
  content = content.replace(/#0097A7/g, '#3b5a75');
  if (content !== original) changes++;
  
  // 3. Replace teal light #E0F2F1 with slate gray light #D6EDED
  content = content.replace(/#E0F2F1/g, '#D6EDED');
  
  // 4. Replace favicon.ico with the new icon
  content = content.replace(/src="\/favicon\.ico"/g, 'src="/icon.png"');
  
  // 5. Update background from #f5f5f5 to #F6F7F9
  content = content.replace(/background: #f5f5f5/g, 'background: #F6F7F9');
  
  // 6. Update body background
  content = content.replace(/background: #f9f9f9/g, 'background: #f0f3f6');
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated: ${file}`);
});

console.log('\nAll HTML documents updated!');
