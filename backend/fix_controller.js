const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/modules/analytics/controllers/analyticsController.js');
let content = fs.readFileSync(file, 'utf8');

// The script replaced `router.get('/...', async (req, res) => {`
// with `exports.methodName = async (req, res) => {`
// but left the closing `});` as is. We need to change `});` to `};` for these exports.

// Let's just find `});` when it is at the root level (no indentation or 2 spaces indentation)
// The original code was `router.get(..., async (req, res) => { ... });`
// So the closing `});` is at the beginning of a line.
// We can replace `^});` with `};` for the whole file.

content = content.replace(/^}\);/gm, '};');

fs.writeFileSync(file, content);
console.log('Fixed syntax errors in analyticsController.js');
