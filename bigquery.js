const path = require('path')
const BigQuery = require('@google-cloud/bigquery')
const DATASET_NAME = 'elezioni'

const ELECTIONS_SCHEMA = {
  fields: [
    { name: 'id', type: 'INT64' },
    { name: 'date', type: 'DATETIME' },
    { name: 'camera', type: 'STRING' },
  ],
}

const CITIES_SCHEMA = {
  fields: [
    { name: 'id', type: 'INTEGER' },
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
    { name: 'id', type: 'INTEGER' },
    { name: 'votes', type: 'INTEGER' },
    { name: 'party', type: 'STRING' },
    { name: 'city_id', type: 'INTEGER' },
    { name: 'election_id', type: 'INTEGER' },
  ],
}

class Table {
  constructor(dataset, name, schema) {
    this.dataset = dataset
    this.table = dataset.table(name)
    this.name = name
    this.schema = schema
  }

  async create() {
    const exists = await this.table.exists()
    if (!exists[0]) {
      await this.dataset.createTable(this.name, { schema: this.schema })
    }
  }

  async addRow(row) {
    const results = await this.table.insert(row)
    return results
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
    const elections = await new Table(this.dataset, 'elections', ELECTIONS_SCHEMA)
    await elections.create()
    const cities = await new Table(this.dataset, 'cities', CITIES_SCHEMA)
    await cities.create()
    const results = await new Table(this.dataset, 'results', RESULTS_SCHEMA)
    await results.create()
    this.tables = { elections, cities, results }
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
  return database
}

module.exports = { dbConnection }
