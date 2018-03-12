const Sequelize = require('sequelize')
// const DATABASE_URL = 'postgres://ucxlthzn:-qKra9DV7dDbQ2NSwJL0fgUV6-Zyp1Uf@horton.elephantsql.com:5432/ucxlthzn'
const DATABASE_URL = 'postgres://lucamattiazzi@localhost:5432/elezioni'

const sequelize = new Sequelize(
  DATABASE_URL,
  {
    logging: false,
    dialect: 'postgres',
    dialectOptions: { ssl: false },
  }
)

const nonNullable = (type, config) => (
  { type, allowNull: false, ...config }
)

const nullable = (type, config) => (
  { type, allowNull: true, ...config }
)

const Election = sequelize.define('election', {
  id: nonNullable(Sequelize.INTEGER, { primaryKey: true, autoIncrement: true }),
  date: nonNullable(Sequelize.DATE),
  camera: nonNullable(Sequelize.STRING),
}, { underscored: true })

const City = sequelize.define('city', {
  id: nonNullable(Sequelize.INTEGER, { primaryKey: true, autoIncrement: true }),
  name: nonNullable(Sequelize.STRING),
  region: nullable(Sequelize.STRING),
  province: nullable(Sequelize.STRING),
}, { underscored: true })

const Result = sequelize.define('vote', {
  id: nonNullable(Sequelize.INTEGER, { primaryKey: true, autoIncrement: true }),
  votes: nonNullable(Sequelize.INTEGER),
  party: nonNullable(Sequelize.STRING),
}, { underscored: true, timestamps: false })

Election.hasMany(City)
City.hasMany(Result)

Result.belongsTo(City)
City.belongsTo(Election)

const dbConnection = async () => {
  await sequelize.sync()
  return { Election, City, Result }
}

module.exports = { dbConnection }
