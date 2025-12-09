/**
 * Fix all remaining old import paths from core/ structure
 */

const fs = require('fs');
const path = require('path');

// Patterns to fix
const patterns = [
  {
    old: /require\(['"]\.\.\/\.\.\/core\/database\/models\/(.*?)['"]\)/g,
    new: (match, modelName) => `require('../../database/models/${modelName}')`
  },
  {
    old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/database\/models\/(.*?)['"]\)/g,
    new: (match, modelName) => `require('../../../database/models/${modelName}')`
  },
  {
    old: /require\(['"]\.\.\/\.\.\/core\/database\/models['"]\)/g,
    new: () => `require('../../database/models')`
  },
  {
    old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/database\/models['"]\)/g,
    new: () => `require('../../../database/models')`
  },
  {
    old: /require\(['"]\.\.\/\.\.\/core\/services\/whatsappService['"]\)/g,
    new: () => `require('../../services/whatsapp/whatsappService')`
  },
  {
    old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/whatsappService['"]\)/g,
    new: () => `require('../../../services/whatsapp/whatsappService')`
  },
  {
    old: /require\(['"]\.\.\/\.\.\/core\/services\/campaignService['"]\)/g,
    new: () => `require('../../services/campaign/campaignService')`
  },
  {
    old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/campaignService['"]\)/g,
    new: () => `require('../../../services/campaign/campaignService')`
  }
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    patterns.forEach(pattern => {
      const oldContent = content;
      content = content.replace(pattern.old, pattern.new);
      if (content !== oldContent) {
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return 0;
  }
}

function findJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        findJSFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

console.log('🔄 Starting core/ import path updates...\n');

const srcDir = path.join(__dirname, 'src');
const files = findJSFiles(srcDir);

let updateCount = 0;
files.forEach(file => {
  updateCount += updateFile(file);
});

console.log(`\n✅ Complete! Updated ${updateCount} files.`);
