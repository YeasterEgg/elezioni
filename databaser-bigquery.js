const fs = require('fs')
const moment = require('moment')
const decamelize = require('decamelize')
const files = fs.readdirSync('./downloaded')
const comuni = JSON.parse(fs.readFileSync('./data/comuni.json').toString())
const { dbConnection } = require('./bigquery')

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
  const clean = t.replace(/[^A-Za-z ']/g, '')
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

const start = async () => {
  const { Election, City, Result } = await dbConnection()
  for (let i = 0; i < files.length; i++) {
    console.log(`File ${i}/${files.length}`)
    const file = files[i]
    const allRows = fs.readFileSync(`./downloaded/${file}`).toString().split('\n')
    const validRows = getDataFromRows(allRows)
    const [day, month, year] = file.split('-')[2].split('_')
    const where = {
      camera: 'Camera',
      date: moment.utc({ day, month, year }),
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
      const { votes, party, name } = row
      const namedCityData = { ...cityData, name: cleanAndCapitalize(name) }
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
        party,
      }
      const additional = {
        votes: votes || 0,
      }
      await Result.findOrCreate({ where: resultData, defaults: additional })
    }
  }
  process.exit()
}

start()
