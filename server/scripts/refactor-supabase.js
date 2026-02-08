const fs = require('fs');
const path = require('path');

// Adjusted path to reach root src from server/scripts/
const srcDir = path.join(__dirname, '../../src');

console.log('Target src directory:', srcDir);

function walk(dir, callback) {
    if (!fs.existsSync(dir)) {
        console.warn(`Directory not found: ${dir}`);
        return;
    }
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walk(filepath, callback);
        } else if (stats.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
            callback(filepath);
        }
    });
}

// 1. Rename lib/supabase.ts to lib/api.ts
const oldLibPath = path.join(srcDir, 'lib/supabase.ts');
const newLibPath = path.join(srcDir, 'lib/api.ts');

try {
    if (fs.existsSync(oldLibPath)) {
        let content = fs.readFileSync(oldLibPath, 'utf8');
        // Change export const supabase = ... to export const db = ...
        content = content.replace(/export const supabase =/, 'export const db =');
        fs.writeFileSync(newLibPath, content);
        fs.unlinkSync(oldLibPath);
        console.log('✅ Renamed lib/supabase.ts to lib/api.ts and updated export');
    } else if (fs.existsSync(newLibPath)) {
        console.log('ℹ️ lib/api.ts already exists, skipping rename');
    } else {
        console.warn('⚠️ Neither supabase.ts nor api.ts found in lib!');
    }
} catch (err) {
    console.error('Error renaming file:', err);
}

// 2. Update all files
try {
    walk(srcDir, (filepath) => {
        if (filepath === newLibPath) return;

        let content = fs.readFileSync(filepath, 'utf8');
        let originalContent = content;

        // Replace imports: import { supabase } from ... -> import { db } from ...
        // Handles single and double quotes, and imports from relative or alias paths
        content = content.replace(
            /import\s+{\s*supabase\s*}\s+from\s+(['"])(\.\.\/|@\/)lib\/supabase\1/g,
            "import { db } from $1$2lib/api$1"
        );

        // Replace usages: supabase. -> db.
        content = content.replace(/supabase\./g, 'db.');

        // Special case: hooks that might have "supabase" variable names but are not the import
        // e.g. const supabase = useSupabase() - though we are replacing the client import.

        if (content !== originalContent) {
            fs.writeFileSync(filepath, content);
            console.log(`Updated ${path.relative(srcDir, filepath)}`);
        }
    });
    console.log('✅ Refactor complete');
} catch (err) {
    console.error('Error walking files:', err);
}
