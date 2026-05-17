/**
 * CSS Variable Replacement Script
 * 
 * Automatically replaces all CSS variables (var(--variable-name)) with their
 * actual values from the design system across all CSS files in the project.
 * 
 * Usage: node replace-css-variables.js
 */

const fs = require('fs');
const path = require('path');

// CSS Variable definitions from design-system.css
const CSS_VARIABLES = {
  // Colors - Primary
  '--primary': '#5e69ee',
  '--primary-light': '#7d86f2',
  '--primary-dark': '#4a52d9',
  '--primary-hover': '#4a52d9',
  
  // Colors - Secondary
  '--secondary': '#39AFEA',
  '--secondary-light': '#68c5f0',
  '--secondary-dark': '#2a9ad4',
  '--secondary-hover': '#2a9ad4',
  
  // Colors - Background
  '--background': '#FAFBFC',
  '--background-dark': '#e9ecef',
  '--background-alt': '#f8f9fa',
  '--background-hover': '#e2e8f0',
  
  // Colors - Accent
  '--accent': '#F4F4FB',
  '--accent-light': '#FFFFFF',
  '--accent-dark': '#E8E8F5',
  
  // Colors - Surface
  '--surface': '#FFFFFF',
  '--overlay': 'rgba(15, 23, 42, 0.6)',
  
  // Colors - Text
  '--text': '#0F172A',
  '--text-primary': '#0F172A',
  '--text-secondary': '#64748B',
  '--text-tertiary': '#94A3B8',
  '--text-inverse': '#FFFFFF',
  '--text-muted': '#94A3B8',
  
  // Colors - Border
  '--border': '#E2E8F0',
  '--border-light': '#F1F5F9',
  '--border-dark': '#CBD5E1',
  '--divider': '#F1F5F9',
  
  // Colors - Semantic
  '--success': '#059669',
  '--success-light': '#D1FAE5',
  '--success-dark': '#047857',
  
  '--warning': '#F59E0B',
  '--warning-light': '#FEF3C7',
  '--warning-dark': '#d97706',
  
  '--error': '#EF4444',
  '--error-light': '#FEE2E2',
  '--error-dark': '#dc2626',
  
  '--info': '#39AFEA',
  '--info-light': '#E0F2FE',
  '--info-dark': '#2563eb',
  
  // Additional colors
  '--color-purple': '#5e69ee',
  '--color-primary': '#5e69ee',
  '--color-success': '#10B981',
  '--color-info': '#39AFEA',
  '--color-danger': '#ff4444',
  
  // Typography - Font Sizes
  '--font-size-xs': '11px',
  '--font-size-sm': '12px',
  '--font-size-base': '14px',
  '--font-size-md': '15px',
  '--font-size-lg': '16px',
  '--font-size-xl': '18px',
  '--font-size-2xl': '20px',
  '--font-size-3xl': '22px',
  '--font-size-4xl': '24px',
  '--font-size-5xl': '28px',
  '--font-size-2xs': '10px', // Not in design-system, but used
  
  // Typography - Font Weights
  '--font-weight-normal': '400',
  '--font-weight-medium': '500',
  '--font-weight-semibold': '600',
  '--font-weight-bold': '700',
  '--font-weight-extrabold': '800',
  
  // Typography - Line Heights
  '--line-height-tight': '1.2',
  '--line-height-normal': '1.5',
  '--line-height-relaxed': '1.75',
  
  // Typography - Letter Spacing
  '--letter-spacing-tight': '-0.5px',
  '--letter-spacing-normal': '0',
  '--letter-spacing-wide': '0.5px',
  
  // Spacing
  '--spacing-xs': '4px',
  '--spacing-sm': '8px',
  '--spacing-md': '12px',
  '--spacing-base': '16px',
  '--spacing-lg': '24px',
  '--spacing-xl': '32px',
  '--spacing-2xl': '40px',
  '--spacing-3xl': '48px',
  '--spacing-4xl': '64px',
  '--spacing-5xl': '80px',
  '--spacing-6xl': '96px',
  
  // Border Radius
  '--radius-none': '0',
  '--radius-xs': '4px',
  '--radius-sm': '4px',
  '--radius-base': '8px',
  '--radius-md': '12px',
  '--radius-lg': '16px',
  '--radius-xl': '24px',
  '--radius-2xl': '32px',
  '--radius-full': '9999px',
  
  // Shadows
  '--shadow-xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '--shadow-base': '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
  '--shadow-md': '0 3px 6px 0 rgba(0, 0, 0, 0.12)',
  '--shadow-lg': '0 4px 8px 0 rgba(0, 0, 0, 0.15)',
  '--shadow-xl': '0 6px 12px 0 rgba(0, 0, 0, 0.2)',
  '--shadow-2xl': '0 8px 16px 0 rgba(0, 0, 0, 0.25)',
  '--shadow-3xl': '0 12px 24px 0 rgba(0, 0, 0, 0.3)',
  '--shadow-inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  '--shadow-outline': '0 0 0 3px rgba(94, 105, 238, 0.1)',
  '--shadow-outline-error': '0 0 0 3px rgba(239, 68, 68, 0.1)',
  '--shadow-outline-success': '0 0 0 3px rgba(16, 185, 129, 0.1)',
  
  // Z-Index
  '--z-base': '0',
  '--z-dropdown': '1000',
  '--z-sticky': '1020',
  '--z-fixed': '1030',
  '--z-modal-backdrop': '1040',
  '--z-modal': '1050',
  '--z-popover': '1060',
  '--z-tooltip': '1070',
  '--z-notification': '9999',
  
  // Transitions
  '--transition-fast': '150ms ease-in-out',
  '--transition-base': '200ms ease-in-out',
  '--transition-slow': '300ms ease-in-out',
  '--transition-slower': '500ms ease-in-out',
  
  // Easing
  '--ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
  '--ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
  '--ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  '--ease-spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // Component Sizes
  '--button-height-sm': '40px',
  '--button-height-md': '48px',
  '--button-height-lg': '56px',
  
  '--input-height-sm': '40px',
  '--input-height-md': '48px',
  '--input-height-lg': '56px',
  
  '--icon-size-xs': '16px',
  '--icon-size-sm': '20px',
  '--icon-size-md': '24px',
  '--icon-size-lg': '32px',
  '--icon-size-xl': '40px',
  
  '--avatar-size-xs': '24px',
  '--avatar-size-sm': '32px',
  '--avatar-size-md': '40px',
  '--avatar-size-lg': '56px',
  '--avatar-size-xl': '80px',
  
  // Opacity
  '--opacity-disabled': '0.5',
  '--opacity-hover': '0.8',
  '--opacity-muted': '0.6',
  '--opacity-subtle': '0.1',
  
  // Focus
  '--focus-ring': '0 0 0 3px rgba(94, 105, 238, 0.2)',
  '--focus-ring-error': '0 0 0 3px rgba(239, 68, 68, 0.2)',
  '--focus-ring-success': '0 0 0 3px rgba(5, 150, 105, 0.2)',
  '--focus-outline-offset': '2px',
};

