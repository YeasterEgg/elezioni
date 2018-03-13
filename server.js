const express = require('express')
const cors = require('cors')
const { dbConnection } = require('./db')
const PORT = process.env.PORT || 3000
const app = express()
const corsOptions = {
  origin: (hostname, cb) => cb(null, true),
}

app.use(cors(corsOptions))

const startServer = async () => {
  const { Election, City, Result } = await dbConnection()

  const getAllInstances = model => async (req, res) => {
    const instances = await model.findAll()
    const payload = { success: true, payload: instances }
    res.status(200).json(payload)
  }

  const getSingleInstance = model => async (req, res) => {
    const { id } = req.params
    const include = [{ model: Result }]
    const instance = await model.findById(id, { include })
    const payload = { success: true, payload: instance }
    res.status(200).json(payload)
  }

  app.get('/', (req, res) => res.status(200).json({ success: 'Luca!' }))
  app.get('/elections/:id', getSingleInstance(Election))
  app.get('/elections', getAllInstances(Election))
  app.get('/cities/:id', getSingleInstance(City))
  app.get('/cities', getAllInstances(City))

  app.listen(PORT)
}

startServer()
