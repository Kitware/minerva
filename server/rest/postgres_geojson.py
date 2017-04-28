import ast
import json
import StringIO

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource
from girder.utility.model_importer import ModelImporter
from girder.utility import assetstore_utilities, progress
from girder.plugins.minerva.rest.geojson_dataset import GeojsonDataset
from girder.plugins.minerva.utility.minerva_utility import findPublicFolder
from girder.plugins.database_assetstore.rest import DatabaseAssetstoreResource


class PostgresGeojson(Resource):

    def __init__(self):
        self.resourceName = 'minerva_postgres_geojson'
        self.route('GET', (), self.postgresGeojson)
        self.route('GET', ('geojson', ), self.getGeojson)
        self.route('GET', ('tables', ), self.getTables)

    @access.user
    def getTables(self, params):
        currentUser = self.getCurrentUser()
        publicFolder = findPublicFolder(currentUser, currentUser)
        assetstores =  ModelImporter.model('assetstore').list(limit=10)
        astore = [a for a in assetstores if a['name'] == 'dbAssetstore']
        dbName = astore[0]['database']['uri'].rsplit('/', 1)[-1]
        adapter = assetstore_utilities.getAssetstoreAdapter(astore[0])
        table = 'information_schema.tables'
        params = {
            'tables': [{'name':'{}'.format(table),
                        'database':'{}'.format(dbName),
                        'table': 'tables',
                        'schema': 'information_schema'}],
            'fields': ['table_name'],
            'filters': [['table_schema', 'public']],
            'limit': 100,
            'format': 'json'
        }
        # Create the item
        adapter.importData(publicFolder, 'folder', params,
                           progress.noProgress, currentUser)
        resItem = list(ModelImporter.model("item").textSearch(table))[0]
        resFile = list(self.model('item').childFiles(item=resItem))[0]
        func = adapter.downloadFile(resFile, headers=False,
                                    extraParameters=params)

        return json.loads(list(func())[0])

    getTables.description = (
        Description('Get a list of tables')
    )

    @access.user
    def postgresGeojson(self, params):
        conn = connect_to_gryphon()
        view = View(conn, params)
        return view.filter()

    @access.user
    def getGeojson(self, params):
        conn = connect_to_gryphon()
        view = View(conn, params)
        resp = view.getGeojson()
        output = StringIO.StringIO(json.dumps(resp))
        client = GirderClient(host="localhost", port="8080")
        client.authenticate('girder', 'girder')
        user = self.getCurrentUser()
        minervaFolder = client.listFolder(user['_id'],
                                          parentFolderType='user',
                                          name='minerva')
        datasetFolder = client.listFolder(minervaFolder[0]['_id'],
                                          name='dataset')
        parentId = datasetFolder[0]['_id']
        name = "_".join(params.values()) + ".geojson"
        client.uploadFile(parentId, output, name,
                          output.len, parentType='folder')
        geojsonId = client.listItem(parentId, text=name)[0]['_id']
        GeojsonDataset().createGeojsonDataset(itemId=geojsonId, params={})
        return geojsonId

    postgresGeojson.description = (
        Description('Get geojson from postgres database')
        .param('NAME', 'state name or all states', required=False,
               dataType='list')
        .param('PRODUCTION_CATEGORY', 'production category', required=False,
               dataType='list')
        .param('CATEGORY', 'category', required=False,
               dataType='list')
        .param('SUB_CATEGORY', 'sub category', required=False,
               dataType='list')
        .param('DATA_DERIVATION', 'data derivation', required=False,
               dataType='list')
    )


class View(object):
    def __init__(self, conn, filters):
        self._conn = conn
        self._filters = filters

    def generateQuery(self):
        filters = self._filters
        q = []
        for k in filters.keys():
            _ = []
            for v in ast.literal_eval(filters[k]):
                _.append(""" "{}" = '{}' """.format(k, v))
            q.append("(" + "or".join(_) + ")")
        return "and".join(q)

    def getDistinctValues(self, table, filters={}):
        cur = self._conn.cursor()
        base_query = 'SELECT DISTINCT "{}" from gryphonstates'.format(table)
        if not filters:
            query = base_query
        else:
            query = base_query + " where" + self.generateQuery()
        cur.execute(query + ";")
        field = sorted([i[0] for i in cur.fetchall()])
        return field

    def filter(self):
        filters = self._filters
        resp = {}
        resp['NAME'] = self.getDistinctValues('NAME', filters)
        resp['PRODUCTION_CATEGORY'] = self.getDistinctValues('PRODUCTION_CATEGORY', filters)
        resp['CATEGORY'] = self.getDistinctValues('CATEGORY', filters)
        resp['SUB_CATEGORY'] = self.getDistinctValues('SUB_CATEGORY', filters)
        resp['DATA_DERIVATION'] = self.getDistinctValues('DATA_DERIVATION', filters)
        return resp

    def getGeojson(self):
        base = """SELECT "geom", "NAME", "PRODUCTION_CATEGORY", "VALUE", "CATEGORY",
        "SUB_CATEGORY", "DATA_DERIVATION" from gryphonstates"""
        filters = self.generateQuery()
        query = base + " where " + filters
        cur = self._conn.cursor()
        cur.execute("""SELECT row_to_json(fc)
FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features
   FROM (SELECT 'Feature' As type
    , ST_AsGeoJSON(lg."geom")::json As geometry
        , row_to_json((SELECT l FROM (SELECT lg."NAME", lg."VALUE",
        lg."PRODUCTION_CATEGORY", lg."CATEGORY", lg."SUB_CATEGORY", lg."DATA_DERIVATION") As l
      )) As properties
        FROM (%s) As lg ) As f ) As fc;""" % query)

        return cur.fetchall()[0][0]
