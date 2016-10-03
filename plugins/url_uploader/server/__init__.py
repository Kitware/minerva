from girder.api import access
from girder.api.rest import boundHandler
import urllib, urllib2, requests, zipfile, StringIO, bz2, gzip
import glob
from mimetypes import MimeTypes
import os, shutil
import girder_client

@access.public
@boundHandler()
def readUrl(self, params):
    path = './zip_file/*'
    files = glob.glob(path)
    output = []
    if 'url' in params:
        unpacked_path = './zip_file'
        url = params['url']
        file_name = url.split('/')[-1]
        extension = file_name.split('.')[-1]
        retry = 0

        def send_data_to_client(mime_type):
            for file in files:
                name = file.split('/')[-1]
                f = open(file, 'r').read()
                output.append({
                    'name': name,
                    'file_name': file_name,
                    'file': unicode(f, errors='ignore'),
                    'mimeType': mime_type[0]
                })
            return output
        while True: # retry request
            try:
                u = urllib.urlopen(url)
                mime = MimeTypes()
                mime_type = mime.guess_type(url)
                r = requests.get(url, stream=True)
                if extension == 'zip':
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
                    return send_data_to_client(mime_type)

                elif extension == 'bz2':
                    # create a directory
                    if not os.path.exists(unpacked_path):
                        os.makedirs(unpacked_path)
                    file_path =  './' + file_name
                    target = open(file_path, 'w')
                    target.write(r.content)
                    extractedFile = bz2.BZ2File(file_path)
                    data = extractedFile.read()
                    newfilepath = unpacked_path + '/' + file_path[:-4]
                    open(newfilepath, 'wb').write(data)
                    return send_data_to_client(mime_type)

                elif extension == 'gz':
                    # create a directory
                    if not os.path.exists(unpacked_path):
                        os.makedirs(unpacked_path)
                    file_path =  './' + file_name
                    target = open(file_path, 'w')
                    target.write(r.content)
                    extractedFile = gzip.GzipFile(file_path)
                    data = extractedFile.read()
                    newfilepath = unpacked_path + '/' + file_path[:-4]
                    open(newfilepath, 'wb').write(data)
                    return send_data_to_client(mime_type)
                else:
                    return []
            except Exception as e: # TODO need more detailed handling
                if retry > 3: # 3 this is serious problem. exit
                    raise e
                retry += 1 # retry
            else:
                break
    else:
        raise RestException('url must be provided.')

@access.user
@boundHandler()
def uploadUrl(self, params):
    user = self.getCurrentUser()
    gc = girder_client.GirderClient(port=8080)
    gc.authenticate('', '')
    folder_id = params['folder_id']
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
