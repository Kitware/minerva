Extending Minerva
=================

Creating a Minerva Plugin
~~~~~~~~~~~~~~~~~~~~~~~~~
Minerva plugins are **identical** to Girder plugins with the exception that they have a hard dependency on Minerva. This ensures that Minerva will be loaded before your plugin is.

Minerva utilizes the Girder plugin system, so it will be worthwhile to familiarize yourself with their section on `Plugin Development <http://girder.readthedocs.org/en/latest/plugin-development.html>`_.


Below is an example configuration for a Minerva plugin, note the dependency on Minerva:

.. code-block:: python

   {
       "name": "My Minerva Plugin",
       "dependencies": ["minerva"]
   }

Your new Minerva plugin should provide no new functionality at this point, and `can be enabled through the administration console <http://girder.readthedocs.org/en/latest/installation.html#initial-setup>`_.


Extending the look and feel of Minerva
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

While Minerva plugins follow the guidelines provided by Girder's client side, there are additional concerns when writing for Minerva.

.. note:: Girder has documentation on `extending the client-side application <http://girder.readthedocs.org/en/latest/plugin-development.html#extending-the-client-side-application>`_ which also applies to Minerva.

Minerva Panel Views
-------------------
Minerva renders panels in a particular way, as a result there are some guidelines that need be followed when creating your own Panels:

- Panels should never call render within their initialize function
- Panel views must extend the base Panel view

.. code-block:: javascript

    minerva.views.CoolNewPanel = minerva.views.Panel.extend({

- Panel views need to call their parent initialize method to take advantage of collapsible, removable, configurable panels

.. code-block:: javascript

    // inside CoolNewPanel's initialize function
    minerva.views.Panel.prototype.initialize.apply(this);


Configure Minerva's layout
--------------------------
Taking our example plugin from before, we can alter how Minerva displays different panels.

Let's pretend our use case of Minerva deems the Jobs Panel useless, and is more focused on the datasets available. In this case one might want to disable the Jobs Panel entirely, and move the datasets panel to the top.

From your plugin root, create a JavaScript file at ``web_client/js/some-file.js`` and add the following code:

.. code-block:: javascript

   girder.events.once('m:pre-render-panel-groups', function (sessionView) {
       var leftPanelGroup = sessionView.getPanelGroup('m-left-panel-group');

       // Disable/remove the jobs panel
       sessionView.disablePanel('m-jobs-panel');

       // Move the 'Available Datasets' panel to the top
       leftPanelGroup.panelViews.sort(function (a, b) {
           if (a.id === 'm-data-panel') {
               return -1;
           } else if (b.id === 'm-data-panel') {
               return 1;
           } else {
               return 0;
           }
       });
   });

Above we utilize the ``m:pre-render-panel-groups`` event to hook into Minerva before any panels are actually rendered, this gives full control over what the final layout looks like.
