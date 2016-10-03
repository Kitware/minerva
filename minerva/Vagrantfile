# -*- mode: ruby -*-
# vi: set ft=ruby :

# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|
  config.vm.box = "ubuntu/trusty64"

  if Vagrant.has_plugin?("vagrant-cachier")
    config.cache.scope = :box
    config.cache.enable :apt
    config.cache.enable :pip
    config.cache.enable :npm
  end

  host_port = ENV["GIRDER_HOST_PORT"] || 8080
  guest_port = ENV["GIRDER_GUEST_PORT"] || 8080
  dev_install = ENV["DEVELOPMENT"] || false
  setup_tests = ENV["TESTING"] || false

  minerva_version = ENV["MINERVA_VERSION"] || `git rev-parse --short HEAD`.delete!("\n")

  config.vm.network "private_network", type: "dhcp"

  config.vm.network "forwarded_port", guest: guest_port, host: host_port

  config.vm.define "minerva" do |node| end

  config.vm.provider "virtualbox" do |vb|
    host = RbConfig::CONFIG['host_os']

    # Give VM 1/4 system memory & access to 1/2 of the cpu cores on the host
    if host =~ /darwin/
      cpus = `sysctl -n hw.ncpu`.to_i
      cpus = cpus / 2
      # sysctl returns Bytes and we need to convert to MB
      mem = `sysctl -n hw.memsize`.to_i / 1024 / 1024 / 4
    elsif host =~ /linux/
      cpus = `nproc`.to_i
      cpus = cpus / 2
      # meminfo shows KB and we need to convert to MB
      mem = `grep 'MemTotal' /proc/meminfo | sed -e 's/MemTotal://' -e 's/ kB//'`.to_i / 1024 / 4
    else # Guess!
      cpus = 2
      mem = 4096
    end

    vb.customize ["modifyvm", :id, "--memory", mem]
    vb.customize ["modifyvm", :id, "--cpus", cpus]
    vb.customize ["modifyvm", :id, "--nictype1", "virtio"]
    vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
    vb.customize ["modifyvm", :id, "--natdnsproxy1", "on"]

  end

  config.vm.synced_folder ".", "/vagrant", disabled: true


  # If DEVELOPMENT is true,  mount NFS directories from host
  if dev_install and Vagrant.has_plugin?("vagrant-bindfs")
    setup_tests = true
    if File.exists? File.expand_path(".")
      config.vm.synced_folder ".", "/tmp/minerva-nfs", type: "nfs"
      config.bindfs.bind_folder "/tmp/minerva-nfs", "/opt/minerva/" + minerva_version,
                                after: :provision,
                                o: "nonempty",
                                u: "girder",
                                g: "girder"
    end

  end

  config.vm.provision "ansible" do |ansible|
    ansible.groups = {
      "all" => ['minerva'],
      "girder" => ['minerva'],
      "minerva" => ['minerva']
    }

    ansible.extra_vars = {
      default_user: "vagrant",
      girder_port: guest_port,
      girder_version: File.read(File.dirname(__FILE__) + "/.girder-version").delete!("\n"),
      minerva_version: minerva_version,
      setup_tests: setup_tests
    }

    ENV["GIRDER_VERSION"] && ansible.extra_vars['girder_version'] = ENV["GIRDER_VERSION"]

    ansible.verbose = "-vv"
    ansible.playbook = "ansible/site.yml"
    ansible.galaxy_role_file = "ansible/requirements.yml"
  end
end
