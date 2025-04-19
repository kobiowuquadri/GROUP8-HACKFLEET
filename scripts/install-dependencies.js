const fs = require('fs');
const path = require('path');
const https = require('https');

const dependencies = {
    'jquery.min.js': 'https://code.jquery.com/jquery-3.6.0.min.js',
    'morris-0.4.3.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/morris.js/0.4.3/morris.min.js',
    'morris.css': 'https://cdnjs.cloudflare.com/ajax/libs/morris.js/0.4.3/morris.css',
    'font-awesome.min.css': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
    'bootstrap.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js',
    'bootstrap.min.css': 'https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css'
};

const vendorDirs = {
    'jquery.min.js': 'vendor',
    'morris-0.4.3.min.js': 'vendor/chart',
    'morris.css': 'vendor/chart',
    'font-awesome.min.css': 'vendor/theme/font-awesome/css',
    'bootstrap.min.js': 'vendor/bootstrap/js',
    'bootstrap.min.css': 'vendor/bootstrap/css'
};

function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {});
            reject(err);
        });
    });
}

async function installDependencies() {
    const baseDir = path.join(__dirname, '..', 'app', 'assets');
    
    // Create necessary directories
    for (const dir of Object.values(vendorDirs)) {
        const fullPath = path.join(baseDir, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    }

    // Download files
    for (const [file, url] of Object.entries(dependencies)) {
        const dir = vendorDirs[file];
        const filePath = path.join(baseDir, dir, file);
        console.log(`Downloading ${file} to ${filePath}...`);
        try {
            await downloadFile(url, filePath);
            console.log(`Successfully downloaded ${file}`);
        } catch (err) {
            console.error(`Error downloading ${file}:`, err);
        }
    }
}

installDependencies().then(() => {
    console.log('Installation complete!');
}).catch(err => {
    console.error('Installation failed:', err);
}); 