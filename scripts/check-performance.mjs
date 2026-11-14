import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const problems=[];
function inspect(path){for(const entry of readdirSync(path,{withFileTypes:true})){const file=join(path,entry.name);if(entry.isDirectory())inspect(file);else if(/\.[tj]sx$/.test(file)){
 const source=readFileSync(file,"utf8"), tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node){
  if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&/\/backtest$/.test(node.moduleSpecifier.text))problems.push(`${file}: legacy close-price/flat-cost backtest is not allowed in the runtime UI`);
  if(ts.isJsxExpression(node)&&!node.getText(tree).includes("<")&&/(?:gross_return|grossReturnPct)/.test(node.getText(tree))){
   let container=node.parent;
   while(container&&!(ts.isJsxElement(container)&&/^(tr|p|div|li|dl)$/.test(container.openingElement.tagName.getText(tree))))container=container.parent;
   const raw=container?.getText(tree)||"";
   if(!/(?:net_return|returnPct)/.test(raw))problems.push(`${file}:${tree.getLineAndCharacterOfPosition(node.pos).line+1}: gross return has no adjacent net return`);
  }
  ts.forEachChild(node,visit);
 }visit(tree);
 if(/SAMPLE_LEADERS|Demo preview\.|illustrative (?:returns|performance)/.test(source))problems.push(`${file}: demo performance is forbidden`);
}}}
inspect("src/app");inspect("src/components");
if(problems.length){console.error(problems.join("\n"));process.exitCode=1;}else console.log("Performance presentation guard passed.");
