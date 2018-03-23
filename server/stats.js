const { groupBy, sumBy, sortBy } = require('lodash')

const measureDistance = center => position => {
  const distance = Object.keys(center).reduce((acc, party) => {
    const p0 = center[party]
    const p1 = position[party]
    return acc + (p0 - p1) ** 2
  }, 0)
  return Math.sqrt(distance)
}

const getClosest = ({ totalResults, groupedResults }) => {
  const sommaVotiTotale = sumBy(totalResults, d => Number(d.somma_voti))
  const center = totalResults.reduce((acc, party) => ({ ...acc, [party.partito]: 100 * Number(party.somma_voti) / sommaVotiTotale }), {})
  const dimensions = Object.keys(center)
  const distancer = measureDistance(center)
  const cities = Object.values(groupBy(groupedResults, 'city_id'))
  const decoratedCities = cities.map(city => {
    const sommaVoti = sumBy(city, d => Number(d.somma_voti))
    const position = dimensions.reduce((acc, party) => {
      const votes = city.find(v => v.partito === party)
      return {
        ...acc,
        [party]: votes ? 100 * Number(votes.somma_voti) / sommaVoti : 0,
      }
    }, {})
    const distance = distancer(position)
    const { comune } = city[0]
    const cityId = city[0].city_id
    return {
      position,
      distance,
      cityId,
      comune,
    }
  })
  return {
    closest: sortBy(decoratedCities, 'distance'),
    center,
  }
}

module.exports = { getClosest }
