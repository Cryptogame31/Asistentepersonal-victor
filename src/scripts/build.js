const { execSync } = require('child_process');

if (process.env.RENDER === 'true') {
  console.log('🤖 Render detected: Compiling backend TypeScript scripts to Javascript (dist/) for native Node execution.');
  try {
    // Compile run-bot.ts to dist/scripts/run-bot.js
    console.log('Compiling run-bot.ts...');
    execSync('npx tsc src/scripts/run-bot.ts --outDir dist --module commonjs --target es2022 --moduleResolution node --skipLibCheck --esModuleInterop', { stdio: 'inherit' });
    
    // Compile run-notifier.ts to dist/scripts/run-notifier.js
    console.log('Compiling run-notifier.ts...');
    execSync('npx tsc src/scripts/run-notifier.ts --outDir dist --module commonjs --target es2022 --moduleResolution node --skipLibCheck --esModuleInterop', { stdio: 'inherit' });
    
    console.log('✅ Backend compilation completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Compilation failed:', error);
    process.exit(1);
  }
} else {
  console.log('🚀 Next.js/Vercel/Local environment detected: Starting production build...');
  try {
    execSync('next build', { stdio: 'inherit' });
    process.exit(0);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}
