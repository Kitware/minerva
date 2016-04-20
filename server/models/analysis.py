import os
import datetime

from girder.constants import AccessType
from girder.api.rest import getCurrentUser, RestException
from girder.models.model_base import AccessControlledModel


class Analysis(AccessControlledModel):
    def initialize(self):
        self.name = "minerva_analysis"
        self.ensureIndex(('name', {'unique': True}))

    def validate(self, doc):
        # TODO ensure file exists
        # TODO ensure run() function is available
        # TODO ensure name is unique
        return doc

    def get_by_name(self, name, user=None):
        if user is None:
            user = getCurrentUser()

        # TODO: Fix this
        #   Shouldn't we be able to do this with out querying
        #   the database twice?
        doc = self.findOne({'name': name})
        if doc is None:
            raise RestException('No such analysis: %s' % name, code=400)


        return self.load(doc['_id'], level=AccessType.READ, user=user)

    def list(self, user=None, filters=None, sort=None):
        if user is None:
            user = getCurrentUser()

        cursor = self.find(filters or {}, limit=0, sort=sort)

        return list(self.filterResultsByPermission(
            cursor=cursor, user=user,
            level=AccessType.READ,
            limit=None, offset=None))

    def remove(self, analysis):
        AccessControlledModel.remove(self, analysis)

    def update(self, analysis):
        analysis['updated'] = datetime.datetime.utcnow()
        return self.save(analysis)

    def create(self, path, analysis_type, user=None, name=None):
        if user is None:
            user = getCurrentUser()

        now = datetime.datetime.utcnow()

        if name is None:
            name = os.path.splitext(os.path.basename(path))[0]

        if '_id' not in user:
            raise Exception("user must have an '_id' property set")

        return self.save({
            'name': name,
            'path': path,
            'type': analysis_type,
            'userId': user['_id'],
            'created': now,
            'updated': now
        })
