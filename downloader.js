const fs = require('fs')
const got = require('got')
const pMapSeries = require('p-map-series')
const { get } = require('lodash')

const wait = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))
const downloaded = fs.readFileSync('./downloaded.txt').toString().split('\n')

const start = async () => {
  const lines = fs.readFileSync('./href.txt').toString().split('\n')
  const iterator = async (href, idx) => {
    if (downloaded.indexOf(href) !== -1) {
      console.log(`Skipping ${idx}`)
    } else {
      try {
        const completeHref = `${href.replace('index', 'estrazione')}&ord=4`
        let error = true
        let errors = 0
        let csv
        while (error) {
          errors++
          csv = await got.get(completeHref)
          error = get(csv.headers, 'content-disposition') === undefined
          if (errors > 1) {
            console.log(`Trial #${errors} for ${idx}`)
          }
          await wait(errors * 200)
        }
        const text = csv.body
        const fileName = get(csv.headers, 'content-disposition').split('filename=')[1]
        fs.writeFileSync(`./results/${fileName}_${idx}`, text)
        console.log(`Downloading ${idx}`)
        fs.appendFileSync('./downloaded.txt', `${href}\n`)
      } catch (err) {
        console.log(`Error ${idx}`)
        fs.appendFileSync('./missing.txt', `${href}\n`)
      }
    }
  }
  await pMapSeries(lines, iterator)
  process.exit()
}

start()
