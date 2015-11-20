Developer Guide
===============

Jade
----

All indentions should be 2 spaces.

Register modals as girderModal
------------------------------

When creating modal dialogs, call ``girderModal``, passing in the view object

::


    var modal = this.$el.html(minerva.templates.wmsLayersListWidget({
            layers: this.layers
    })).girderModal(this);
        

HTML Elements Namespacing and Style
-----------------------------------

Namespace all ids and classes of elements with 'm-', and use kebab case.

E.g.  'm-opacity-container'

When doing work, adapt any existing elements that don't adhere to this style that
you happen to see (be sure to update the stylus and any Javascript that refer to the element
also).

When QAing, force new work to adhere to this style.

Be careful not to force this namespacing or style on elements from third party libraries, e.g.
'icon-upload' from Fontello.

GeoJS Version
-------------

Since Minerva is often developed against cutting edge GeoJS versions, we specify the
version of GeoJS in the package.json file.  If you need to develop against a specific
reference of GeoJS for a Minerva feature, update the SHA reference for 'geojs' in
package.json as part of your branch.

Minerva Metadata
----------------

Minerva metadata should not contain pointers to the Item's id.  E.g., a dataset should not have a 'dataset_id' property in its Minerva metadata.  The id is tracked in the Item itself, and it would be hard to update these upon a copy.

It is fine to have a pointer to a different Girder resource's id.

Dataset and Source API endpoints
--------------------------------

These should return the document corresponding to the Girder Item, including the metadata, rather than the Minerva metadata.
