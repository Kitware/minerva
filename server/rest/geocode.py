"""REST API for geocode services."""
from datetime import datetime, timedelta

from girder.plugins.minerva.geonames import import_data

from pymongo import GEOSPHERE
from bson.objectid import ObjectId

from girder.api.rest import Resource, loadmodel, RestException
from girder.api.describe import Description
from girder.api import access
from girder.utility.progress import ProgressContext
from girder.constants import AccessType


class Geonames(Resource):
    """API Endpoint for managing Geonames database."""

    _geonames_folder = None

    def __init__(self):
        """Set up the resource."""
        self.resourceName = 'geonames'

    def geonames_folder(self):
        """Return the configured geonames folder."""
        self._geonames_folder

        if self._geonames_folder is None:
            self._geonames_folder = ObjectId(
                self.model('setting').get(
                    'minerva.geonames_folder', None
                )
            )

        return self._geonames_folder

    def _progress_adapter(self, ctx, unknown=False):
        """Return an adapter method from geonames progress arguments."""
        def progress(count, total, message, units):
            """Update the notification model."""
            now = datetime.utcnow()
            if unknown:
                total = 0
            ctx.update(
                total=total,
                current=count,
                message=message,
                expires=now + timedelta(minutes=5)
            )

        return progress

    @access.admin
    @loadmodel(
        model='folder',
        map={'folder': 'folder'},
        level=AccessType.ADMIN
    )
    def setup(self, folder, params):
        """Call the main geonames setup code in a new job."""
        progress = self.boolParam('progress', params, default=False)

        # insert an item indicating the geonames import
        self.model('item').createItem(
            'geonames_import', self.getCurrentUser(), folder,
            description=datetime.utcnow().isoformat()
        )

        # download the data
        with ProgressContext(progress, user=self.getCurrentUser(),
                             title=u'Downloading geonames database') as ctx:

            import_data.download_all_countries(
                progress=self._progress_adapter(ctx),
                url=params.get('url')
            )
            ctx.update(message='Done', force=True)

        # import the data
        with ProgressContext(progress, user=self.getCurrentUser(),
                             title=u'Importing geonames database') as ctx:

            import_data.read_geonames(
                folder, self.getCurrentUser(),
                progress=self._progress_adapter(ctx, unknown=True)
            )
            ctx.update(message='Done', force=True)

        # set the geospatial index
        with ProgressContext(progress, user=self.getCurrentUser(),
                             title=u'Indexing the dataset') as ctx:
            self.model('item').collection.ensure_index([(
                'geo.geometry.coordinates',
                GEOSPHERE
            )])
            self.model('item').collection.ensure_index('meta.asciiname')
            self.model('item').collection.ensure_index('meta.alternatenames')
            ctx.update(message='Done', force=True)

        # insert an item indicating completion
        self.model('item').createItem(
            'geonames_done', self.getCurrentUser(), folder,
            description=datetime.utcnow().isoformat()
        )

    setup.description = (
        Description('Set up the geonames database for geocoding support.')
        .param('folder', 'The folder to import the items to.', required=True)
        .param('url', 'The URL of the data file to import.', required=False)
        .param('progress',
               'Enable progress notifications.',
               required=False,
               dataType='boolean')
    )

    @access.public
    def geocode(self, params):
        """Return a list of geojson points matching the given name."""
        folder = self.geonames_folder()
        if folder is None:
            raise RestException('Geocoding not configured')

        results = list(self.model('item').textSearch(
            params.get('name'),
            user=self.getCurrentUser(),
            filters={'folderId': folder},
            limit=params.get('limit', 10)
        ))

        geo = {
            "type": "FeatureCollection",
            "features": []
        }

        # generate a geojson object
        for result in results:
            result['properties'] = result.pop('meta')
            result['id'] = result['properties'].pop('geonameid')
            geo['features'].append(result)

        return geo

    geocode.description = (
        Description('Search for geonames items with the given name.')
        .param('name', 'The location name', required=True)
        .param(
            'limit',
            'The maximum number of results to return.',
            required=False,
            dataType='integer'
        )
    )
