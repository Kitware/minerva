import os
import sys
# import shutil
import tempfile
import numpy as np
from bson import json_util
import time
from contextlib import contextmanager

from netCDF4 import Dataset
from girder_client import GirderClient

def debug(s):
    # noop here to disable debugging
    print s

@contextmanager
def timer(s):
    t0 = time.time()
    yield
    debug("%s (%.2f)" % (s, time.time() - t0))


def cache(data):
    import pickle
    pickle.dump(data, open("/tmp/tmp.pickle", "wb"))


def uncache():
    import pickle
    return pickle.load(open("/tmp/tmp.pickle", "rb"))


# set up our spark context incase we are running this from the command line
if 'sc' not in locals():
    spark_home = os.environ.get('SPARK_HOME')

    if not spark_home:
        raise Exception('spark_home must be set or SPARK_HOME must '
                        'be set in the environment')

    os.environ['SPARK_HOME'] = spark_home
    sys.path.append(os.path.join(spark_home, 'python'))
    sys.path.append(os.path.join(spark_home, 'bin'))

    # Check that we can import SparkContext
    from pyspark import SparkConf, SparkContext
    spark_conf = SparkConf()
    spark_conf.set("spark.app.name", "n_timestep_means")
    sc = SparkContext(conf=spark_conf)


def convert(data, variable, timestep):
    variable = data.variables[variable]
    shape = variable[timestep].shape

    # For now sub select ( take about 10% of the grid )
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


def toNetCDFDataset(source, variable, data):

    def _copy_variable(target_file, source_file, variable):
        src_var = source_file.variables[variable]
        target_var = target_file.createVariable(variable, src_var.datatype, src_var.dimensions)
        target_var.setncatts({k: src_var.getncattr(k) for k in src_var.ncattrs()})
        target_var[:] = src_var[:]

    (fd, filepath) = tempfile.mkstemp()
    os.close(fd)
    output = Dataset(filepath, 'w')

    # Extract out the lat lon names,  these are not
    # consistent across the netCDF files
    dimensions = map(lambda d : d, source.dimensions)
    for d in dimensions:
        if d.startswith('lat'):
            lat_name = d
        elif d.startswith('lon'):
            lon_name = d

    output.createDimension(lat_name, len(source.dimensions[lat_name])
                           if not source.dimensions[lat_name].isunlimited()
                           else None)
    output.createDimension(lon_name, len(source.dimensions[lon_name])
                           if not source.dimensions[lon_name].isunlimited()
                           else None)
    output.createDimension('time', len(source.dimensions['time'])
                           if not source.dimensions['time'].isunlimited()
                           else None)
    _copy_variable(output, source, lat_name)
    _copy_variable(output, source, lon_name)

    if type(data) == list:
        data_type = data[0].dtype
    else:
        data_type = data.dtype

    output.createVariable(variable, data_type, ('time', lat_name, lon_name))

#    print data.shape
#    print output.variables[variable][:].shape

    if type(data) == list:
        for i in xrange(len(data)):
            output.variables[variable][i] = data[i]
    else:
        output.variables[variable][:] = data

    return output


