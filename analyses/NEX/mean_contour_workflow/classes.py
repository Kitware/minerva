from romanesco import specs
import os
import tempfile
import numpy as np
#from bson import json_util
#import time
#from contextlib import contextmanager
#from romanesco.utils import tmpdir
from netCDF4 import Dataset


def debug(msg):
    print msg


class MinervaTask(specs.Task):

    __inputs__ = specs.PortList([])
    __outputs__ = specs.PortList([])

    script_template = """
import pudb; pu.db
import sys
sys.path.append("{module_dir}")
from {module} import {cls}

if __name__ == "__romanesco__":
    {outputs} = {cls}().run({inputs})
"""

    def __init__(self, *args, **kwargs):
        super(MinervaTask, self).__init__({}, **kwargs)
        self['mode'] = "python"
        self['write_script'] = True

        self['script'] = self.script_template.format(**{
            "module_dir": "/home/kotfic/kitware/projects/NEX/src/OpenGeoscience/minerva/analyses/NEX/",
            "module": "mean_contour_workflow",
            "cls": self.__class__.__name__,
            "inputs": ", ".join([p['name'] for p in self.__inputs__]),
            "outputs": ", ".join([p['name'] for p in self.__outputs__])
        })

    def run(self, *args, **kwargs):
        raise Exception("run() must be implemented in a subclass")


class MinervaSparkTask(MinervaTask):
    script_template = """
import pudb; pu.db
import sys
sys.path.append("{module_dir}")
from {module} import {cls}

if __name__ == "__romanesco__":
    {outputs} = {cls}().set_context(sc).run({inputs})
"""
    def __init__(self, *args, **kwargs):
        super(MinervaSparkTask, self).__init__(*args, **kwargs)
        self['mode'] = 'spark.python'


    def set_context(self, sc=None):
        self.sc = sc
        return self


# class GetItem(Task):
#     __inputs__ = specs.PortList([
#         {"name": "fileId", "type": "string", "format": "json"}])
#
#     __outputs__ = specs.PortList([
#         {"name": "path", "type": "string", "format": "text"}])
#
#     def run(self, host, port, token, fileId):
#         # Do stuff here
#         return "foo/bar"



class NetCDFMean(MinervaSparkTask):

    __inputs__ = specs.PortList([
        {"name": "file_path", "type": "string", "format": "text"},
        {"name": "variable", "type": "string", "format": "text"},
        {"name": "grid_chunk_size", "type": "number", "format": "number",
         "default": {"format": "number", "data": 20}},
        {"name": "partitions", "type": "number", "format": "number",
         "default": {"format": "number", "data": 8}}
    ])

    __outputs__ = specs.PortList([
        {"name": "output", "type": "string", "format": "json"},
    ])


    def toNetCDFDataset(self, source, variable, data):
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
        dimensions = map(lambda d: d, source.dimensions)
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

        if type(data) == list:
            for i in xrange(len(data)):
                output.variables[variable][i] = data[i]
        else:
            output.variables[variable][:] = data

        return output


    def run(self, filepath, parameter, grid_chunk_size, partitions):
        data = Dataset(filepath)
        pr = data.variables[parameter]

        # Get the number of timesteps
        num_timesteps = data.variables['time'].size

        # For now don't break up timesteps,  just take mean across
        # Grid sections. If we set this to some other value it would
        # produce a new dataset with (num_timesteps / timesteps)  new
        # panels where each panel was the mean of that group of timesteps
        # e.g.,  if timesteps was 10  and num_timesteps was 50 we would have
        # 5 panels,  with the average of timesteps 0-10, 10-20, 20-30 etc
        timesteps = num_timesteps

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
        grid_chunks = self.sc.parallelize(grid_chunks, partitions)

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

        return self.toNetCDFDataset(data, parameter, timestep_means)
