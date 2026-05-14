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
  
  // Updated regex to handle multi-line PageHero tag
  const heroRegex = /(<PageHero[\s\S]+?description=\{?["'][^"'}]+["']\}?)\s*\/>/;
  const children = `
      >
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="gradient-gold text-gold-foreground hover:opacity-90 h-12 px-7 shadow-gold transition-all hover:scale-[1.02]">
            <Link to="/register" search={{ service: "${slug}" }}>Register Now <ArrowRight className="ml-1 w-4 h-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-7 bg-white/10 border-white/20 text-white hover:bg-white hover:text-primary">
            <Link to="/contact">Contact Us</Link>
          </Button>
        </div>
      </PageHero>`;
  
  if (heroRegex.test(content)) {
    content = content.replace(heroRegex, `$1${children}`);
    // Only remove old buttons if we successfully added new ones
    const oldButtonsRegex = /<div className="mt-8 flex flex-wrap gap-4">[\s\S]+?<\/div>/;
    content = content.replace(oldButtonsRegex, '');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`FAILED to match PageHero in ${file}`);
  }
});
