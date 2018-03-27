const { groupBy, sumBy, sortBy } = require('lodash')

const measureDistance = position => {
  const distance = Object.keys(position).reduce((acc, party) => {
    const p1 = position[party]
    return acc + p1 ** 2
  }, 0)
  return Math.sqrt(distance)
}

const getClosest = ({ totalResults, groupedResults }) => {
  const sommaVotiTotale = sumBy(totalResults, d => Number(d.somma_voti))
  const center = totalResults.reduce((acc, party) => ({ ...acc, [party.partito]: 100 * Number(party.somma_voti) / sommaVotiTotale }), {})
  const dimensions = Object.keys(center)
  const cities = Object.values(groupBy(groupedResults, 'city_id'))
  const decoratedCities = cities.map(city => {
    const sommaVoti = sumBy(city, d => Number(d.somma_voti))
    const position = dimensions.reduce((acc, party) => {
      const votes = city.find(v => v.partito === party)
      const percVotes = votes === undefined || sommaVoti === 0
        ? 0
        : 100 * Number(votes.somma_voti) / sommaVoti
      const centeredVotes = percVotes - center[party]
      return {
        ...acc,
        [party]: centeredVotes,
      }
    }, {})
    const distance = measureDistance(position)
    const { comune } = city[0]
    const cityId = city[0].city_id
    if (isNaN(distance)) {
      debugger
    }
    return {
      position,
      distance,
      cityId,
      comune,
    }
  })
  return sortBy(decoratedCities, 'distance')
}

module.exports = { getClosest }
