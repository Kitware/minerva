==============
Datasets panel
==============
Dataset panel is the central place to manage your datasets. Datasets are available to all sessions of a user. A user could choose to share dataset with other users.


Upload
======
.. image:: img/datasets_panel-upload_button.png

This is the initial state of dataset panel.
You could use this upload button to upload dataset. See :doc:`/getting-started` for more detail.

|
|

Dataset actions
===============

Visualize dataset
-----------------
.. image:: img/datasets_panel-globe_button.png

The globe button after the dataset name adds the dataset to layer panel and visualize the dataset.

Once the dataset is visualized, the globe button will be replaced by a remove button. Click this button to remove the dataset from visualization.

.. image:: img/datasets_panel-dataset_shown_remove.png

|

Delete dataset
--------------
.. image:: img/datasets_panel-trash_button.png

The trash button after dataset name deletes one dataset. A confirmation prompt will be shown before deleting the dataset. Dataset deletion is irreversible.

|

Dataset info
------------
.. image:: img/datasets_panel-info_button.png

Info button shows a popup window displaying dataset related metadata

|
|

Dataset selection actions
=========================
There are features available only when there are datasets in selected states. To select a dataset or group of datasets, hover the cursor on a dataset or category icon, then check the checkbox.

.. image:: img/datasets_panel_selection-single.png

Dataset selection action will appear at the top right corner of the panel. Some are only available when one dataset is selected. Some are available when multiple datasets are selected.

|

Visualize datasets boundaries
-----------------------------
.. image:: img/datasets_panel-selection-boundary_button.png

This button visualizes boundary bounding box of one or more selected datasets. 

.. image:: img/datasets_panel-boundary_shown-buttons.png

When boundaries are being visualized, two additional actions will be available to toggle the label of boundaries or remove all boundaries.

|

Filter dataset list boundary
----------------------------
.. image:: img/datasets_panel-selection-filter_button.png

When there is one dataset selected, this button filters the list of datasets available and only show datasets that overlap the boundary of selected dataset. 

.. image:: img/datasets_panel-filtered_remove-filter-button.png

When the list of datasets are being filtered, a remove button will be available to stop the filtering.

|

Visualize or delete multiple datasets
-------------------------------------
.. image:: img/datasets_panel-selection_multiple-globe-remove-buttons.png

When more than one dataset has been selected, a globe and a trash can button will appear on the top right as selection actions. Those buttons will visualize or delete all selected datasets.

|

Share datasets
--------------
.. image:: img/datasets_panel-selection-share_button.png

This action will make selected datasets available to other users to read. Shared dataset won't be editable by other users. The dataset icon will change to indicate the dataset is being shared.

|
|

Toggle shared dataset visibility
================================
.. image:: img/datasets_panel-shared_dataset_shown-toggle_share_button.png

The person icon is a toggle action to show or hide datasets shared by other users. The person icon in front of dataset name indicates this dataset is being shared with the user.
