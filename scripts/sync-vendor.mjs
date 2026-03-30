import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeModulesDir = path.join(rootDir, 'node_modules');
const toolsVendorDir = path.join(rootDir, 'tools', 'vendor');

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

await mkdir(toolsVendorDir, { recursive: true });
await ensureCleanDir('tools/vendor/pdfjs');
await ensureCleanDir('tools/vendor/pdf-lib');
await ensureCleanDir('tools/vendor/jspdf');
await ensureCleanDir('tools/vendor/ffmpeg');
await ensureCleanDir('tools/vendor/qrcode');

await copyFromNodeModules('pdfjs-dist/build/pdf.min.js', 'tools/vendor/pdfjs/pdf.min.js');
await copyFromNodeModules('pdfjs-dist/build/pdf.worker.min.js', 'tools/vendor/pdfjs/pdf.worker.min.js');
await copyFromNodeModules('pdf-lib/dist/pdf-lib.min.js', 'tools/vendor/pdf-lib/pdf-lib.min.js');
await copyFromNodeModules('jspdf/dist/jspdf.umd.min.js', 'tools/vendor/jspdf/jspdf.umd.min.js');
await copyFromNodeModules('@ffmpeg/core/dist/umd/ffmpeg-core.js', 'tools/vendor/ffmpeg/ffmpeg-core.js');
await copyFromNodeModules('@ffmpeg/core/dist/umd/ffmpeg-core.wasm', 'tools/vendor/ffmpeg/ffmpeg-core.wasm');
await copyFromNodeModules('@ffmpeg/ffmpeg/dist/umd/ffmpeg.js', 'tools/vendor/ffmpeg/ffmpeg.js');

await esbuild({
  entryPoints: ['qrcode'],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'QRCodeLib',
  outfile: path.join(rootDir, 'tools/vendor/qrcode/qrcode.min.js'),
  platform: 'browser',
  absWorkingDir: rootDir,
});

const ffmpegUmdDir = path.join(nodeModulesDir, '@ffmpeg', 'ffmpeg', 'dist', 'umd');
const ffmpegUmdEntries = await readdir(ffmpegUmdDir);
for (const entry of ffmpegUmdEntries) {
  if (/^\d+\.ffmpeg\.js$/.test(entry)) {
    await copyFromNodeModules(path.join('@ffmpeg', 'ffmpeg', 'dist', 'umd', entry), path.join('tools', 'vendor', 'ffmpeg', entry));
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  note: 'Runtime assets are checked into /tools/vendor. node_modules is development-only and must not be used at runtime.',
  packages: {
    pdfjs: {
      package: 'pdfjs-dist',
      version: await readInstalledPackageVersion('pdfjs-dist'),
      files: ['tools/vendor/pdfjs/pdf.min.js', 'tools/vendor/pdfjs/pdf.worker.min.js']
    },
    pdfLib: {
      package: 'pdf-lib',
      version: await readInstalledPackageVersion('pdf-lib'),
      files: ['tools/vendor/pdf-lib/pdf-lib.min.js']
    },
    jspdf: {
      package: 'jspdf',
      version: await readInstalledPackageVersion('jspdf'),
      files: ['tools/vendor/jspdf/jspdf.umd.min.js']
    },
    ffmpeg: {
      package: '@ffmpeg/ffmpeg',
      version: await readInstalledPackageVersion(path.join('@ffmpeg', 'ffmpeg')),
      corePackage: '@ffmpeg/core',
      coreVersion: await readInstalledPackageVersion(path.join('@ffmpeg', 'core')),
      files: ['tools/vendor/ffmpeg/ffmpeg.js', 'tools/vendor/ffmpeg/ffmpeg-core.js', 'tools/vendor/ffmpeg/ffmpeg-core.wasm', ...ffmpegUmdEntries.filter((entry) => /^\d+\.ffmpeg\.js$/.test(entry)).map((entry) => `tools/vendor/ffmpeg/${entry}`)]
    },
    qrcode: {
      package: 'qrcode',
      version: await readInstalledPackageVersion('qrcode'),
      bundler: 'esbuild (IIFE, global name: QRCodeLib)',
      files: ['tools/vendor/qrcode/qrcode.min.js']
    }
  }
};

await writeFile(path.join(toolsVendorDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('Vendor assets synced into /tools/vendor.');
