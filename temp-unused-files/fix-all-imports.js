const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Fix paths based on file location
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  
  // For files in src/modules/*/routes/
  if (relPath.match(/src[\/]modules[\/][^\/]+[\/]routes[\/]/)) {
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/database\/models/g, "require('../../../core/database/models");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/api\/middlewares/g, "require('../../../core/middlewares");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/utils\/helpers/g, "require('../../../common/helpers");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/utils\/constants/g, "require('../../../common/constants");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/services\/whatsapp/g, "require('../../../integrations/whatsapp");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/services\/campaign/g, "require('../../../modules/campaigns/services");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/config\//g, "require('../../../core/config/");
    content = content.replace(/require\(['"]\.\.\/\.\.\/database\/models/g, "require('../../../core/database/models");
    content = content.replace(/require\(['"]\.\.\/\.\.\/utils\/helpers/g, "require('../../../common/helpers");
    content = content.replace(/require\(['"]\.\.\/\.\.\/api\/middlewares/g, "require('../../../core/middlewares");
  }
  
  // For files in src/modules/*/services/
  if (relPath.match(/src[\/]modules[\/][^\/]+[\/]services[\/]/)) {
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/database\/models/g, "require('../../../core/database/models");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/utils\/helpers/g, "require('../../../common/helpers");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/services\/whatsapp/g, "require('../../../integrations/whatsapp");
    content = content.replace(/require\(['"]\.\.\/\.\.\/database\/models/g, "require('../../../core/database/models");
    content = content.replace(/require\(['"]\.\.\/\.\.\/utils\/helpers/g, "require('../../../common/helpers");
  }
  
  // For files in src/integrations/*/
  if (relPath.match(/src[\/]integrations[\/][^\/]+[\/]/)) {
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/database\/models/g, "require('../../core/database/models");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/utils\/helpers/g, "require('../../common/helpers");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/config\//g, "require('../../core/config/");
  }
  
  // For files in src/jobs/
  if (relPath.match(/src[\/]jobs[\/]/)) {
    content = content.replace(/require\(['"]\.\.\/\.\.\/database\/models/g, "require('../core/database/models");
    content = content.replace(/require\(['"]\.\.\/\.\.\/utils\/helpers/g, "require('../common/helpers");
    content = content.replace(/require\(['"]\.\.\/\.\.\/config\//g, "require('../core/config/");
  }
  
  // For files in src/scripts/
  if (relPath.match(/src[\/]scripts[\/]/)) {
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/database\/models/g, "require('../../core/database/models");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/utils\/helpers/g, "require('../../common/helpers");
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function scanDirectory(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      count += scanDirectory(filePath);
    } else if (file.endsWith('.js')) {
      if (fixFile(filePath)) {
        console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
        count++;
      }
    }
  });
  
  return count;
}

console.log('🔄 Fixing all import paths...\n');
const count = scanDirectory(path.join(__dirname, 'src'));
console.log(`\n✅ Complete! ${count} files fixed.`);