def netcdf_mean(filepath, parameter, timesteps, grid_chunk_size, partitions):
    data = Dataset(filepath)
    pr = data.variables[parameter]

    # Get the number of timesteps
    num_timesteps = data.variables['time'].size

    # Get number of locations per timestep
    shape = pr[0].shape
    num_grid_points = pr[0].size

    # Break timesteps into n size chunks
    timestep_chunks = []

    # Break timesteps into n size chunks
    timestep_chunks = []
    for x in xrange(0, num_timesteps, timesteps):
        if x + timesteps < num_timesteps:
            timestep_chunks.append((x, x + timesteps))
        else:
            timestep_chunks.append((x, num_timesteps))


    # Break locations into chunks
    grid_chunks = []
    for lat in xrange(0, shape[0], grid_chunk_size):
        for lon in xrange(0, shape[1], grid_chunk_size):
            grid_chunks.append((lat, lon))

    debug('Grid chunks: %d' % len(grid_chunks))

    # Function to process a set of locations for this partition
    def calculate_means(grid_chunk):
        from netCDF4 import Dataset
        import numpy as np
        data = Dataset(filepath)
        pr = data.variables[parameter]

        (lat, lon) = grid_chunk

        values = []
        for timestep_range in timestep_chunks:
            (start_timesteps, end_timesteps) = timestep_range

            mean = np.mean(pr[start_timesteps:end_timesteps,
                              lat:lat+grid_chunk_size,
                              lon:lon+grid_chunk_size], axis=0)
            values.append(mean)

        return values

    # parallelize the grid
    grid_chunks = sc.parallelize(grid_chunks, partitions)

    # Now calculate means
    means = grid_chunks.map(calculate_means)
    means = means.collect()

    timestep_means = [np.ma.empty(shape) for x in range(len(timestep_chunks))]

    i = 0
    for lat in xrange(0, shape[0], grid_chunk_size):
        for lon in xrange(0, shape[1], grid_chunk_size):
            for j in range(len(timestep_chunks)):
                chunk = means[i][j]
                timestep_means[j][lat:lat+chunk.shape[0], lon:lon+chunk.shape[1]] = chunk

            i += 1

    return toNetCDFDataset(data, parameter, timestep_means)

## provide defaults incase we are running this from the command line
## instead of providing these variables through the minerva interface
## and the romanesco call to exec
host = host if 'host' in locals() else 'localhost'
port = port if 'port' in locals() else '8081'
fileId = fileId if 'fileId' in locals() else '55bbd421f4b14911dd2ffa65'
variable = variable if 'variable' in locals() else 'pr'
timesteps = timesteps if 'timesteps' in locals() else 1140
grid_chunk_size = grid_chunk_size if 'grid_chunk_size' in locals() else 20
partitions = partitions if 'partitions' in locals() else 8

debug("Starting mean_contour task")
client = GirderClient(host, port)

if 'token' in locals():
    client.token = token
else:
    client.authenticate('kotfic', 'letmein', False)


# Get the user
user = client.get('user/me')
# Get the dataset folder
parameters = {
    'userId': user['_id']
}
dataset_folder = client.get('minerva_dataset/folder',
                            parameters=parameters)['folder']
dataset_folder_id = dataset_folder['_id']
parameters = {
    'id': fileId,
    'type': 'file'
}

# Get the file resource so we can get the name
input_file = client.get('item/%s' % str(fileId), parameters=parameters)
input_file_name = input_file['name']
output_file_name = input_file_name.replace('.nc', '.json')

# Now download the dataset
# probably better to make a tempfile,   but for now to avoid downloading
# files over and over store in a known location and check before downloading
# (fd, filepath) = tempfile.mkstemp()
# os.close(fd)

output_dir = "/data"
output_filepath = os.path.join(output_dir, output_file_name)

if not os.path.exists(os.path.join(output_dir, input_file_name)):
    with timer("Downloading %s to %s" % (fileId, output_dir)):
        client.downloadItem(fileId, output_dir)

with timer("Finished running netcdf_mean"):
    data = netcdf_mean(os.path.join(output_dir, input_file_name),
                       variable,
                       timesteps,
                       grid_chunk_size,
                       partitions)
with timer("Finished converting to contour JSON"):
    contour = convert(data, variable, 0)


with open(output_filepath, 'w') as fp:
    fp.write(json_util.dumps(contour))


# Create an item for this file
with timer("Created item"):
    output_item = client.createItem(dataset_folder_id,
                                    output_file_name,
                                    output_file_name)

# Now upload the result
with timer("Finished uploading item from %s" % (output_filepath)):
    client.uploadFileToItem(output_item['_id'], output_filepath)

output_item_id = output_item['_id']

# Finally promote item to dataset
with timer("Promited item %s to dataset" % output_item_id):
    client.post('minerva_dataset/%s/dataset' % output_item_id)
