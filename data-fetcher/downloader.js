const fs = require('fs')
const got = require('got')
const pMapSeries = require('p-map-series')
const { get } = require('lodash')

const wait = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))
const downloaded = fs.readFileSync('./data/downloaded.txt').toString().split('\n')

const extraKeys = ['tpe', 'lev3', 'levsut3', 'ne3', 'es0', 'es1', 'es2', 'es3', 'ms']

const removeQueryKeys = (href, keys = []) => {
  const [url, queryString] = href.split('?')
  const queries = queryString.split('&').filter(query => {
    const [key] = query.split('=')
    return keys.indexOf(key) === -1
  }).join('&')
  return `${url}?${queries}`
}

const start = async () => {
  const lines = fs.readFileSync('./crawled/results.txt').toString().split('\n')
  const iterator = async (href, idx) => {
    if (downloaded.indexOf(href) !== -1) {
      console.log(`Skipping ${idx}`)
    } else {
      try {
        let csv
        let requestHref = href
        while (true) {
          csv = await got.get(requestHref)
          const error = get(csv.headers, 'content-disposition') === undefined
          if (error) {
            requestHref = `${removeQueryKeys(href, extraKeys)}&tpest=l`
            await wait(200)
          } else {
            await wait(200)
            break
          }
        }
        const text = csv.body
        const fileName = get(csv.headers, 'content-disposition').split('filename=')[1]
        fs.writeFileSync(`./downloaded/${fileName}_${idx}`, text)
        console.log(`Downloading ${idx}`)
        fs.appendFileSync('./data/downloaded.txt', `${href}\n`)
      } catch (err) {
        console.log(`Error ${idx}`)
        fs.appendFileSync('./data/missing.txt', `${href}\n`)
      }
    }
  }
  await pMapSeries(lines, iterator)
  process.exit()
}

start()