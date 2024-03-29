const fs = require('fs-extra')
const path = require('path')

const { renames } = require('./constants/mappings.js')

function pbcopy(data) {
  var proc = require('child_process').spawn('pbcopy'); 
  proc.stdin.write(data); proc.stdin.end();
}

const { 
  cleanSVGs, 
  upgradeSVGMarkup2, 
  getFileNameFromPath 
} = require('./libraries/svg')

const ANIMATION_BASE_URL = 'ar://H4MykzbQCgXNNj0GuGTfky0UXCu61bLLQ31bptpmpV0'

const tokenIdFromFilename = (filename) => {
  const parts = filename.split('.')
  return Number(parts[0])
}

async function start ([inputDir]) {

  console.log('==ENVIRONMENT==')
  console.log('ANIMATION_BASE_URL',ANIMATION_BASE_URL)

  const saveFiles = cleanSVGs(inputDir)

  console.log(`Generating ${saveFiles.length} tokens..`)
  
  const inputFiles = fs.readdirSync(inputDir)
    .filter(filename => filename.slice(-4) === 'json')
    .map(filename => path.join(inputDir, filename))
    .map(filepath => ({
      filename: getFileNameFromPath(filepath),
      filepath,
    }))
    .map(obj => ({
      ...obj,
      tokenId: tokenIdFromFilename(obj.filename),
      meta: fs.readJSONSync(obj.filepath)
    }))

  const outputDir = 'hall-of-egg/tokens'
  fs.ensureDirSync(outputDir)

  for (let fileObj of saveFiles) {
    const tokenId = tokenIdFromFilename(fileObj.fileName)
    const metaFile = inputFiles.find(file => file.tokenId === tokenId)
    const typeId = metaFile.meta.attributes.find(attr => attr.trait_type.toLowerCase() === 'type')?.value?.toLowerCase() || 'egg'
    const markup = await upgradeSVGMarkup2(fileObj.markup, { renames, typeId, tokenId, meta: metaFile.meta })
    const destinationPath = path.join(outputDir, fileObj.fileName.replace('svg', 'json'))

    const { generation, ...fitleredMeta } = metaFile.meta

    const image = 'data:image/svg+xml;base64,' + Buffer.from(markup).toString('base64')
    const tokenObj = {
      ...fitleredMeta,
      image,
      animation_url: `${ANIMATION_BASE_URL}?id=${metaFile.tokenId}`
    }
    
    fs.writeFileSync(path.join('build/' + fileObj.fileName), markup)
    fs.writeJSONSync(destinationPath, tokenObj)
    console.log('image copied to clipboard!')
    pbcopy(image)
  }

}

const [,,...args] = process.argv
start(args)