const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/asus/OneDrive/Documents/Vs code/Internship/krushikuta-main/src/routes/services';
const files = [
  'agri-consulting-reports.tsx',
  'ao-aao-bank-exam.tsx',
  'icar-exam-prep.tsx',
  'kcet-seat-allocation.tsx',
  'nri-quota-admission.tsx',
  'practical-exam-coaching.tsx',
  'vci-veterinary-admission.tsx'
];

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const slug = file.replace('.tsx', '');
  
  // Replace the entire children block inside PageHero
  const childrenRegex = /<div className="mt-8 flex flex-wrap items-center justify-center gap-4">[\s\S]+?<\/div>/;
  const newButton = `
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="gradient-gold text-gold-foreground hover:opacity-90 h-14 px-12 text-lg font-bold shadow-gold transition-all hover:scale-[1.05] rounded-2xl">
            <Link to="/register" search={{ service: "${slug}" }}>Register Now <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
        </div>`;
  
  if (childrenRegex.test(content)) {
    content = content.replace(childrenRegex, newButton);
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`FAILED to find button block in ${file}`);
  }
});
