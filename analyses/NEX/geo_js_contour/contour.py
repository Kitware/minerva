import os
import tempfile
import shutil
from netCDF4 import Dataset
from bson import json_util
from contextlib import contextmanager
from girder_client import GirderClient
import time

def debug(s):
    print s

@contextmanager
def timer(s):
    t0 = time.time()
    yield
    debug("%s (%.2f)" % (s, time.time() - t0))

def convert(data_path, variable, timestep):
    data = Dataset(data_path)
    variable = data.variables[variable]
    shape = variable[timestep].shape

    lat_select_index = shape[0]
    lon_select_index = shape[1]

    # Extract out the lat lon names
    dimensions = map(lambda d : d, data.dimensions)
    for d in dimensions:
        if d.startswith('lat'):
            lat_name = d
        elif d.startswith('lon'):
            lon_name = d

    contour_data = {
        'gridWidth': lon_select_index,
        'gridHeight': lat_select_index,
        'x0': float(data.variables[lon_name][0]),
        'y0': float(data.variables[lat_name][0]),
        'dx': float(data.variables[lon_name][1] - data.variables[lon_name][0]),
        'dy': float(data.variables[lat_name][1] - data.variables[lat_name][0]),
        'values': variable[timestep][:lat_select_index, :lon_select_index].reshape(variable[timestep][:lat_select_index, :lon_select_index].size).tolist()
    }

    return contour_data

debug("Starting contour task")
client = GirderClient(host, port)
client.token = token

# Get the user
user = client.get('user/me')
# Get the dataset folder
parameters = {
    'userId': user['_id']
}
dataset_folder = client.get('minerva_dataset/folder', parameters=parameters)['folder']
dataset_folder_id = dataset_folder['_id']
parameters = {
    'id': fileId,
    'type': 'file'
}

# Get the file resource so we can get the name
input_file = client.get('resource/%s' % str(fileId), parameters=parameters)
input_file_name = input_file['name']
output_file_name = input_file_name.replace('.nc', '.json')

try:
    # Now download the dataset

    (fd, filepath) = tempfile.mkstemp()
    os.close(fd)

    with timer("Downloaded file %s" % filepath):
        client.downloadFile(fileId, filepath)

    # Create temp file and convert to GeoJs contour JSON format
    with timer("Converted file %s" % filepath):
        output_dir = tempfile.mkdtemp()
        output_filepath = os.path.join(output_dir, output_file_name)
        with open(output_filepath, 'w') as fp:
            fp.write(json_util.dumps(convert(filepath, variable, timestep)))

    # Create an item for this file
    with timer("Created item for file"):
        output_item = client.createItem(dataset_folder_id, output_file_name, output_file_name)

    # Now upload the result
    with timer("Uploaded file %s to %s" % (output_filepath, output_item['_id'])):
        client.uploadFileToItem(output_item['_id'], output_filepath)

    output_item_id = output_item['_id']

    # Finally promote item to dataset
    with timer("Promoted item %s to dataset" % output_item_id):
        client.post('minerva_dataset/%s/item' % output_item_id)

finally:
    if filepath and os.path.exists(filepath):
        os.remove(filepath)
    if output_dir and os.path.exists(output_dir):
        shutil.rmtree(output_dir)


