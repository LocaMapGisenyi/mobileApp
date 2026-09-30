const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const directory = path.resolve(__dirname, '../dist/_expo/static/js/web');
const files = fs.readdirSync(directory).filter(name => name.endsWith('.js'));
if (!files.length) throw new Error('Export web missing. Run expo export first.');
for (const name of files) {
  try { new vm.Script(fs.readFileSync(path.join(directory, name), 'utf8'), {filename:name}); }
  catch (error) { console.error(`${name}: ${error.name}: ${error.message}`); process.exit(1); }
}
console.log(`${files.length} web scripts parse successfully as browser scripts.`);
