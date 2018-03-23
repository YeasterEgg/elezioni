const fs = require('fs')
const moment = require('moment')
const decamelize = require('decamelize')
const files = fs.readdirSync('./downloaded_clean')
const comuni = JSON.parse(fs.readFileSync('./data/comuni.json').toString())
const { dbConnection } = require('./db')
const processed = fs.readFileSync('./data/processed.txt').toString().split('\n')

function Performances() {
  const self = this
  self.avgTime = 0
  self.processed = 0
  self.addTime = time => {
    const timeSoFar = self.avgTime * self.processed
    self.avgTime = (timeSoFar + time) / (self.processed + 1)
    self.processed += 1
  }
  return self
}

const additionalKeys = [
  'AreaGeo',
  'Regione',
  'Provincia',
  'PopResidente',
  'PopStraniera',
  'DensitaDemografica',
  'SuperficieKmq',
  'AltezzaCentro',
  'AltezzaMinima',
  'AltezzaMassima',
  'ZonaAltimetrica',
  'TipoComune',
  'GradoUrbaniz',
  'IndiceMontanita',
  'ZonaClimatica',
  'ZonaSismica',
  'ClasseComune',
  'Latitudine',
  'Longitudine',
]

const getDataFromRows = rows => {
  const keys = rows[0].split(';')
  const nameIdx = keys.indexOf('Ente')
  const partyIdx = keys.indexOf('Liste/Gruppi')
  const votesIdx = keys.indexOf('Voti')
  const values = rows.slice(1).filter(row => {
    return row.split(';')[3].length === 0
  }).map(row => ({
    nome: row.split(';')[nameIdx],
    voti: row.split(';')[votesIdx],
    partito: row.split(';')[partyIdx],
  }))
  return values
}

const cleanAndCapitalize = t => {
  const clean = t.replace(/[^A-Za-z ']/g, '')
  return clean[0].toUpperCase() + clean.slice(1).toLowerCase()
}

const selectCorrectData = cityData => {
  const additionalData = comuni.filter(c => (
    c.Comune.toUpperCase() === cityData.nome.toUpperCase()
  ))
  if (additionalData.length === 1) return additionalData[0]
  const locationData = [
    cityData.nome.toUpperCase(),
    cityData.regione.toUpperCase(),
    cityData.provincia.toUpperCase(),
  ]
  fs.appendFileSync('./data/undefined.txt', `${locationData.join(',')}\n`)
  return cityData
}

const extractData = cityData => {
  const data = selectCorrectData(cityData)
  const values = additionalKeys.reduce((acc, k) => {
    const key = decamelize(k)
    const value = data[k]
      ? data[k].toString()
      : cityData[key]
    return {
      ...acc,
      [key]: value,
    }
  }, {})
  return values
}

const formatMissing = time => {
  const seconds = Math.floor(time % 60)
  const minutes = Math.floor(((time - seconds) / 60) % 60)
  const hours = Math.floor(((time - seconds) - 60 * minutes) / 3600)
  return `${hours} h, ${minutes} m, ${seconds} s`
}

const start = async () => {
  const { Election, City, Result } = await dbConnection()
  const performances = new Performances()
  for (let i = 0; i < files.length; i++) {
    const startTime = Date.now()
    const file = files[i]
    if (processed.indexOf(file) !== -1) {
      console.log(`File ${i}/${files.length} - Skipping file!`)
      continue
    } else {
      console.log(file)
      const missing = (files.length - i) * performances.avgTime
      console.log(`File ${i}/${files.length} - ${formatMissing(missing)} to go`)
    }
    const allRows = fs.readFileSync(`./downloaded_clean/${file}`).toString().split('\n')
    const validRows = getDataFromRows(allRows)
    const [day, month, year] = file.split('-')[2].split('_')
    const where = {
      camera: 'Camera',
      data: moment.utc({ day, month, year }),
    }
    const [election] = await Election.findOrCreate({ where })
    const [dirtyRegion, dirtyProvince] = file.split('-Comune.csv')[0].split('-').slice(-2)
    const regione = cleanAndCapitalize(dirtyRegion)
    const provincia = cleanAndCapitalize(dirtyProvince)
    const cityData = {
      regione,
      provincia,
    }
    for (let j = 0; j < validRows.length; j++) {
      const row = validRows[j]
      const { voti, partito, nome } = row
      const namedCityData = { ...cityData, nome: cleanAndCapitalize(nome) }
      const additionalData = extractData(namedCityData)
      const completeCity = { ...namedCityData, ...additionalData }
      const validCity = Object.keys(completeCity).reduce((acc, k) => {
        return completeCity[k] === undefined || completeCity[k] === null
          ? acc
          : { ...acc, [k]: completeCity[k] }
      }, {})
      const [city] = await City.findOrCreate({ where: validCity })
      const resultData = {
        city_id: city.id,
        election_id: election.id,
        partito,
      }
      const additional = {
        voti: voti || 0,
      }
      // await Result.findOrCreate({ where: resultData, defaults: additional })
      await Result.create({ ...resultData, ...additional })
    }
    fs.appendFileSync('./data/processed.txt', `${file}\n`)
    const endTime = Date.now()
    const elapsedTime = (endTime - startTime) / 1000
    performances.addTime(elapsedTime)
    console.log(`Took ${elapsedTime} - AVG ${performances.avgTime}`)
  }
  process.exit()
}

start()
