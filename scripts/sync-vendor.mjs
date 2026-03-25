import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeModulesDir = path.join(rootDir, 'node_modules');
const vendorDir = path.join(rootDir, 'vendor');

async function ensureCleanDir(relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  await rm(absoluteDir, { recursive: true, force: true });
  await mkdir(absoluteDir, { recursive: true });
}

async function copyFromNodeModules(sourceRelativePath, targetRelativePath) {
  const sourcePath = path.join(nodeModulesDir, sourceRelativePath);
  const targetPath = path.join(rootDir, targetRelativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
}

async function readInstalledPackageVersion(packageRelativePath) {
  const packageJsonPath = path.join(nodeModulesDir, packageRelativePath, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  return packageJson.version;
}

await mkdir(vendorDir, { recursive: true });
await ensureCleanDir('vendor/pdfjs');
await ensureCleanDir('vendor/pdf-lib');
await ensureCleanDir('vendor/jspdf');
await ensureCleanDir('vendor/ffmpeg');

await copyFromNodeModules('pdfjs-dist/build/pdf.min.js', 'vendor/pdfjs/pdf.min.js');
await copyFromNodeModules('pdfjs-dist/build/pdf.worker.min.js', 'vendor/pdfjs/pdf.worker.min.js');
await copyFromNodeModules('pdf-lib/dist/pdf-lib.min.js', 'vendor/pdf-lib/pdf-lib.min.js');
await copyFromNodeModules('jspdf/dist/jspdf.umd.min.js', 'vendor/jspdf/jspdf.umd.min.js');
await copyFromNodeModules('@ffmpeg/core/dist/umd/ffmpeg-core.js', 'vendor/ffmpeg/ffmpeg-core.js');
await copyFromNodeModules('@ffmpeg/core/dist/umd/ffmpeg-core.wasm', 'vendor/ffmpeg/ffmpeg-core.wasm');
await copyFromNodeModules('@ffmpeg/ffmpeg/dist/umd/ffmpeg.js', 'vendor/ffmpeg/ffmpeg.js');

const ffmpegUmdDir = path.join(nodeModulesDir, '@ffmpeg', 'ffmpeg', 'dist', 'umd');
const ffmpegUmdEntries = await readdir(ffmpegUmdDir);
for (const entry of ffmpegUmdEntries) {
  if (/^\d+\.ffmpeg\.js$/.test(entry)) {
    await copyFromNodeModules(path.join('@ffmpeg', 'ffmpeg', 'dist', 'umd', entry), path.join('vendor', 'ffmpeg', entry));
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  note: 'Runtime assets are checked into /vendor. node_modules is development-only and must not be used at runtime.',
  packages: {
    pdfjs: {
      package: 'pdfjs-dist',
      version: await readInstalledPackageVersion('pdfjs-dist'),
      files: ['vendor/pdfjs/pdf.min.js', 'vendor/pdfjs/pdf.worker.min.js']
    },
    pdfLib: {
      package: 'pdf-lib',
      version: await readInstalledPackageVersion('pdf-lib'),
      files: ['vendor/pdf-lib/pdf-lib.min.js']
    },
    jspdf: {
      package: 'jspdf',
      version: await readInstalledPackageVersion('jspdf'),
      files: ['vendor/jspdf/jspdf.umd.min.js']
    },
    ffmpeg: {
      package: '@ffmpeg/ffmpeg',
      version: await readInstalledPackageVersion(path.join('@ffmpeg', 'ffmpeg')),
      corePackage: '@ffmpeg/core',
      coreVersion: await readInstalledPackageVersion(path.join('@ffmpeg', 'core')),
      files: ['vendor/ffmpeg/ffmpeg.js', 'vendor/ffmpeg/ffmpeg-core.js', 'vendor/ffmpeg/ffmpeg-core.wasm', ...ffmpegUmdEntries.filter((entry) => /^\d+\.ffmpeg\.js$/.test(entry)).map((entry) => `vendor/ffmpeg/${entry}`)]
    }
  }
};

await writeFile(path.join(vendorDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('Vendor assets synced into /vendor.');
