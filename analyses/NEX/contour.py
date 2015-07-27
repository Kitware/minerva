import os
import tempfile
import shutil
from netCDF4 import Dataset
from bson import json_util

from girder_client import GirderClient

def convert(data_path, variable, timestep):
    data = Dataset(data_path)
    variable = data.variables[variable]
    shape = variable[timestep].shape

    # For now sub select ( take about 10% of the grid )
    lat_select_index = shape[0] / 10
    lon_select_index = shape[1] / 10

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

client = GirderClient(host, port)
client.authenticate(username, password)
# TODO when we have a token set it on client
#client.token = girder['token']

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
    client.downloadFile(fileId, filepath)

    # Create temp file and convert to GeoJs contour JSON format
    output_dir = tempfile.mkdtemp()
    output_filepath = os.path.join(output_dir, output_file_name)
    with open(output_filepath, 'w') as fp:
        fp.write(json_util.dumps(convert(filepath, variable, timestep)))

    # Create an item for this file
    output_item = client.createItem(dataset_folder_id, output_file_name, output_file_name)

    # Now upload the result
    client.uploadFileToItem(output_item['_id'], output_filepath)

    output_item_id = output_item['_id']

    # Finally promote item to dataset
    client.post('minerva_dataset/%s/dataset' % output_item_id)

finally:
    if filepath and os.path.exists(filepath):
        os.remove(filepath)
    if output_dir and os.path.exists(output_dir):
        shutil.rmtree(output_dir)


