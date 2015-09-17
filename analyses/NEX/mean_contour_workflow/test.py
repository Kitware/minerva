import romanesco
from classes import NetCDFMean, NetCDFToContourJson
from romanesco.specs import Workflow
from girder_client import GirderClient

if __name__ == "__main__":
    wf = Workflow()

    wf.add_task(NetCDFMean(), "m")
    wf.add_task(NetCDFToContourJson(), "c")

    wf.connect_tasks("m", "c", {"output": "data"})

    c = GirderClient('localhost', 8081)
    c.authenticate("kotfic", "letmein")

    output = romanesco.run(
        wf,
        inputs={
            "file_path": {
                'mode': 'girder',
                'host': 'localhost',
                'scheme': 'http',
                'port': 8081,
                'api_root': '/api/v1',
                'resource_type': 'file',
                'id': "55df4fbaf4b1496693a3c464",
                'type': 'string',
                'format': 'text',
                "name": "test.nc",
                'token': c.token
            },
            "m.variable": {
                "format": "text",
                "data": "pr"},
            "c.variable": {
                "format": "text",
                "data": "pr"}},
        outputs={
            'contour': {
                'mode': 'girder',
                'name': 'test.json',
                'host': 'localhost',
                'scheme': 'http',
                'port': 8081,
                'api_root': '/api/v1',
                'parent_type': 'folder',
                'parent_id': "55b13466f4b149110f800aa1",
                'format': 'json',
                'type': 'string',
                'token': c.token
            }})
#    "file_path": {
#        'format': 'text',
#        'data': "/home/kotfic/kitware/projects/NEX/data/test.nc"},
