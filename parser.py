import scrapy
from scrapy.http import Request
from pdb import set_trace as shtap
from random import choice

BASE_URL = 'http://elezionistorico.interno.gov.it'
FIRST_PATH = '/index.php?tpel=C'

class ElectionSpider(scrapy.Spider):
  name = 'electionSpider'
  start_urls = [BASE_URL + FIRST_PATH]
  download_delay = 2

  def parse(self, response):
    for date in response.css('#collapseTwo .sezione_ristretta li a'):
      path = date.css('a::attr(href)').extract_first()
      request = Request(url=BASE_URL + path, callback=self.parse_date)
      yield request

  def parse_date(self, response):
    for area in response.css('#collapseThree .sezione li a'):
      path = area.css('a::attr(href)').extract_first()
      request = Request(BASE_URL + path, callback=self.parse_area)
      yield request

  def parse_area(self, response):
    for area in response.css('#collapseFour .sezione li a'):
      path = area.css('a::attr(href)').extract_first()
      request = Request(BASE_URL + path, callback=self.parse_circumscription)
      yield request

  def parse_circumscription(self, response):
    for area in response.css('#collapseFive .sezione li a'):
      path = area.css('a::attr(href)').extract_first()
      request = Request(BASE_URL + path, callback=self.parse_province)
      yield request

  def parse_province(self, response):
    for area in response.css('#collapseSix .sezione li a'):
      path = area.css('a::attr(href)').extract_first()
      final_path = (BASE_URL + path + '&ord=4').replace('index', 'estrazione')
      yield { "href": final_path }
