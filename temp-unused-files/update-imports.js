const fs = require('fs');
const path = require('path');

// Import path mappings (old -> new)
const pathMappings = [
  // Models
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/database\/models['"]\)/g, new: "require('../../../database/models')" },
  { old: /require\(['"]\.\.\/core\/database\/models['"]\)/g, new: "require('../database/models')" },
  { old: /require\(['"]\.\.\/\.\.\/models['"]\)/g, new: "require('../../../database/models')" },
  { old: /require\(['"]\.\.\/models['"]\)/g, new: "require('../../database/models')" },
  { old: /require\(['"]\.\.\/models['"]\)/g, new: "require('../database/models')" },
  
  // Services - WhatsApp
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/whatsappService['"]\)/g, new: "require('../../../services/whatsapp/whatsappService')" },
  { old: /require\(['"]\.\.\/core\/services\/whatsappService['"]\)/g, new: "require('../services/whatsapp/whatsappService')" },
  { old: /require\(['"]\.\.\/services\/whatsappService['"]\)/g, new: "require('../../services/whatsapp/whatsappService')" },
  
  // Services - Campaign
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/campaignService['"]\)/g, new: "require('../../../services/campaign/campaignService')" },
  { old: /require\(['"]\.\.\/core\/services\/campaignService['"]\)/g, new: "require('../services/campaign/campaignService')" },
  { old: /require\(['"]\.\.\/services\/campaignService['"]\)/g, new: "require('../../services/campaign/campaignService')" },
  
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/flowService['"]\)/g, new: "require('../../../services/campaign/flowService')" },
  { old: /require\(['"]\.\.\/core\/services\/flowService['"]\)/g, new: "require('../services/campaign/flowService')" },
  { old: /require\(['"]\.\.\/services\/flowService['"]\)/g, new: "require('../../services/campaign/flowService')" },
  
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/channelService['"]\)/g, new: "require('../../../services/campaign/channelService')" },
  { old: /require\(['"]\.\.\/core\/services\/channelService['"]\)/g, new: "require('../services/campaign/channelService')" },
  
  // Services - Contact
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/bulkOperationsService['"]\)/g, new: "require('../../../services/contact/bulkOperationsService')" },
  { old: /require\(['"]\.\.\/core\/services\/bulkOperationsService['"]\)/g, new: "require('../services/contact/bulkOperationsService')" },
  { old: /require\(['"]\.\.\/services\/bulkOperationsService['"]\)/g, new: "require('../../services/contact/bulkOperationsService')" },
  
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/contactTagsService['"]\)/g, new: "require('../../../services/contact/contactTagsService')" },
  { old: /require\(['"]\.\.\/core\/services\/contactTagsService['"]\)/g, new: "require('../services/contact/contactTagsService')" },
  
  // Services - Export
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/exportService['"]\)/g, new: "require('../../../services/export/exportService')" },
  { old: /require\(['"]\.\.\/core\/services\/exportService['"]\)/g, new: "require('../services/export/exportService')" },
  { old: /require\(['"]\.\.\/services\/exportService['"]\)/g, new: "require('../../services/export/exportService')" },
  
  // Services - Notification
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/notificationService['"]\)/g, new: "require('../../../services/notification/notificationService')" },
  { old: /require\(['"]\.\.\/core\/services\/notificationService['"]\)/g, new: "require('../services/notification/notificationService')" },
  
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/phoneHealthCheckService['"]\)/g, new: "require('../../../services/notification/phoneHealthCheckService')" },
  { old: /require\(['"]\.\.\/core\/services\/phoneHealthCheckService['"]\)/g, new: "require('../services/notification/phoneHealthCheckService')" },
  
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/services\/rateLimitService['"]\)/g, new: "require('../../../services/notification/rateLimitService')" },
  { old: /require\(['"]\.\.\/core\/services\/rateLimitService['"]\)/g, new: "require('../services/notification/rateLimitService')" },
  { old: /require\(['"]\.\.\/services\/rateLimitService['"]\)/g, new: "require('../../services/notification/rateLimitService')" },
  { old: /require\(['"]\.\.\/rateLimitService['"]\)/g, new: "require('../services/notification/rateLimitService')" },
  
  // Middleware
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/shared\/middleware\//g, new: "require('../../../api/middlewares/" },
  { old: /require\(['"]\.\.\/\.\.\/middleware\//g, new: "require('../../../api/middlewares/" },
  { old: /require\(['"]\.\.\/shared\/middleware\//g, new: "require('../api/middlewares/" },
  { old: /require\(['"]\.\.\/middleware\//g, new: "require('../api/middlewares/" },
  
  // Utils
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/shared\/utils\//g, new: "require('../../../utils/helpers/" },
  { old: /require\(['"]\.\.\/\.\.\/utils\//g, new: "require('../../../utils/helpers/" },
  { old: /require\(['"]\.\.\/shared\/utils\//g, new: "require('../utils/helpers/" },
  { old: /require\(['"]\.\.\/utils\//g, new: "require('../utils/helpers/" },
  
  // Constants
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/shared\/constants\//g, new: "require('../../../utils/constants/" },
  { old: /require\(['"]\.\.\/shared\/constants\//g, new: "require('../utils/constants/" },
  
  // Config
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/core\/config\//g, new: "require('../../../config/" },
  { old: /require\(['"]\.\.\/core\/config\//g, new: "require('../config/" },
  
  // Jobs
  { old: /require\(['"]\.\.\/\.\.\/\.\.\/infrastructure\/jobs\//g, new: "require('../../../jobs/" },
  { old: /require\(['"]\.\.\/infrastructure\/jobs\//g, new: "require('../jobs/" },
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    pathMappings.forEach(mapping => {
      if (mapping.old.test(content)) {
        content = content.replace(mapping.old, mapping.new);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
      count += processDirectory(filePath);
    } else if (file.endsWith('.js')) {
      if (updateFile(filePath)) {
        count++;
      }
    }
  });
  
  return count;
}

console.log('🔄 Starting import path updates...\n');
const updated = processDirectory('./src-new');
console.log(`\n✅ Complete! Updated ${updated} files.`);
