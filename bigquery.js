const path = require('path')
const BigQuery = require('@google-cloud/bigquery')
const DATASET_NAME = 'elezioni'

const ELECTIONS_SCHEMA = {
  fields: [
    { name: 'uid', type: 'STRING' },
    { name: 'date', type: 'DATETIME' },
    { name: 'camera', type: 'STRING' },
  ],
}

const CITIES_SCHEMA = {
  fields: [
    { name: 'uid', type: 'STRING' },
    { name: 'name', type: 'STRING' },
    { name: 'regione', type: 'STRING' },
    { name: 'provincia', type: 'STRING' },
    { name: 'area_geo', type: 'STRING' },
    { name: 'pop_residente', type: 'STRING' },
    { name: 'pop_straniera', type: 'STRING' },
    { name: 'densita_demografica', type: 'STRING' },
    { name: 'superficie_kmq', type: 'STRING' },
    { name: 'altezza_centro', type: 'STRING' },
    { name: 'altezza_minima', type: 'STRING' },
    { name: 'altezza_massima', type: 'STRING' },
    { name: 'zona_altimetrica', type: 'STRING' },
    { name: 'tipo_comune', type: 'STRING' },
    { name: 'grado_urbaniz', type: 'STRING' },
    { name: 'indice_montanita', type: 'STRING' },
    { name: 'zona_climatica', type: 'STRING' },
    { name: 'zona_sismica', type: 'STRING' },
    { name: 'classe_comune', type: 'STRING' },
    { name: 'latitudine', type: 'STRING' },
    { name: 'longitudine', type: 'STRING' },
  ],
}

const RESULTS_SCHEMA = {
  fields: [
    { name: 'votes', type: 'INTEGER' },
    { name: 'party', type: 'STRING' },
    { name: 'city_uid', type: 'STRING' },
    { name: 'election_uid', type: 'STRING' },
  ],
}

class Table {
  constructor(dataset, name, schema) {
    this.dataset = dataset
    this.table = dataset.table(name)
    this.name = name
    this.schema = schema
    this.created = false
  }

  createQuery(where) {
    const clauses = Object.entries(where).map(([k, v]) => `${k} = '${v.value || v}'`).join(' AND ')
    const query = `SELECT * FROM ${this.name} WHERE ${clauses}`
    return query
  }

  async createTable() {
    const exists = await this.table.exists()
    if (!exists[0]) await this.dataset.createTable(this.name, { schema: this.schema })
    this.created = true
    return this
  }

  async addRow(row) {
    const results = await this.table.insert(row)
    return results
  }

  async create(rows) {
    const newRows = await this.table.insert(rows)
    return newRows
  }

  async findOrCreate({ where, defaults = {} }) {
    const query = this.createQuery(where)
    const results = await this.table.query(query)
    const row = results[0][0]
    if (row) return row
    const data = Object.assign({}, where, defaults)
    await this.table.insert(data)
    return data
  }
}

class Dataset {
  constructor(dataset) {
    this.bigquery = BigQuery({
      projectId: 'accurat-places',
      keyFilename: path.join(__dirname, './places-59b8e6fc32dc.json'),
    })
    this.dataset = this.bigquery.dataset(dataset)
  }

  async addTables() {
    const Election = await new Table(this.dataset, 'elections', ELECTIONS_SCHEMA)
    await Election.createTable()
    const City = await new Table(this.dataset, 'cities', CITIES_SCHEMA)
    await City.createTable()
    const Result = await new Table(this.dataset, 'results', RESULTS_SCHEMA)
    await Result.createTable()
    this.tables = { Election, City, Result }
  }

  async getTables() {
    const tables = await this.dataset.getTables()
    return tables
  }

  async writeRow(table, row) {
    const results = await this.tables[table].insert(row)
    return results
  }
}

const dbConnection = async () => {
  const database = new Dataset(DATASET_NAME)
  await database.addTables()
  return database.tables
}

module.exports = { dbConnection }
