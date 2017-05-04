import json

from girder.api import access
from girder.api.describe import describeRoute, Description
from girder.api.rest import Resource
from girder.utility.model_importer import ModelImporter
from girder.utility import assetstore_utilities, progress
from girder.plugins.minerva.rest.geojson_dataset import GeojsonDataset
from girder.plugins.minerva.utility.minerva_utility import findPublicFolder, findDatasetFolder


class PostgresGeojson(Resource):

    def __init__(self):
        self.resourceName = 'minerva_postgres_geojson'
        self.route('GET', ('tables', ), self.getTables)
        self.route('GET', ('columns', ), self.getColumns)
        self.route('GET', ('values', ), self.getValues)
        self.route('GET', ('all_values', ), self.getAllValues)
        self.route('GET', ('geojson', ), self.getGeojson)

    def _getDbName(self):
        assetstores = ModelImporter.model('assetstore').list(limit=10)
        astore = [a for a in assetstores if a['type'] == 'database']
        dbName = astore[0]['database']['uri'].rsplit('/', 1)[-1]

        return dbName

    def _queryDatabase(self, params, explicitTable):
        currentUser = self.getCurrentUser()
        publicFolder = findPublicFolder(currentUser, currentUser)
        assetstores = ModelImporter.model('assetstore').list(limit=10)
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
        return func

    def _getProperties(self, params):
        colDict = self.getColumns({'table': params['table']})
        columns = [i['column_name'] for i in colDict
                   if not i['column_name'] == 'geom']
        fields = []
        for c in columns:
            fields.append(c)
            fields.append({'field': c})

        return fields

    @access.user
    @describeRoute(
        Description('Returns list of tables from a database assetstore')
    )
    def getTables(self, params):
        schema = 'information_schema'
        table = 'tables'
        fields = ['table_name']
        filters = [['table_schema', 'public']]
        func = self._getJsonResponse(schema, table, fields, filters)
        return [a['table_name'] for a in json.loads(list(func())[0])]

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
        func = self._getJsonResponse(schema, table, fields, filters)

        return json.loads(list(func())[0])

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
        func = self._getJsonResponse(schema, table, fields, filters)

        return [a['column_0'] for a in json.loads(list(func())[0])]

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
        .param('limit', 'Number of records to be returned', required=False, default=100)
    )
    def getGeojson(self, params):
        properties = self._getProperties(params)
        fields = [{
            'func': 'json_build_object', 'param': [
                'type', 'Feature', 'geometry', {
                    'func': 'cast', 'param': [{
                        'func': 'st_asgeojson', 'param': [{
                            'func': 'st_transform', 'param': [{'field': 'geom'}, 4326]
                        }]}, 'JSON']
                },
                'properties', {
                    'func': 'json_build_object', 'param': properties
                }
            ]
        }]

        filters = params['filter']
        table = params['table']
        limit = self.boolParam('limit', params, default=100)
        schema = 'public'
        output_format = 'GeoJSON'
        output_name = 'output.geojson'
        currentUser = self.getCurrentUser()
        datasetFolder = findDatasetFolder(currentUser, currentUser)
        assetstores = ModelImporter.model('assetstore').list(limit=10)
        astore = [a for a in assetstores if a['type'] == 'database']
        adapter = assetstore_utilities.getAssetstoreAdapter(astore[0])
        # Create the item
        dbParams = self._getQueryParams(schema, table, fields, filters,
                                        limit, output_format)
        # TODO: Make the name dynamic
        dbParams['tables'][0]['name'] = output_name
        del dbParams['tables'][0]['database']
        adapter.importData(datasetFolder, 'folder', dbParams,
                           progress.noProgress, currentUser)
        resItem = list(ModelImporter.model("item").textSearch(output_name,
                                                              user=currentUser))[0]
        GeojsonDataset().createGeojsonDataset(itemId=resItem['_id'], params={})
        return resItem['_id']
