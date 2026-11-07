import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
// Kiểm tra cú pháp JSX/JS tĩnh nếu TypeScript đã được cài toàn cục.
const files = [
  'vite.config.js','src/main.jsx','src/App.jsx','src/lib/supabase.js',
  'src/components/UI.jsx','src/components/Auth.jsx',
  'src/components/Dashboard.jsx','src/components/Classroom.jsx','src/components/BoardEditor.jsx',
];
let errors = 0;
for (const file of files) {
  const content = fs.readFileSync(file,'utf8');
  const source = ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,file.endsWith('.jsx')?ts.ScriptKind.JSX:ts.ScriptKind.JS);
  if (source.parseDiagnostics.length) {
    console.error('\n' + file);
    for (const diagnostic of source.parseDiagnostics) {
      const point = source.getLineAndCharacterOfPosition(diagnostic.start);
      console.error(`  ${point.line+1}:${point.character+1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText,' ')}`);
    }
    errors += source.parseDiagnostics.length;
  } else console.log('OK',file);
}
if (errors) process.exit(1);
