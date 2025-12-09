const fs = require('fs');
const path = require('path');

const oldToNewPaths = {
  // Database models
  "'../../database/models'": "'../../../core/database/models'",
  "'../database/models'": "'../../core/database/models'",
  "\"../../database/models\"": "\"../../../core/database/models\"",
  "\"../database/models\"": "\"../../core/database/models\"",
  
  // Services - WhatsApp
  "'../../services/whatsapp/whatsappService'": "'../../../integrations/whatsapp/whatsappService'",
  "'../services/whatsapp/whatsappService'": "'../../integrations/whatsapp/whatsappService'",
  "'./whatsappService'": "'../whatsappService'", // Within whatsapp folder
  
  // Services - Other
  "'../../services/campaign'": "'../../modules/campaigns/services'",
  "'../../services/contact'": "'../../modules/contacts/services'",
  "'../../services/notification'": "'../../../integrations/notifications'",
  "'../services/notification'": "'../../integrations/notifications'",
  
  // Utils/Helpers
  "'../../utils/helpers/logger'": "'../../../common/helpers/logger'",
  "'../utils/helpers/logger'": "'../../common/helpers/logger'",
  "'../../utils/helpers'": "'../../../common/helpers'",
  "'../utils/helpers'": "'../../common/helpers'",
  "'../../shared/utils/logger'": "'../../../common/helpers/logger'",
  "'../shared/utils/logger'": "'../../common/helpers/logger'",
  "'../../shared/utils'": "'../../../common/helpers'",
  "'../shared/utils'": "'../../common/helpers'",
  
  // Middlewares
  "'../../middlewares'": "'../../../core/middlewares'",
  "'../middlewares'": "'../../core/middlewares'",
  "'../../api/middlewares'": "'../../../core/middlewares'",
  "'../api/middlewares'": "'../../core/middlewares'",
  "'../../shared/middleware'": "'../../../core/middlewares'",
  "'../shared/middleware'": "'../../core/middlewares'",
  
  // Config
  "'../../config'": "'../../../core/config'",
  "'../config'": "'../../core/config'",
  "'../../core/config'": "'../../../core/config'",
  "'../core/config'": "'../../core/config'",
  
  // Constants
  "'../../utils/constants'": "'../../../common/constants'",
  "'../utils/constants'": "'../../common/constants'",
  "'../../shared/constants'": "'../../../common/constants'",
  "'../shared/constants'": "'../../common/constants'",
  
  // Validators
  "'../../utils/validators'": "'../../../common/validators'",
  "'../utils/validators'": "'../../common/validators'",
};

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    for (const [oldPath, newPath] of Object.entries(oldToNewPaths)) {
      if (content.includes(oldPath)) {
        content = content.replace(new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPath);
        updated = true;
      }
    }
    
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

function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
      walkDirectory(filePath, callback);
    } else if (file.endsWith('.js')) {
      callback(filePath);
    }
  });
}

console.log('🔄 Starting import path updates...\n');
let filesUpdated = 0;

walkDirectory('./src-new', (filePath) => {
  filesUpdated += updateImportsInFile(filePath);
});

console.log(`\n✅ Import update complete! ${filesUpdated} files updated.`);
