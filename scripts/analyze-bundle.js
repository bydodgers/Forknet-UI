const fs = require('fs');
const path = require('path');

function analyzeBundleSize() {
  const buildDir = path.join(__dirname, '../build/static/js');
  
  if (!fs.existsSync(buildDir)) {
    console.log('❌ Build directory not found. Run "npm run build" first.');
    return;
  }

  const files = fs.readdirSync(buildDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(buildDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2),
        type: file.includes('main') ? 'Main Bundle' : 
              file.includes('chunk') ? 'Code Split Chunk' : 'Other'
      };
    })
    .sort((a, b) => b.size - a.size);

  console.log('\n🎯 Bundle Size Analysis\n');
  console.log('📦 JavaScript Files (uncompressed):');
  console.log('----------------------------------------');
  
  let totalSize = 0;
  files.forEach(file => {
    totalSize += file.size;
    const bar = '█'.repeat(Math.floor(file.size / 50000)) || '▌';
    console.log(`${file.type.padEnd(18)} ${file.sizeKB.padStart(8)} KB  ${bar}`);
    console.log(`  ${file.name}`);
  });
  
  console.log('----------------------------------------');
  console.log(`📊 Total JS Size: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`🗜️  Gzipped (~70%): ~${(totalSize * 0.3 / 1024).toFixed(2)} KB`);
  
  // Performance assessment
  const gzippedEstimate = totalSize * 0.3 / 1024;
  console.log('\n🚀 Performance Assessment:');
  if (gzippedEstimate < 150) {
    console.log('✅ EXCELLENT - Very fast loading');
  } else if (gzippedEstimate < 250) {
    console.log('✅ GOOD - Fast loading (your current level)');
  } else if (gzippedEstimate < 400) {
    console.log('⚠️  ACCEPTABLE - Moderate loading');
  } else {
    console.log('❌ NEEDS OPTIMIZATION - Slow loading');
  }

  // Top dependencies estimate
  console.log('\n📚 Likely largest dependencies:');
  console.log('• @mui/material + @mui/icons-material (~100-150 KB)');
  console.log('• React + ReactDOM (~50-80 KB)');
  console.log('• Redux Toolkit (~30-50 KB)');
  console.log('• Your application code (~50-100 KB)');
  
  console.log('\n💡 Optimization suggestions:');
  if (gzippedEstimate > 200) {
    console.log('• Consider tree-shaking unused Material-UI components');
    console.log('• Check for duplicate dependencies');
  } else {
    console.log('• Your bundle is already well-optimized! 🎉');
  }
}

analyzeBundleSize();