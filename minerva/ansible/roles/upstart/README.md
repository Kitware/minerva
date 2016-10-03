upstart
=======

Adds an Upstart service.

Role Variables
--------------

You **must** specify:

* `service_name` - The name of the service
* `service_exec` - The executable and arguments to run

The default variables are as follows:

```
service_env: ''                                # Environment variables as 'VAR=val VAR2=val2'
service_chdir: '{{ service_exec | dirname }}'  # The directory to execute from
service_user: '{{ ansible_ssh_user }}'         # The user that runs the service executable
service_respawn_limit: '20 5'                  # How many times to respawn and the wait time in sec
service_restart: true                          # Whether to restart the service once configured
service_log_file: '{{ service_chdir }}/log/{{ service_name }}.log'  # Where to send stdout+stderr
```


Example Playbook
----------------

```
- hosts: servers
  roles:
    - role: ssilab.upstart
      service_name: 'my-app'
      service_chdir: '{{ deploy_helper.current_path }}'
      service_exec: 'nodejs server.js'
```

License
-------

BSD. See LICENSE.
