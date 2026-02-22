import * as fs from 'fs';
import { MODELS } from './src/lib/models-data.ts';

const allowedModels = MODELS.filter(m =>
    m.provider === 'NightCafe' || m.provider === 'Community' ||
    m.id.startsWith('juggernaut') || m.id.startsWith('realvis') ||
    m.id.startsWith('flux') || m.id.includes('dalle3') || m.id.startsWith('ideogram') || m.id.startsWith('gpt')
).sort((a, b) => a.name.localeCompare(b.name));

const fileContent = fs.readFileSync('./src/lib/models-data.ts', 'utf8');
const startIndex = fileContent.indexOf('export const MODELS: ModelInfo[] = [');
const endIndex = fileContent.indexOf('];\n\nexport function analyzePrompt');

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find array bounds in models-data.ts');
    process.exit(1);
}

const before = fileContent.substring(0, startIndex);
const after = fileContent.substring(endIndex + 2); // skip "];"

const replacement = 'export const MODELS: ModelInfo[] = ' + JSON.stringify(allowedModels, null, 2) + ';';

fs.writeFileSync('./src/lib/models-data.ts', before + replacement + after, 'utf8');
console.log('Success! Filtered and sorted down to ' + allowedModels.length + ' models.');
