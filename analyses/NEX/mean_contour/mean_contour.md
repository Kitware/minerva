## Read me
  This document contains information about how to set up and use the mean contour analysis as a demonstration of the minerva, girder, romanesco, spark integration.  Eventually it should be removed along with mean contour analysis.  This is here primarily so that while mean_contour.py is in master there is some kind of documentation for how it works.

## Pre Demo
 - Remove all datasets from backend through girder under minerva/dataset
 - Remove nasanex folder under minerva/s3
 - Remove S3 assetstores
   - Removing NEX-DCP30 asset store will require deleting it from the database.  This is a bug and I have a note to file an issue

```
$> mongo
> use girder;
> db.assetstore.remove({“bucket”: “nasanex”});
```

- Remove all jobs

```
$> mongo
> use girder;
> db.job.remove({})
```

- Create the NASA DEMO dataset
   - Open minerva (http://localhost:8080) 
   - Log in and go to the NASA DEMO session
       - username: kotfic
       - password:  letmein
   - Click add dataset
   - select s3 bucket,  click add dataset
   - Fill in the following:
     - name: NASA DEMO
     - s3 bucket: nasanex
     - prefix: CMIP5/CommonGrid/gfdl-esm2g/rcp45/mon/r1i1p1/pr
     - All other are left empty
     - check read only
   - Refresh the page if completed import doesn’t show up immediately

   - Return to session page (click globe icon)  - START FROM HERE



## Add S3 Dataset
 - Click on the ‘mean contour’ analysis
 - Input dataset is prefilled with datasets that have items which are selected
 - Currently parameter field requires manual input of the variable name in the netCDF file
 - Enter ‘pr’ in the parameter field
 - Click Run
   - *Mean contour job should show up in the Jobs panel*
 - Click on mean contour job
   - *job status is available,  including log output*
   - Behind the spinning wheel a local job has been dispatched to our workflow tool Romanesco
   - Romanesco defines tasks, input and output formats, and other metadata for analyses
   - Romanesco uses celery to do asynchronous task scheduling
   - Tasks can be chained together into workflows which can provide data provenance.   
   - Tasks can be Written in Python,  R, or run arbitrary scripts inside of docker containers.
   - Can also set up a spark context and provide it to a task
   - Like this tasks can leverage a spark cluster to do large scale parallel computations
 - *Once mean contour is complete ‘regridded_...’  dataset should be created in dataset panel*
 - Click on arrow next to ‘regridded’  dataset
 - Clicking on it puts it on the session layer panel and renders the contour layer to the map

