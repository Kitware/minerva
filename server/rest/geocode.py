"""REST API for geocode services."""
from ..geonames import import_data

from pymongo import GEOSPHERE

from girder.api.rest import Resource, loadmodel
from girder.api.describe import Description
from girder.api import access
from girder.utility.progress import ProgressContext
from girder.constants import AccessType


class Geonames(Resource):

    """API Endpoint for managing Geonames database."""

    def _progress_adapter(self, ctx, unknown=False):
        """Return an adapter method from geonames progress arguments."""
        def progress(count, total, message, units):
            """Update the notification model."""
            if unknown:
                total = 0
            ctx.update(
                total=total,
                current=count,
                message=message
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
            ctx.update(message='Done', force=True)
    setup.description = (
        Description('Set up the geonames database for geocoding support.')
        .param('folder', 'The folder to import the items to.', required=True)
        .param('url', 'The URL of the data file to import.', required=False)
        .param('progress',
               'Enable progress notifications.',
               required=False,
               dataType='boolean')
    )
