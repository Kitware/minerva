import ast
import json
import StringIO

from girder.api import access
from girder.api.describe import describeRoute, Description
from girder.api.rest import Resource
from girder.utility.model_importer import ModelImporter
from girder.utility import assetstore_utilities, progress
from girder.plugins.minerva.rest.geojson_dataset import GeojsonDataset
from girder.plugins.minerva.utility.minerva_utility import findPublicFolder, findDatasetFolder
from girder.plugins.database_assetstore.rest import DatabaseAssetstoreResource


class PostgresGeojson(Resource):

    def __init__(self):
        self.resourceName = 'minerva_postgres_geojson'
        self.route('GET', ('tables', ), self.getTables)
        self.route('GET', ('columns', ), self.getColumns)
        self.route('GET', ('values', ), self.getValues)
        self.route('GET', ('all_values', ), self.getAllValues)
        self.route('GET', ('geojson', ), self.getGeojson)

    def _getDbName(self):
        currentUser = self.getCurrentUser()
        assetstores = ModelImporter.model('assetstore').list(limit=10)
        astore = [a for a in assetstores if a['type'] == 'database']
        dbName = astore[0]['database']['uri'].rsplit('/', 1)[-1]

        return dbName

    def _queryDatabase(self, params, explicitTable):
        dbName = self._getDbName()
        currentUser = self.getCurrentUser()
        publicFolder = findPublicFolder(currentUser, currentUser)
        assetstores =  ModelImporter.model('assetstore').list(limit=10)
        astore = [a for a in assetstores if a['type'] == 'database']
        adapter = assetstore_utilities.getAssetstoreAdapter(astore[0])
        # Create the item
        adapter.importData(publicFolder, 'folder', params,
                           progress.noProgress, currentUser)
        resItem = list(ModelImporter.model("item").textSearch(explicitTable))[0]
        resFile = list(self.model('item').childFiles(item=resItem))[0]
        func = adapter.downloadFile(resFile, headers=False,
                                    extraParameters=params)

        return func

    def _getQueryParams(self, schema, table, fields, filters,
                        limit, output_format):
        return {
            'tables': [{'name': '{}.{}'.format(schema, table),
                        'database': self._getDbName(),
                        'table': table,
                        'schema': schema}],
            'fields': fields,
            'filters': filters,
            'limit': limit,
            'format': output_format
        }

    def _getJsonResponse(self, schema, table, fields, filters,
                         limit=100, output_format='json'):
        explicitTable = '{}.{}'.format(schema, table)
        queryParams = self._getQueryParams(schema, table, fields,
                                           filters, limit, output_format)
        func = self._queryDatabase(queryParams, explicitTable)
        return json.loads(list(func())[0])

    def _bindProperties(self, params):
        colDict = self.getColumns({'table': params['table']})
        columns = [i['column_name'] for i in colDict
                   if not i['column_name'] == 'geom']
        fields = []
        for c in columns:
            fields.append(c)
            fields.append({'field': c})

        properties = {'func': 'json_build_object'}
        properties['param'] = fields

        return properties

    def _getGeom(self):
        return {"func": "ST_AsGeoJSON", "param": [{"field": "geom"}]}

    @access.user
    @describeRoute(
        Description('Returns list of tables from a database assetstore')
    )
    def getTables(self, params):
        schema = 'information_schema'
        table = 'tables'
        fields = ['table_name']
        filters = [['table_schema', 'public']]
        return [a['table_name'] for a in self._getJsonResponse(schema, table, fields, filters)]

    @access.user
    @describeRoute(
        Description('Returns list of columns for a given table')
        .param('table', 'Table name from the database')
    )
    def getColumns(self, params):
        schema = 'information_schema'
        table = 'columns'
        fields = ['column_name', 'data_type']
        filters = [['table_name', params['table']]]
        return self._getJsonResponse(schema, table, fields, filters)

    @access.user
    @describeRoute(
        Description('Returns distinct values for a column')
        .param('table', 'Table name from the database')
        .param('column', 'Column name from a table')
    )
    def getValues(self, params):
        schema = 'public'
        table = params['table']
        fields = [{'func': 'distinct', 'param': [{'field': params['column']}]}]
        filters = ""
        return [a['column_0'] for a in self._getJsonResponse(schema, table, fields, filters)]

    @access.user
    @describeRoute(
        Description('Returns all distinct values for all columns for a given table')
        .param('table', 'Table name from the database')
    )
    def getAllValues(self, params):
        resp = {}
        for i in self.getColumns(params):
            if i['column_name'] != 'geom' and i['data_type'] != 'numeric':
                resp[i['column_name']] = self.getValues({
                    'column': i['column_name'],
                    'table': params['table']})
        return resp

    @access.user
    @describeRoute(
        Description('Returns geojson for the given view/table filtering values')
        .param('table', 'Table name from the database')
        .param('filter', 'Filter generated by the user')
    )
    def getGeojson(self, params):
        pass
