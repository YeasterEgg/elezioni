const { map } = require('lodash')
const pMapSeries = require('p-map-series')
const { dbConnection } = require('../common/db')
const { getClosest } = require('./stats')

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

const start = async () => {
  const { Election, sequelize, TransposedCity } = await dbConnection()
  const allElections = await Election.findAll({ attributes: ['id'] })
  const ids = map(allElections, 'id')
  const creator = electionId => async city => {
    await TransposedCity.create({
      city_id: city.cityId,
      election_id: electionId,
      distance: city.distance,
      position: city.position,
    })
  }
  const iterator = async id => {
    const groupedQuery = AGGREGATED_VOTES_QUERY(id)
    const totalQuery = VOTES_QUERY(id)
    const groupedResults = (await sequelize.query(groupedQuery))[0]
    const totalResults = (await sequelize.query(totalQuery))[0]
    const sortedByDistance = getClosest({ groupedResults, totalResults })
    await pMapSeries(sortedByDistance, creator(id))
    return sortedByDistance
  }
  await pMapSeries(ids, iterator)
  process.exit()
}

start()
