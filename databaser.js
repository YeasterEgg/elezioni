const fs = require('fs')
const moment = require('moment')
const files = fs.readdirSync('./all')
const { dbConnection } = require('./db')

const cleanAndCapitalize = t => {
  const clean = t.replace(/[^A-Za-z ']/g, '')
  return clean[0].toUpperCase() + clean.slice(1).toLowerCase()
}

const start = async () => {
  const { Election, City, Result } = await dbConnection()
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const allRows = fs.readFileSync(`./all/${file}`).toString().split('\n')
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
    const place = validRows[0].split(';')[0]
    const [region, province] = file.split('-Comune.csv')[0].split('-').slice(-2)
    const cityData = {
      name: place,
      region: cleanAndCapitalize(region),
      province: cleanAndCapitalize(province),
      election_id: election.id,
    }
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
