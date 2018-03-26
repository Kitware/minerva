## Map Adapters Design

This document holds the design intention behind the Map Adapters.

Map Adapters are intended to decouple Datasets from specific map renderings of
those datasets, so that an arbitrary dataset may be visualized through
potentially multiple map visualizations.  Map adapters also decouple the data of
the client side Dataset object from the map layer, so that client- or eventually
server-side processes can be interposed between the dataset and the layer to
provide filtering, subselecting, and other processing operations, enabling a
large dataset to be visualized without overwhelming the memory of the browser.

Map Adapters are currently all defined in the `adapters.js` file, but further
or current adapters could be split out into separate files.

The language is probably confusing and not applied in a completely consistent
way, so here we attempt to provide guidance through defining terms.  This will
likely make sore spots more obvious so that they may be addressed.

* `Adapter` will couple a dataset to a visualization.  Currently there doesn't
seem to be a clear distinction between an Adapter and a Representation, this
is an area for improvement.  Likely an Adapter can take a server side dataset
and provide a downsampled, transformed view of it, which data can then be passed
to a Representation along with a visProperties object for rendering.
* `AdapterRegistry` holds a mapping of adapter type names to adapter definitions
* `Layer` is generally used as a layer in a GeoJs map
* `Representation` is a definition of how to render a Dataset as a GeoJs layer
of a specific visualization type.  This word was chosen because `View` has a
specific meaning in Backbone as a UI component that can render itself--in this
case our layers are not UI components that are themselves rendered, but we take
data, create a GeoJs layer with that data, add the GeoJs layer to a GeoJs map
that is owned by the MapPanel (a Backbone View), and when the MapPanel is
rendered, it will call render on the GeoJs map, which in turn calls render on
the individual layers that have been added to the map.  We never call render
on the individual map layers from Minerva.
* `MapPanel` is the specific Backbone View that renders a panel and also owns
a reference to the GeoJs map, displayed inside that panel
* `MapContainer` is a subset of functions of the MapPanel that are invoked by
the AdapterRegistry and Adapters, so could be considered an interface that
needs to be implemented if we break apart the design of the `MapPanel`.  This
might be useful if we move to a design of a MapContainer which has a MapPanel,
a GeoJs map, a panel controlling the layers (the current LayersPanel), and
possibly other panels relevant to map display (legends, vis property mappings,
info widgets)

The MapPanel currently takes a dataset and visualizes it a specific
Representation tied to the Dataset type.  The `addDataset` method of `MapPanel`
takes in `layerType` and `visProperties` params, which should allow the ability
to specify the visualization desired for a dataset once there are UI components
created to allow the user to make that choice, breaking the coupling of Dataset
type to visualization type.

The AdapterRegistry currently loads the dataset data directly on the client side
Dataset model, storing that data in the `geoData` attribute of the model inside
the `_createRepresentation` function, though this can be modified to get the
data from the server through an async method, by changing the implementation
of `_createRepresentation`.  A `visProperties` object is passed into the 
`_createRepresentation` and on to the definition of the Representations, which
is intended to hold properties that define how the data should be rendered
in the given Representation type, though perhaps an additional set of options
may be required to specify the server side processing of the data.

A `MapRepresentation` should most likely use `minerva.rendering.geo.MapRepresentation`
as its ParentDefinition, when defining a new representation type through the
`defineMapLayer` utility function.  The requirements of a representation are
to provide an `init` method that takes in `container`, `dataset`, and optionally
`visProperties` and `data` params, then defines a GeoJs layer using those params.

Currently, and for simplicity's sake, the MapRepresentations are immutable, meaning
that if a new set of visProperties is desired, a layer will have to be removed from
the map, then re-displayed, which results in a new MapRepresentation object being
created.

The visProperties objects do not have a common interface at this time, and are
merely a collection of properties.  It may be desireable to provide an interface
or a set of utility functions that allow the combination of a Dataset and a desired
Visualization type to define a visProperties object.  That object could then be
passed to some UI that allows the user to enter the proper input needed to map the
specific Dataset to the desired visualization type, along with setting any relevant
style and display properties.
