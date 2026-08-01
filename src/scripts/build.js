const { execSync } = require('child_process');

if (process.env.RENDER === 'true') {
  console.log('🤖 Render detected: Using pre-compiled JavaScript in dist/ for instant, 100% reliable execution.');
  process.exit(0);
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
