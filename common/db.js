const Sequelize = require('sequelize')
const DATABASE_URL = process.env.DATABASE_URL ||
  'postgres://lucamattiazzi@localhost:5432/elezioni'
const SSL = process.env.DATABASE_URL !== undefined

const sequelize = new Sequelize(
  DATABASE_URL,
  {
    logging: false,
    dialect: 'postgres',
    dialectOptions: { ssl: SSL },
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
  data: nonNullable(Sequelize.DATE),
  camera: nonNullable(Sequelize.STRING),
}, { underscored: true, timestamps: false })

const City = sequelize.define('city', {
  id: nonNullable(Sequelize.INTEGER, { primaryKey: true, autoIncrement: true }),
  nome: nonNullable(Sequelize.STRING),
  regione: nullable(Sequelize.STRING),
  provincia: nullable(Sequelize.STRING),
  area_geo: nullable(Sequelize.STRING),
  pop_residente: nullable(Sequelize.STRING),
  pop_straniera: nullable(Sequelize.STRING),
  densita_demografica: nullable(Sequelize.STRING),
  superficie_kmq: nullable(Sequelize.STRING),
  altezza_centro: nullable(Sequelize.STRING),
  altezza_minima: nullable(Sequelize.STRING),
  altezza_massima: nullable(Sequelize.STRING),
  zona_altimetrica: nullable(Sequelize.STRING),
  tipo_comune: nullable(Sequelize.STRING),
  grado_urbaniz: nullable(Sequelize.STRING),
  indice_montanita: nullable(Sequelize.STRING),
  zona_climatica: nullable(Sequelize.STRING),
  zona_sismica: nullable(Sequelize.STRING),
  classe_comune: nullable(Sequelize.STRING),
  latitudine: nullable(Sequelize.STRING),
  longitudine: nullable(Sequelize.STRING),
}, { underscored: true, timestamps: false })

const Result = sequelize.define('vote', {
  id: nonNullable(Sequelize.INTEGER, { primaryKey: true, autoIncrement: true }),
  voti: nonNullable(Sequelize.INTEGER),
  partito: nonNullable(Sequelize.STRING),
}, { underscored: true, timestamps: false })

Election.hasMany(Result)
City.hasMany(Result)

Result.belongsTo(City)
Result.belongsTo(Election)

const dbConnection = async () => {
  await sequelize.sync()
  return { Election, City, Result, sequelize }
}

module.exports = { dbConnection }