// Files to exclude from replacement
const EXCLUDE_FILES = [
  'design-system.css',
  'replace-css-variables.js',
  'node_modules',
  '.git',
];

/**
 * Recursively find all CSS files in a directory
 */
function findCSSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Skip excluded directories/files
    if (EXCLUDE_FILES.some(excluded => filePath.includes(excluded))) {
      return;
    }
    
    if (stat.isDirectory()) {
      findCSSFiles(filePath, fileList);
    } else if (file.endsWith('.css')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Replace CSS variables in content
 */
function replaceCSSVariables(content) {
  let updatedContent = content;
  let replacementCount = 0;
  
  // Sort variables by length (longest first) to avoid partial replacements
  const sortedVariables = Object.entries(CSS_VARIABLES).sort((a, b) => b[0].length - a[0].length);
  
  sortedVariables.forEach(([variable, value]) => {
    // Match var(--variable-name) with optional whitespace
    const regex = new RegExp(`var\\(\\s*${variable.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*\\)`, 'g');
    const matches = updatedContent.match(regex);
    
    if (matches) {
      updatedContent = updatedContent.replace(regex, value);
      replacementCount += matches.length;
    }
  });
  
  return { updatedContent, replacementCount };
}

/**
 * Process a single CSS file
 */
function processCSSFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { updatedContent, replacementCount } = replaceCSSVariables(content);
    
    if (replacementCount > 0) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${replacementCount} replacements`);
      return { file: filePath, count: replacementCount };
    } else {
      console.log(`⏭️  ${path.relative(process.cwd(), filePath)}: No variables found`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Starting CSS Variable Replacement...\n');
  
  const srcDir = path.join(__dirname, 'src');
  const cssFiles = findCSSFiles(srcDir);
  
  console.log(`📁 Found ${cssFiles.length} CSS files\n`);
  
  const results = [];
  let totalReplacements = 0;
  
  cssFiles.forEach(file => {
    const result = processCSSFile(file);
    if (result) {
      results.push(result);
      totalReplacements += result.count;
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`✨ Replacement Complete!`);
  console.log(`📊 Statistics:`);
  console.log(`   - Files processed: ${cssFiles.length}`);
  console.log(`   - Files updated: ${results.length}`);
  console.log(`   - Total replacements: ${totalReplacements}`);
  console.log('='.repeat(60));
  
  if (results.length > 0) {
    console.log('\n📝 Updated files:');
    results.forEach(({ file, count }) => {
      console.log(`   - ${path.relative(process.cwd(), file)}: ${count} replacements`);
    });
  }
}

// Run the script
main();
