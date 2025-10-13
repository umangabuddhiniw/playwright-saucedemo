import fs from 'fs';
import path from 'path';

export default function globalSetup() {
    const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
    const reportsDir = path.join(process.cwd(), 'test-results', 'reports');
    
    [screenshotsDir, reportsDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    });
}