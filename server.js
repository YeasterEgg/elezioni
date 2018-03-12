const express = require('express')
const cors = require('cors')
const { dbConnection } = require('./db')
const PORT = process.env.PORT || 3000
const app = express()
const corsOptions = {
  origin: (hostname, cb) => {
    cb(null, true)
  },
}

app.use(cors(corsOptions))

const startServer = async () => {
  const { Election, City, Result } = await dbConnection()

  const getElection = (req, res) => {
    const { date } = req.params
    const where = { date }
    const include = {
      model: City,
      include: {
        model: Result,
      },
    }
    const election = Election.findOne({ where, include })
    const payload = { success: true, payload: election }
    res.status(200).json(payload)
  }

  app.get('/', (req, res) => res.status(200).json({ success: 'Luca!' }))
  app.get('/:date', getElection)

  app.listen(PORT)
}

startServer()
