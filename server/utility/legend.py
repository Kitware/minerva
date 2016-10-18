import matplotlib #noqa
matplotlib.use('Agg') #noqa
import matplotlib.pyplot as plt #noqa

from base64 import b64encode
from io import BytesIO


def encode_png(fig):
    """Encodes a matplotlib figure"""
    buf = BytesIO()
    fig.savefig(buf, format='png')
    image_base64 = b64encode(buf.getvalue()).decode('utf-8').replace('\n', '')
    buf.close()
    return image_base64


def range_count(start, stop, count):
    """Generates a list with given start
    stop and count with linear spacing
    e.g. range_count(1, 3, 5) = [1., 1.5, 2., 2.5, 3.]
    """

    step = (stop - start) / float(count-1)
    return [round(start + i * step, 2) for i in xrange(count)]


def get_axes(params):
    fig = plt.figure()
    figlegend = plt.figure(figsize=(3, 3))
    ax = fig.add_subplot(111)
    vals = range_count(float(params['min']),
                       float(params['max']),
                       6)

    axes = [ax.scatter(0, 0, color=c) for c in params['ramp[]']]

    try:
        figlegend.legend(axes, vals, 'center', title=params['attribute'])
    except KeyError:
        figlegend.legend(axes, vals, 'center')

    return figlegend


def generate_legend(params):

    if not params['subType'] == 'multiband':
        figlegend = get_axes(params)
        return encode_png(figlegend)
        plt.cla()
