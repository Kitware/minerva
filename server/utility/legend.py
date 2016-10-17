from base64 import b64encode
from io import BytesIO

import numpy as np
import matplotlib.pyplot as plt

def generate_legend(params):

    if params['subType'] == 'point':
        fig = plt.figure()
        figlegend = plt.figure(figsize=(2,1))
        ax = fig.add_subplot(111)
        lines = ax.plot(range(10), np.random.randn(10), range(10), np.random.randn(10))
        figlegend.legend(lines, ('one', 'two'), 'center')
        buf = BytesIO()
        figlegend.savefig(buf, format='png')
        image_base64 = b64encode(buf.getvalue()).decode('utf-8').replace('\n', '')
        buf.close()
        return image_base64
    elif params['subType'] == 'line':
        print "It is a line"
    elif params['subType'] == 'polygon':
        print "It is a polygon"
    elif params['subType'] == 'singleband':
        print "It is a singleband raster"
    elif params['subType'] == 'multiband':
        print "It is a multiband raster"
