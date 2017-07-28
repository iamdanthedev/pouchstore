const fs = require('fs-extra')
const path = require('path')

const distDir = path.resolve(__dirname, '..', 'dist')
const buildSrcDir = path.resolve(__dirname, '..', 'build/src')

try {

  if (fs.existsSync(distDir)) {
    fs.removeSync(distDir)
  }

  fs.copySync(buildSrcDir, distDir)

} catch (e) {
  console.log(e)
}

