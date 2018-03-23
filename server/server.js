const express = require('express')
const cors = require('cors')
const { dbConnection } = require('../common/db')
const { getClosest } = require('./stats')
const PORT = process.env.PORT || 3000
const app = express()
const corsOptions = { origin: (hostname, cb) => cb(null, true) }

app.use(cors(corsOptions))

const AGGREGATED_VOTES_QUERY = id => `
SELECT
    SUM(voti) AS somma_voti,
    partito,
    cities.nome AS comune,
    city_id
FROM
    votes
JOIN cities ON cities.id = votes.city_id
WHERE election_id = ${id}
GROUP BY
    cities.nome,
    city_id,
    partito
ORDER BY
    comune ASC;
`

const VOTES_QUERY = id => `
SELECT
    SUM(voti) AS somma_voti,
    partito
FROM
    votes
WHERE election_id = 1
GROUP BY
    partito;
`

const routes = {
  '/elections': 'List all elections',
  '/elections/:id': 'Single election',
  '/elections/:id/results': 'Single election votes',
  '/elections/:id/closest': 'Election cities positions/closests, with [top] as query param',
  '/cities': 'List all cities',
  '/search': 'Search city by [nome, regione, provincia] as query params',
  '/cities/:id': 'Single city',
  '/cities/:id/results': 'Single city votes',
  '/results': 'Please don\'t. Really.',
}

const startServer = async () => {
  const { Election, City, Result, sequelize } = await dbConnection()

  const getAllInstances = model => async (req, res) => {
    const instances = await model.findAll()
    const payload = { success: true, payload: instances }
    res.status(200).json(payload)
  }

  const getSingleInstance = model => async (req, res) => {
    const { id } = req.params
    const instance = await model.findById(id)
    const payload = { success: true, payload: instance }
    res.status(200).json(payload)
  }

  const getSingleInstanceVotes = key => async (req, res) => {
    const { id } = req.params
    const where = { [key]: id }
    const votes = await Result.findAll({ where })
    const payload = { success: true, payload: votes }
    res.status(200).json(payload)
  }

  const searchCities = async (req, res) => {
    const { nome, regione, provincia } = req.query
    const { Op: { iLike } } = sequelize
    console.log(iLike)
    const where = {
      nome: { [iLike]: `%${nome || ''}%` },
      regione: { [iLike]: `%${regione || ''}%` },
      provincia: { [iLike]: `%${provincia || ''}%` },
    }
    const instances = await City.findAll({ where })
    const payload = { success: true, payload: instances }
    res.status(200).json(payload)
  }

  const getElectionCities = async (req, res) => {
    const { id } = req.params
    const { top } = req.query
    const cleanId = id.replace(/[^0-9]/g, '')
    const groupedQuery = AGGREGATED_VOTES_QUERY(cleanId)
    const totalQuery = VOTES_QUERY(cleanId)
    const groupedResults = (await sequelize.query(groupedQuery))[0]
    const totalResults = (await sequelize.query(totalQuery))[0]
    const { closest, center } = getClosest({ groupedResults, totalResults })
    const topClosest = top && !isNaN(Number(top))
      ? closest.slice(0, Number(top))
      : closest
    const payload = { success: true, payload: { topClosest, center } }
    res.status(200).json(payload)
  }

  const fakeResults = (req, res) => {
    res.status(200).send('If you really really need them, go to <code>/bunchofdata</code>')
  }

  app.get('/', (req, res) => res.status(200).json(routes))
  app.get('/elections/:id', getSingleInstance(Election))
  app.get('/elections/:id/results', getSingleInstanceVotes('election_id'))
  app.get('/elections/:id/closest', getElectionCities)
  app.get('/elections', getAllInstances(Election))
  app.get('/cities/:id', getSingleInstance(City))
  app.get('/cities/:id/results', getSingleInstanceVotes('city_id'))
  app.get('/cities', getAllInstances(City))
  app.get('/bunchofdata', getAllInstances(Result))
  app.get('/results', fakeResults)
  app.get('/search', searchCities)

  app.listen(PORT)
}

module.exports = { startServer }
