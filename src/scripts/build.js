const { execSync } = require('child_process');

if (process.env.RENDER === 'true') {
  console.log('🤖 Render detected: Bypassing Next.js frontend compilation for background services.');
  process.exit(0);
} else {
  console.log('🚀 Next.js/Vercel/Local environment detected: Starting production build...');
  try {
    // Run next build and pass down inputs/outputs
    execSync('next build', { stdio: 'inherit' });
    process.exit(0);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}
