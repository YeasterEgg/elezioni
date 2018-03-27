import json
import psycopg2
import psycopg2.extras
import numpy as np
import os
import sys

from pdb import set_trace as shtap
from sklearn.decomposition import PCA

connect_str = "dbname='elezioni' user='lucamattiazzi' host='localhost'"
conn = psycopg2.connect(connect_str)
cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
dir_path = os.path.dirname(os.path.realpath(__file__))

class Clusterer:
  def __init__(self, id):
    self.election_id = id
    cursor.execute(f"""SELECT distance, position, cities.* FROM transposed_cities JOIN cities ON cities.id = transposed_cities.city_id WHERE election_id = {self.election_id}""")
    self.rows = cursor.fetchall()

  def pca(self):
    try:
      positions = [row["position"] for row in self.rows]
      keys = set([k for position in positions for k, v in position.items()])
      pca = PCA(n_components=3)
      center_row = {
        "distance": 0,
        "position": [0 for key in keys],
        "nome": 'Italia',
      }
      decorated_rows = [center_row]
      for row in self.rows:
        new_row = { **row }
        new_row["position"] = [row["position"].get(key, 0) for key in keys]
        decorated_rows.append(new_row)
      transformed = pca.fit_transform([row["position"] for row in decorated_rows])
      for idx, row in enumerate(decorated_rows):
        row["transformed"] = transformed[idx].tolist()
      with open(f"{dir_path}/pca/analysis_{self.election_id}.json", 'w') as f:
        json.dump(decorated_rows, f, ensure_ascii=False, indent=2)
    except:
      e = sys.exc_info()[0]
      print(e)
      shtap()

cursor.execute("""SELECT id FROM elections""")
ids = [id[0] for id in cursor.fetchall()]
for id in ids:
  print(f"Running election #{id}")
  clusterer = Clusterer(id)
  clusterer.pca()
