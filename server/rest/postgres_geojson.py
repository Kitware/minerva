import hashlib
import json

from girder.api import access
from girder.api.describe import describeRoute, Description
from girder.api.rest import Resource, ValidationException, loadmodel
from girder.utility import assetstore_utilities, progress
from girder.plugins.minerva.rest.geojson_dataset import GeojsonDataset
from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder


class PostgresGeojson(Resource):

    def __init__(self):
        super(PostgresGeojson, self).__init__()
        self.resourceName = 'minerva_postgres_geojson'
        self.route('GET', ('assetstores', ), self.getAssetstores)
        self.route('GET', ('tables', ), self.getTables)
        self.route('GET', ('columns', ), self.getColumns)
        self.route('GET', ('values', ), self.getValues)
        self.route('GET', ('all_values', ), self.getAllValues)
        self.route('POST', (), self.createPostgresGeojsonData)
        self.route('GET', ('geometrylink', ), self.getGeometryLinkTarget)
        self.route('GET', ('geometrylinkfields', ), self.geometryLinkField)

    def _getDbName(self):
        assetstores = self.model('assetstore').list(limit=10)
        astore = [a for a in assetstores if a['type'] == 'database' and
                  a['database']['dbtype'] == 'sqlalchemy_postgres']
        dbName = astore[0]['database']['uri'].rsplit('/', 1)[-1]
        return dbName

    def _getQueryParams(self, schema, table, fields, group, filters,
                        output_format):
        return {
            'tables': [{'name': '{}.{}'.format(schema, table),
                        'database': self._getDbName(),
                        'table': table,
                        'schema': schema}],
            'fields': fields,
            'group': group,
            'filters': filters,
            'limit': -1,
            'format': output_format
        }

    @access.user
    @describeRoute(
        Description('Returns list of eligible assetstores')
    )
    def getAssetstores(self, params):
        return list(self.model('assetstore').find(
            query={
                'type': 'database',
                'database.dbtype': 'sqlalchemy_postgres'
            },
            fields=['_id', 'name']))

    @access.user
    @loadmodel(model='assetstore', map={'assetstoreId': 'assetstore'})
    @describeRoute(
        Description('Returns list of tables from a database assetstore')
        .param('assetstoreId', 'assetstore ID of the target database')
    )
    def getTables(self, assetstore, params):
        adapter = assetstore_utilities.getAssetstoreAdapter(assetstore)
        tables = adapter.getTableList()
        # tables is an array of databases, each of which has tables.  We
        # probably want to change this to not just use the first database.
        return [table['name'] for table in tables[0]['tables']]

    @access.user
    @loadmodel(model='assetstore', map={'assetstoreId': 'assetstore'})
    @describeRoute(
        Description('Returns list of columns for a given table')
        .param('assetstoreId', 'assetstore ID of the target database')
        .param('table', 'Table name from the database')
    )
    def getColumns(self, assetstore, params):
        return self._getColumns(assetstore, params)

    def _getColumns(self, assetstore, params):
        adapter = assetstore_utilities.getAssetstoreAdapter(assetstore)
        conn = adapter.getDBConnectorForTable(params['table'])
        fields = conn.getFieldInfo()
        return fields

    @access.user
    @loadmodel(model='assetstore', map={'assetstoreId': 'assetstore'})
    @describeRoute(
        Description('Returns distinct values for a column')
        .param('assetstoreId', 'assetstore ID of the target database')
        .param('table', 'Table name from the database')
        .param('column', 'Column name from a table')
    )
    def getValues(self, assetstore, params):
        return self._getValues(assetstore, params)

    def _getValues(self, assetstore, params):
        adapter = assetstore_utilities.getAssetstoreAdapter(assetstore)
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
        return [row['value'] for row in result]

    @access.user
    @loadmodel(model='assetstore', map={'assetstoreId': 'assetstore'})
    @describeRoute(
        Description('Returns all distinct values for all columns for a given table')
        .param('assetstoreId', 'assetstore ID of the target database')
        .param('table', 'Table name from the database')
    )
    def getAllValues(self, assetstore, params):
        resp = {}
        for i in self._getColumns(assetstore, params):
            if i['name'] != 'geom' and i['datatype'] != 'number':
                resp[i['name']] = self._getValues(assetstore, {
                    'column': i['name'],
                    'table': params['table']})
        return resp

    @access.user
    @loadmodel(model='assetstore', map={'assetstoreId': 'assetstore'})
    @describeRoute(
        Description('Create json dataset for the given view/table filtering values')
        .param('assetstoreId', 'assetstore ID of the target database')
        .param('table', 'Table name from the database')
        .param('field', 'Field to which the aggregate function will be applied')
        .param('aggregationFunction', 'aggregate function used on the field')
        .param('filter', 'Filter condition object for filtering table data')
        .param('geometryField', 'Geometry data definition object')
        .param('datasetName', 'A custom name for the dataset', required=False)
    )
    def createPostgresGeojsonData(self, assetstore, params):
        filter = params['filter']
        table = params['table']
        field = params['field']
        aggregateFunction = params['aggregateFunction']
        geometryField = json.loads(params['geometryField'])

        if geometryField['type'] == 'built-in':
            buildInGeomField = geometryField['field']
            properties = [field, {
                'func': aggregateFunction,
                'param': {'field': field}
            }]
            # add string fields with concat aggregate function and in the format for
            # json_build_object
            for i in self._getColumns(assetstore, {'table': params['table']}):
                if i['datatype'] == 'string' and i['name'] != field:
                    properties.extend((i['name'], {
                        'func': 'string_agg',
                        'param': [{
                            'func': 'distinct',
                            'param': {'field': i['name']}
                        }, '|'],
                        'reference': i['name']
                    }))
            fields = [{
                'func': 'json_build_object', 'param': [
                    'type', 'Feature',
                    'geometry', {
                        'func': 'cast', 'param': [{
                            'func': 'st_asgeojson', 'param': [{
                                'func': 'st_transform', 'param': [{'field': buildInGeomField}, 4326]
                            }]}, 'JSON']
                    },
                    'properties', {
                        'func': 'json_build_object', 'param': properties
                    }
                ]
            }]
            group = [buildInGeomField]
        elif geometryField['type'] == 'link':
            fields = [{
                'func': aggregateFunction,
                'param': {'field': field},
                'reference': field
            }]
            group = [x['value'] for x in geometryField['links']]
            # add string fields with concat aggregate function
            for i in self._getColumns(assetstore, {'table': params['table']}):
                if i['datatype'] in ('string', 'number', 'date') and i['name'] != field:
                    if i['datatype'] == 'string':
                        fields.append({
                            'func': 'string_agg',
                            'param': [{
                                'func': 'distinct',
                                'param': {'field': i['name']}
                            }, '|'],
                            'reference': i['name']
                        })

        datasetName = params['datasetName']
        # TODO: schema should be read from the listed table, not set explicitly
        schema = 'public'
        hash = hashlib.md5(filter).hexdigest()
        if datasetName:
            output_name = datasetName
        else:
            output_name = '{0}.{1}.{2}.geojson'.format(
                table, field, hash[-6:])
        currentUser = self.getCurrentUser()
        datasetFolder = findDatasetFolder(currentUser, currentUser)
        adapter = assetstore_utilities.getAssetstoreAdapter(assetstore)
        # Create the item
        dbParams = self._getQueryParams(
            schema, table, fields, group, filter,
            'GeoJSON' if geometryField['type'] == 'built-in' else 'json')
        dbParams['tables'][0]['name'] = output_name
        del dbParams['tables'][0]['database']
        result = adapter.importData(datasetFolder, 'folder', dbParams,
                                    progress.noProgress, currentUser)
        resItem = result[0]['item']
        GeojsonDataset().createGeojsonDataset(
            itemId=resItem['_id'],
            postgresGeojson={
                'geometryField': geometryField,
                'field': field,
                'aggregateFunction': aggregateFunction
            }, params={})
        return resItem['_id']

    @access.user
    @describeRoute(
        Description('Create dataset json for the given view/table filtering values')
        .param('table', 'Table name from the database')
        .param('field', 'Field that will be used as default value of fill color')
        .param('aggregationFunction', 'aggregate function to use on the value field')
        .param('filter', 'Filter generated by the user')
        .param('geometryField', 'Geometry link parameter object')
        .param('datasetName', 'A custom name for the dataset', required=False)
    )
    @access.user
    @describeRoute(
        Description("Get dataset of current user as geometry link targets")
    )
    def getGeometryLinkTarget(self, params):
        currentUser = self.getCurrentUser()
        folder = findDatasetFolder(currentUser, currentUser)
        items = list(self.model('item').find(
            query={'folderId': folder['_id'],
                   'meta.minerva.dataset_type': 'geojson',
                   'meta.minerva.postgresGeojson.geometryField.type': {'$ne': 'link'}},
            fields=['name']))
        return items

    @access.user
    @describeRoute(
        Description("Get keys of GeoJSON feature properties of a dataset")
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
