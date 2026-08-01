const { execSync } = require('child_process');

if (process.env.RENDER === 'true') {
  console.log('🤖 Render detected: Bundling self-contained standalone scripts using esbuild.');
  try {
    execSync('npx esbuild src/scripts/run-bot.ts --bundle --platform=node --target=node18 --outfile=dist/scripts/run-bot.js', { stdio: 'inherit' });
    execSync('npx esbuild src/scripts/run-notifier.ts --bundle --platform=node --target=node18 --outfile=dist/scripts/run-notifier.js', { stdio: 'inherit' });
    console.log('✅ Standalone bundles created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Bundling failed:', error);
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
