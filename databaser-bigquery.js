const fs = require('fs')
const moment = require('moment')
const decamelize = require('decamelize')
const BigQuery = require('@google-cloud/bigquery')
const uuid = require('uuid/v4')
const files = fs.readdirSync('./downloaded')
const comuni = JSON.parse(fs.readFileSync('./data/comuni.json').toString())
const { dbConnection } = require('./bigquery')
const databasedList = fs.readFileSync('./data/databased.txt').toString().split('\n')

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
  const usefulRows = rows.filter(r => r.length > 4)
  const keys = usefulRows[0].split(';')
  const nameIdx = keys.indexOf('Ente')
  const partyIdx = keys.indexOf('Liste/Gruppi')
  const votesIdx = keys.indexOf('Voti')
  const values = usefulRows.slice(1).map(row => ({
    name: row.split(';')[nameIdx],
    votes: row.split(';')[votesIdx],
    party: row.split(';')[partyIdx],
  }))
  return values
}

const cleanAndCapitalize = t => {
  const clean = t.replace(/[^A-Za-z ]/g, '').replace(/'/g, '\'')
  return clean[0].toUpperCase() + clean.slice(1).toLowerCase()
}

const selectCorrectData = cityData => {
  const additionalData = comuni.filter(c => (
    c.Comune.toUpperCase() === cityData.name.toUpperCase()
  ))
  if (additionalData.length === 1) return additionalData[0]
  const locationData = [
    cityData.name.toUpperCase(),
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

const getCityData = City => (name, fallbackData) => {
  const namedCityData = { ...fallbackData, name }
  const additionalData = extractData(namedCityData)
  const completeCity = { ...namedCityData, ...additionalData }
  const validCity = Object.keys(completeCity).reduce((acc, k) => {
    return completeCity[k] === undefined || completeCity[k] === null
      ? acc
      : { ...acc, [k]: completeCity[k] }
  }, {})
  return validCity
}

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

const formatMissing = time => {
  const seconds = Math.floor(time % 60)
  const minutes = Math.floor(((time - seconds) / 60) % 60)
  const hours = Math.floor(((time - seconds) - 60 * minutes) / 3600)
  return `${hours} h, ${minutes} m, ${seconds} s`
}

const start = async () => {
  const { Election, City, Result } = await dbConnection()
  const cityDataGetter = getCityData(City)
  const performances = new Performances()
  for (let i = 0; i < files.length; i++) {
    const startTime = Date.now()
    const file = files[i]
    if (databasedList.indexOf(file) !== -1) {
      console.log(`Skipping file ${i}/${files.length}`)
      continue
    } else {
      const missing = (files.length - i) * performances.avgTime
      console.log(`File ${i}/${files.length} - ${formatMissing(missing)} to go`)
    }
    const allRows = fs.readFileSync(`./downloaded/${file}`).toString().split('\n')
    const validRows = getDataFromRows(allRows)
    const [day, month, year] = file.split('-')[2].split('_')
    const momentDate = moment.utc({ day, month, year })
    const election = {
      camera: 'Camera',
      date: BigQuery.datetime(momentDate.format('YYYY-MM-DD HH:mm:ss')),
    }
    await Election.findOrCreate({ where: election })
    const [dirtyRegion, dirtyProvince] = file.split('-Comune.csv')[0].split('-').slice(-2)
    const regione = cleanAndCapitalize(dirtyRegion)
    const provincia = cleanAndCapitalize(dirtyProvince)
    const cityData = {
      regione,
      provincia,
    }
    const cityRows = {}
    for (let j = 0; j < validRows.length; j++) {
      const row = validRows[j]
      const { votes, party, name } = row
      const cleanName = cleanAndCapitalize(name)
      const city = cityRows[cleanName]
        ? cityRows[cleanName]
        : { city: cityDataGetter(cleanName, cityData), votes: [] }
      const resultData = {
        city_name: city.city.name,
        city_regione: city.city.regione,
        election_camera: election.camera,
        election_date: election.date,
        party,
        votes: votes || 0,
      }
      city.votes.push(resultData)
      cityRows[cleanName] = city
    }
    for (let k = 0; k < Object.keys(cityRows).length; k++) {
      const cityName = Object.keys(cityRows)[k]
      const { votes, city } = cityRows[cityName]
      await Result.create(votes)
      await City.findOrCreate({ where: city })
    }
    fs.appendFileSync('./data/databased.txt', `${file}\n`)
    const endTime = Date.now()
    const elapsedTime = (endTime - startTime) / 1000
    performances.addTime(elapsedTime)
    console.log(`Took ${elapsedTime} - AVG ${performances.avgTime}`)
  }
  process.exit()
}

start()
