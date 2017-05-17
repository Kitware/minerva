import hashlib

from girder.api import access
from girder.api.describe import describeRoute, Description
from girder.api.rest import Resource, ValidationException
from girder.utility.model_importer import ModelImporter
from girder.utility import assetstore_utilities, progress
from girder.plugins.minerva.rest.geojson_dataset import GeojsonDataset
from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder
import json


class PostgresGeojson(Resource):

    def __init__(self):
        self.resourceName = 'minerva_postgres_geojson'
        self.route('GET', ('tables', ), self.getTables)
        self.route('GET', ('columns', ), self.getColumns)
        self.route('GET', ('values', ), self.getValues)
        self.route('GET', ('all_values', ), self.getAllValues)
        self.route('GET', ('geojson', ), self.getGeojson)
        self.route('GET', ('json', ), self.getJSON)
        self.route('GET', ('geometrylink', ), self.getLinkGeometryDataset)
        self.route('GET', ('geometrylinkfields', ), self.geometryLinkField)

    def _getAssetstoreAdapter(self):
        # TODO: This assumes that there is exactly one assetstore that has
        # appropriate qualifications; we need to handle zero and more than one
        assetstores = ModelImporter.model('assetstore').list()
        astore = [a for a in assetstores if a['type'] == 'database' and
                  a['database']['dbtype'] == 'sqlalchemy_postgres']
        adapter = assetstore_utilities.getAssetstoreAdapter(astore[0])
        return adapter

    def _getDbName(self):
        # TODO: This assumes that there is exactly one assetstore that has
        # appropriate qualifications; we need to handle zero and more than one
        assetstores = ModelImporter.model('assetstore').list(limit=10)
        astore = [a for a in assetstores if a['type'] == 'database' and
                  a['database']['dbtype'] == 'sqlalchemy_postgres']
        dbName = astore[0]['database']['uri'].rsplit('/', 1)[-1]
        return dbName

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

    def _getProperties(self, params):
        colDict = self.getColumns({'table': params['table']})
        columns = [i['name'] for i in colDict
                   if not i['name'] == 'geom']
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
        adapter = self._getAssetstoreAdapter()
        tables = adapter.getTableList()
        # tables is an array of databases, each of which has tables.  We
        # probably want to change this to not just use the first database.
        return [table['name'] for table in tables[0]['tables']]

    @access.user
    @describeRoute(
        Description('Returns list of columns for a given table')
        .param('table', 'Table name from the database')
    )
    def getColumns(self, params):
        adapter = self._getAssetstoreAdapter()
        conn = adapter.getDBConnectorForTable(params['table'])
        fields = conn.getFieldInfo()
        return fields

    @access.user
    @describeRoute(
        Description('Returns distinct values for a column')
        .param('table', 'Table name from the database')
        .param('column', 'Column name from a table')
    )
    def getValues(self, params):
        adapter = self._getAssetstoreAdapter()
        conn = adapter.getDBConnectorForTable(params['table'])
        queryParams = {
            'fields': [{
                'func': 'distinct',
                'param': [{'field': params['column']}],
                'reference': 'value',
            }],
            'limit': 100,
            'format': 'rawdict'}
        result = list(adapter.queryDatabase(conn, queryParams)[0]())
        print result
        return [row['value'] for row in result]

    @access.user
    @describeRoute(
        Description('Returns all distinct values for all columns for a given table')
        .param('table', 'Table name from the database')
    )
    def getAllValues(self, params):
        resp = {}
        for i in self.getColumns(params):
            if i['name'] != 'geom' and i['datatype'] != 'number':
                resp[i['name']] = self.getValues({
                    'column': i['name'],
                    'table': params['table']})
        return resp

    @access.user
    @describeRoute(
        Description('Returns geojson for the given view/table filtering values')
        .param('table', 'Table name from the database')
        .param('field', 'Field that will be used as default value of fill color')
        .param('filter', 'Filter generated by the user')
        .param('datasetName', 'A custom name for the dataset', required=False)
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
        field = params['field']
        datasetName = params['datasetName']
        limit = None
        # TODO: schema should be read from the listed table, not set explicitly
        schema = 'public'
        output_format = 'GeoJSON'
        hash = hashlib.md5(filters).hexdigest()
        if datasetName:
            output_name = datasetName
        else:
            output_name = '{0}.{1}.{2}.geojson'.format(
                table, field, hash[-6:])
        currentUser = self.getCurrentUser()
        datasetFolder = findDatasetFolder(currentUser, currentUser)
        adapter = self._getAssetstoreAdapter()
        # Create the item
        dbParams = self._getQueryParams(schema, table, fields, filters,
                                        limit, output_format)
        dbParams['tables'][0]['name'] = output_name
        del dbParams['tables'][0]['database']
        result = adapter.importData(datasetFolder, 'folder', dbParams,
                                    progress.noProgress, currentUser)
        resItem = result[0]['item']
        GeojsonDataset().createGeojsonDataset(
            itemId=resItem['_id'], fillColorKey=field, params={})
        return resItem['_id']

    @access.user
    @describeRoute(
        Description('Create dataset json for the given view/table filtering values')
        .param('table', 'Table name from the database')
        .param('field', 'Field that will be used as default value of fill color')
        .param('filter', 'Filter generated by the user')
        .param('datasetName', 'A custom name for the dataset', required=False)
        .param('limit', 'Number of records to be returned', required=False, default=100)
    )
    def getJSON(self, params):
        fields = [i['name'] for i in self.getColumns({'table': params['table']})
                  if i['datatype'] in ('string', 'number', 'date')]

        filters = params['filter']
        table = params['table']
        field = params['field']
        geometryField = json.loads(params['geometryField'])
        datasetName = params['datasetName']
        limit = None
        # TODO: schema should be read from the listed table, not set explicitly
        schema = 'public'
        hash = hashlib.md5(filters).hexdigest()
        if datasetName:
            output_name = datasetName
        else:
            output_name = '{0}.{1}.{2}.geojson'.format(
                table, field, hash[-6:])
        currentUser = self.getCurrentUser()
        datasetFolder = findDatasetFolder(currentUser, currentUser)
        adapter = self._getAssetstoreAdapter()
        # Create the item
        dbParams = self._getQueryParams('public', table, fields, filters,
                                        limit, 'json')
        dbParams['tables'][0]['name'] = output_name
        del dbParams['tables'][0]['database']
        result = adapter.importData(datasetFolder, 'folder', dbParams,
                                    progress.noProgress, currentUser)
        resItem = result[0]['item']
        GeojsonDataset().createGeojsonDataset(
            itemId=resItem['_id'], fillColorKey=field, geometryField=geometryField, params={})
        return resItem['_id']

    @access.user
    @describeRoute(
        Description("dummy")
    )
    def getLinkGeometryDataset(self, params):
        currentUser = self.getCurrentUser()
        folder = findDatasetFolder(currentUser, currentUser)
        items = list(self.model('item').find(
            query={'folderId': folder['_id'],
                   'meta.minerva.dataset_type': 'geojson'},
            fields=['name']))
        return items

    @access.user
    @describeRoute(
        Description("dummy2")
        .param('itemId', 'Item id', required=True)
    )
    def geometryLinkField(self, params):
        currentUser = self.getCurrentUser()
        itemId = params['itemId']
        item = self.model('item').load(itemId, user=currentUser)
        files = list(self.model('item').childFiles(item))
        if len(files) != 1:
            raise ValidationException('the item has multiple files')
        file = files[0]
        assetstore = self.model('assetstore').load(file['assetstoreId'])
        adapter = assetstore_utilities.getAssetstoreAdapter(assetstore)
        func = adapter.downloadFile(
            file, offset=0, headers=False, endByte=None,
            contentDisposition=None, extraParameters=None)
        featureCollections = json.loads(''.join(list(func())))
        if 'features' not in featureCollections or \
            len(featureCollections['features']) == 0 or \
            'properties' not in featureCollections['features'][0]:
            raise ValidationException('invalid geojson file')
        return featureCollections['features'][0]['properties'].keys()
