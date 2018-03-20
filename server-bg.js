const express = require('express')
const cors = require('cors')
const { dbConnection } = require('./bigquery')
const PORT = process.env.PORT || 3000
const app = express()
const corsOptions = {
  origin: (hostname, cb) => cb(null, true),
}

app.use(cors(corsOptions))

const routes = {
  '/elections': 'List all elections',
  '/elections/:id': 'Single election and its votes',
  '/cities': 'List all cities',
  '/cities/:id': 'Single city and its votes',
}

const startServer = async () => {
  const { Election, City } = await dbConnection()

  const getAllInstances = model => async (req, res) => {
    const instances = await model.getRows()
    const payload = { success: true, payload: instances }
    res.status(200).json(payload)
  }

  const getSingleInstance = model => async (req, res) => {
    const { uid } = req.params
    const instance = await model.getInstance(uid)
    const payload = { success: true, payload: instance }
    res.status(200).json(payload)
  }

  const getSingleInstanceResults = model => async (req, res) => {
    const { uid } = req.params
    const instance = await model.getResults(uid)
    const payload = { success: true, payload: instance }
    res.status(200).json(payload)
  }

  app.get('/', (req, res) => res.status(200).json(routes))
  app.get('/elections/:uid', getSingleInstance(Election))
  app.get('/elections/:uid/results', getSingleInstanceResults(Election))
  app.get('/elections', getAllInstances(Election))
  app.get('/cities/:uid', getSingleInstance(City))
  app.get('/cities/:uid/results', getSingleInstanceResults(City))
  app.get('/cities', getAllInstances(City))

  app.listen(PORT)
}

startServer()
