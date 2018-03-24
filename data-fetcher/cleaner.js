const fs = require('fs')
const xxhash = require('xxhash')
const files = fs.readdirSync('./downloaded_clean')

const removeDuplicates = () => {
  const hashes = []
  let duplicates = 0
  for (let i = 0; i < files.length; i++) {
    const fileName = files[i]
    const file = fs.readFileSync(`./downloaded_clean/${fileName}`)
    const hash = xxhash.hash(file, 0xCAFEBABE)
    if (hashes.indexOf(hash) !== -1) {
      fs.unlinkSync(`./downloaded_clean/${fileName}`)
      console.log(`deleted ${++duplicates}`)
      continue
    } else {
      hashes.push(hash)
    }
  }
}

removeDuplicates()

const removeEmptyLines = async () => {
  for (let i = 0; i < files.length; i++) {
    const fileName = files[i]
    const file = fs.readFileSync(`./downloaded_clean/${fileName}`)
    const lines = file.toString().split('\n')
    const cleanLines = lines.filter(r => r.length > 4)
    fs.writeFileSync(`./downloaded_clean/${fileName}`, cleanLines.join('\n'))
  }
}

removeEmptyLines()
