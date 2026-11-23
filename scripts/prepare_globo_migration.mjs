// Prepare an isolated, reproducible migration candidate. Never edits production source or cloud resources.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const plan=JSON.parse(readFileSync(resolve(root,'config/globo-migration.json'),'utf8'));
const out=resolve(process.argv[2]||resolve(root,'.local-data/globo-migration'));
if(!out.startsWith(resolve(root,'.local-data')+'/'))throw Error('Output must be inside ignored .local-data');
if(existsSync(out))throw Error('Use a new output directory; existing candidates are preserved');
const files=execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(Boolean);
const report={activated:false,source_commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root}).toString().trim(),targets:plan,changed:[],manual_requirements:['Create/authorize the target GitHub organization and repository; verify name availability.','Verify target Cloudflare Pages name, production and wildcard Access before routing any private traffic.','Reuse KV namespaces and existing role registers; configure new Access audiences in both environments.','Supply a standalone GLOBO logo and adapt the animated ocean mask to its geometry.','Update the protocol PDF tracker link to the protected replacement private URL after successful access tests.','Test new public/private deployments before changing canonical URLs or old links.','Do not buy a custom domain; github.io/pages.dev are free hosting addresses.']};
for(const file of files){const src=resolve(root,file);let bytes=readFileSync(src);const textFile=/\.(qmd|html|js|mjs|json|yml|yaml|toml|svg|css)$/.test(file);if(textFile&&!file.startsWith('assets/vendor/')&&!file.startsWith('partners-portal/public/vendor/')&&!file.startsWith('tests/')){let s=bytes.toString('utf8'),t=s;
 // Hosting references change throughout source configuration; data IDs and GLOBE_* bindings stay stable.
 for(const pair of [plan.repository,plan.public,plan.private])t=t.replaceAll(pair.current,pair.target);
 t=t.replaceAll('globe-ocean.github.io','globo-ocean.github.io').replaceAll('globe-partners.pages.dev','globo-partners.pages.dev');
 if(file.endsWith('.qmd')||file==='partners-portal/public/index.html'||file==='_quarto.yml')t=t.replace(/\bGLOBE\b/g,'GLOBO');
 if(file==='partners-portal/wrangler.toml')t=t.replace('name = "globe-partners"','name = "globo-partners"');
 if(file==='contact-service/mail.mjs')t=t.replace('GLOBE enquiry:','GLOBO enquiry:');
 if(t!==s){bytes=Buffer.from(t);report.changed.push(file);}}
 const dst=resolve(out,file);mkdirSync(dirname(dst),{recursive:true});writeFileSync(dst,bytes);
}
writeFileSync(resolve(out,'MIGRATION-REVIEW.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output:relative(root,out),changed_files:report.changed.length,activated:false,manual_requirements:report.manual_requirements.length}));
