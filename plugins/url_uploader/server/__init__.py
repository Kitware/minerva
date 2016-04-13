from girder.api import access
from girder.api.rest import boundHandler
import urllib, urllib2, requests, zipfile, StringIO
import glob
from mimetypes import MimeTypes
import os, shutil
import girder_client

@access.public
@boundHandler()
def readUrl(self, params):
    if 'url' in params:
        unpacked_path = './zip_file'
        url = params['url']
        file_name = url.split('/')[-1]
        u = urllib2.urlopen(url)
        mime = MimeTypes()
        mime_type = mime.guess_type(url)
        r = requests.get(url, stream=True)
        z = zipfile.ZipFile(StringIO.StringIO(r.content))
        z.extractall(unpacked_path)
        f = open(file_name, 'wb')
        meta = u.info()
        file_size = int(meta.getheaders("Content-Length")[0])
        print "Downloading: %s Bytes: %s" % (file_name, file_size)

        file_size_dl = 0
        block_sz = 8192
        while True:
            buffer = u.read(block_sz)
            if not buffer:
                break

            file_size_dl += len(buffer)
            f.write(buffer)
            status = r"%10d  [%3.2f%%]" % (file_size_dl, file_size_dl * 100. / file_size)
            status = status + chr(8)*(len(status)+1)
        path = './zip_file/*'
        files = glob.glob(path)
        output = []
        for file in files:
            name = file.split('/')[-1]
            f = open(file, 'r').read()
            output.append({
                'name': name,
                'file_name': file_name,
                'size': file_size,
                'file': unicode(f, errors='ignore'),
                'mimeType': mime_type[0]
            })
        return output
    else:
        raise RestException('url must be provided.')

@access.user
@boundHandler()
def uploadUrl(self, params):
    user = self.getCurrentUser()
    gc = girder_client.GirderClient(port=8080)
    gc.authenticate('essam', '')
    folder_id = '570d18000640fd2cd7a6211d'
    path = './zip_file/*'
    files = glob.glob(path)
    for file in files:
        file_path = file
        single_file_name = file_path.split('/')[-1]
        item = gc.createItem(folder_id, single_file_name, '')
        gc.uploadFileToItem(item['_id'], file)
    # Remove the unzipped files
    unpacked_path = './zip_file'
    shutil.rmtree(unpacked_path)
    # Remove read files
    os.remove(params['file_name'])

def load(info):
    info['apiRoot'].item.route('POST', ('url',), readUrl)
    info['apiRoot'].item.route('POST', ('upload',), uploadUrl)
