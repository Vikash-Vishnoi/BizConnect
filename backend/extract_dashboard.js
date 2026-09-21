const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'modules', 'analytics', 'controllers', 'analyticsController.js');
const dashboardPath = path.join(__dirname, 'src', 'modules', 'analytics', 'controllers', 'dashboardController.js');

let fileContent = fs.readFileSync(controllerPath, 'utf-8');

// The getDashboard method is between "exports.getDashboard = async (req, res) => {" and "// ============================================================================ // CONSOLIDATED TIMESERIES ROUTE"

const dashboardStart = fileContent.indexOf('exports.getDashboard = async (req, res) => {');
const timeseriesStart = fileContent.indexOf('// ============================================================================\r\n// CONSOLIDATED TIMESERIES ROUTE') !== -1 ? fileContent.indexOf('// ============================================================================\r\n// CONSOLIDATED TIMESERIES ROUTE') : fileContent.indexOf('// ============================================================================\n// CONSOLIDATED TIMESERIES ROUTE');

if (dashboardStart !== -1 && timeseriesStart !== -1) {
  const dashboardMethod = fileContent.substring(dashboardStart, timeseriesStart);
  
  // Extract imports/constants to put at the top of dashboardController
  const importsAndConstants = fileContent.substring(0, fileContent.indexOf('// ============================================================================'));

  const dashboardContent = importsAndConstants + '\n\n' + dashboardMethod;
  fs.writeFileSync(dashboardPath, dashboardContent);

  // Remove dashboard method from analyticsController and add import
  fileContent = fileContent.substring(0, dashboardStart) + `const dashboardController = require('./dashboardController');\nexports.getDashboard = dashboardController.getDashboard;\n\n` + fileContent.substring(timeseriesStart);
  
  fs.writeFileSync(controllerPath, fileContent);
  console.log('Successfully extracted dashboardController.js');
} else {
  console.log('Could not find dashboard logic boundaries');
}
