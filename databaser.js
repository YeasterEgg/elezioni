const fs = require('fs')
const moment = require('moment')
const decamelize = require('decamelize')
const files = fs.readdirSync('./downloaded')
const comuni = JSON.parse(fs.readFileSync('./data/comuni.json').toString())
const { dbConnection } = require('./db')

const additionalKeys = [
  'AreaGeo',
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

const cleanAndCapitalize = t => {
  const clean = t.replace(/[^A-Za-z ']/g, '')
  return clean[0].toUpperCase() + clean.slice(1).toLowerCase()
}

const selectCorrectData = (additionalData, cityData) => {
  if (additionalData.length === 0) return {}
  if (additionalData.length === 1) return additionalData[0]
  const betterChoice = additionalData.find(d => (
    d.Provincia.toUpperCase() === cityData.province.toUpperCase() ||
    d.Regione.toUpperCase() === cityData.region.toUpperCase()
  ))
  return betterChoice
}

const extractData = (additionalData, cityData) => {
  const data = selectCorrectData(additionalData, cityData)
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
    const file = files[i]
    const allRows = fs.readFileSync(`./downloaded/${file}`).toString().split('\n')
    const validRows = allRows.filter(row => (
      row.length > 3 &&
      row.slice(0, 4) !== 'Ente'
    ))
    const [ day, month, year ] = file.split('-')[2].split('_')
    const where = {
      camera: 'Camera',
      date: moment.utc({ day, month, year }),
    }
    const [ election ] = await Election.findOrCreate({ where })
    const name = cleanAndCapitalize(validRows[0].split(';')[0])
    const [dirtyRegion, dirtyProvince] = file.split('-Comune.csv')[0].split('-').slice(-2)
    const region = cleanAndCapitalize(dirtyRegion)
    const province = cleanAndCapitalize(dirtyProvince)
    const cityData = {
      name,
      region,
      province,
      election_id: election.id,
    }
    const additionalData = comuni.filter(c => (
      c.Comune.toUpperCase() === name.toUpperCase()
    ))
    const geographicData = extractData(additionalData, cityData)
    debugger
    const city = await City.create(cityData)
    validRows.forEach(async (row, jdx) => {
      const [ ,, gruppo, voti ] = row.split(';')
      const resultData = {
        votes: voti,
        party: gruppo,
        city_id: city.id,
      }
      await Result.create(resultData)
    })
  }
}

start()
