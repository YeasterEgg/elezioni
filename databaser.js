const fs = require('fs')
const moment = require('moment')
const decamelize = require('decamelize')
const files = fs.readdirSync('./downloaded')
const comuni = JSON.parse(fs.readFileSync('./data/comuni.json').toString())
const { dbConnection } = require('./db')

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
    cityData.region.toUpperCase(),
    cityData.province.toUpperCase(),
  ]
  fs.appendFileSync('./data/undefined.txt', `${locationData.join(',')}\n`)
  return {}
}

const extractData = cityData => {
  const data = selectCorrectData(cityData)
  const values = additionalKeys.reduce((acc, k) => {
    return {
      ...acc,
      [decamelize(k)]: data[k],
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
    const [ day, month, year ] = file.split('-')[2].split('_')
    const where = {
      camera: 'Camera',
      date: moment.utc({ day, month, year }),
    }
    const [ election ] = await Election.findOrCreate({ where })
    const name = cleanAndCapitalize(validRows[0].name)
    const [dirtyRegion, dirtyProvince] = file.split('-Comune.csv')[0].split('-').slice(-2)
    const region = cleanAndCapitalize(dirtyRegion)
    const province = cleanAndCapitalize(dirtyProvince)
    const cityData = {
      name,
      region,
      province,
    }
    const additionalData = extractData(cityData)
    const completeCity = { name, ...additionalData }
    const [ city ] = await City.findOrCreate({ where: completeCity })
    for (let j = 0; j < validRows.length; j++) {
      const row = validRows[j]
      const { votes, party } = row
      const resultData = {
        city_id: city.id,
        election_id: election.id,
        party,
      }
      const additional = {
        votes,
      }
      await Result.findOrCreate({ where: resultData, defaults: additional })
    }
  }
  process.exit()
}

start()
