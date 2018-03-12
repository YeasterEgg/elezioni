const fs = require('fs')
const puppeteer = require('puppeteer')
const pMapSeries = require('p-map-series')
const { flatten } = require('lodash')
const BASE_URL = 'http://elezionistorico.interno.gov.it/index.php?tpel=C'

const readDates = () => {
  const dateElements = document.querySelectorAll('#collapseTwo .sezione_ristretta li a')
  const dateHrefs = Array.apply(undefined, dateElements).map(n => n.href)
  return dateHrefs
}

const readAreas = () => {
  const dateElements = document.querySelectorAll('#collapseThree .sezione li a')
  const dateHrefs = Array.apply(undefined, dateElements).map(n => n.href)
  return dateHrefs
}

const readCircumscription = () => {
  const dateElements = document.querySelectorAll('#collapseFour .sezione li a')
  const dateHrefs = Array.apply(undefined, dateElements).map(n => n.href)
  return dateHrefs
}

const readProvince = () => {
  const dateElements = document.querySelectorAll('#collapseFive .sezione li a')
  const dateHrefs = Array.apply(undefined, dateElements).map(n => n.href)
  return dateHrefs
}

const readCity = () => {
  const dateElements = document.querySelectorAll('#collapseSix .sezione li a')
  const dateHrefs = Array.apply(undefined, dateElements).map(n => n.href)
  return dateHrefs
}

function Parser() {
  const self = this
  self.dateHrefs = []
  self.areaHrefs = []
  self.circumscriptionHrefs = []
  self.provinceHrefs = []
  self.cityHrefs = []

  self.start = async () => {
    self.browser = await puppeteer.launch({
      headless: true,
    })
  }

  self.newPage = async () => {
    const page = await self.browser.newPage()
    return page
  }

  self.getAllPages = async () => {
    self.dateHrefs = await self.getDates()
    console.log(`${self.dateHrefs.length} dates`)
    const nestedAreas = await pMapSeries(self.dateHrefs, self.getAreas)
    self.areaHrefs = flatten(nestedAreas)
    console.log(`${self.areaHrefs.length} areas`)
    const nestedCircumscriptions = await pMapSeries(self.areaHrefs, self.getCircumscriptions)
    self.circumscriptionHrefs = flatten(nestedCircumscriptions)
    console.log(`${self.circumscriptionHrefs.length} circums`)
    const nestedProvinces = await pMapSeries(self.circumscriptionHrefs, self.getProvinces)
    self.provinceHrefs = flatten(nestedProvinces)
    console.log(`${self.provinceHrefs.length} provinces`)
    await pMapSeries(self.provinceHrefs, self.getCities)
    // const nestedCities = await pMapSeries(self.provinceHrefs, self.getCities)
    // self.cityHrefs = flatten(nestedCities)
  }

  self.getDates = async () => {
    const page = await self.newPage()
    await page.goto(BASE_URL, { waitUntil: 'load' })
    const hrefs = await page.evaluate(readDates)
    await page.close()
    return hrefs
  }

  self.getAreas = async url => {
    const page = await self.newPage()
    await page.goto(url, { waitUntil: 'load' })
    const hrefs = await page.evaluate(readAreas)
    await page.close()
    return hrefs
  }

  self.getCircumscriptions = async url => {
    const page = await self.newPage()
    await page.goto(url, { waitUntil: 'load' })
    const hrefs = await page.evaluate(readCircumscription)
    await page.close()
    return hrefs
  }

  self.getProvinces = async url => {
    const page = await self.newPage()
    await page.goto(url, { waitUntil: 'load' })
    const hrefs = await page.evaluate(readProvince)
    await page.close()
    return hrefs
  }

  self.getCities = async url => {
    const page = await self.newPage()
    await page.goto(url, { waitUntil: 'load' })
    const hrefs = await page.evaluate(readCity)
    await page.close()
    hrefs.forEach(href => {
      fs.appendFileSync('./all-hrefs.txt', `${href}\n`)
    })
  }
}

const start = async () => {
  const parser = new Parser()
  await parser.start()
  await parser.getAllPages()
  console.log('done')
  process.exit()
}

start()
