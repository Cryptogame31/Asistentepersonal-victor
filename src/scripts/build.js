const { execSync } = require('child_process');

if (process.env.RENDER === 'true') {
  console.log('🤖 Render detected: Compiling backend TypeScript scripts to Javascript (dist/) for native Node execution.');
  try {
    // Compile using the dedicated tsconfig for scripts
    execSync('npx tsc --project src/scripts/tsconfig.json', { stdio: 'inherit' });
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
