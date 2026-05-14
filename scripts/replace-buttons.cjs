const fs = require('fs');
const path = require('path');

const files = [
  'practical-exam-coaching.tsx',
  'ao-aao-bank-exam.tsx',
  'icar-exam-prep.tsx',
  'vci-veterinary-admission.tsx',
  'kcet-seat-allocation.tsx',
  'nri-quota-admission.tsx',
  'agri-consulting-reports.tsx'
];

const dir = path.join(__dirname, 'src', 'routes', 'services');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the exact block to replace
  // It starts with <div className="mt-8 flex flex-wrap gap-4">
  // and ends with </div> before </div> </div> <div className="grid gap-4">
  
  const regex = /<div className="mt-8 flex flex-wrap gap-4">[\s\S]*?<\/div>\s*<\/div>\s*<div className="grid gap-4">/;
  
  const replacement = `<div className="mt-8 flex flex-wrap gap-4">
                <Button asChild size="lg" className="gradient-primary text-primary-foreground hover:opacity-90 h-12 px-7 shadow-elegant transition-all hover:scale-[1.02]">
                  <Link to="/register" search={{ service: "${file.replace('.tsx', '')}" }}>Register Now <ArrowRight className="ml-1 w-4 h-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-7 border-border hover:bg-secondary">
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4">`;
            
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  } else {
    console.log('Could not find block in ' + file);
  }
}
