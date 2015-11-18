# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|
  config.vm.box = "ubuntu/trusty64"

  config.vm.network "forwarded_port", guest: 8080, host: 8080

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


  if File.directory?("../girder")
    config.vm.synced_folder "../girder", "/opt/girder", owner: 1003, group: 1003
  end

  if File.directory?("../romanesco")
    config.vm.synced_folder "../romanesco", "/opt/romanesco", owner: 1002, group: 1002
  end


  config.vm.synced_folder ".", "/vagrant", disabled: true
  config.vm.synced_folder ".", "/opt/minerva", owner: 1003, group: 1003

  config.vm.provision "ansible" do |ansible|
    ansible.groups = {
      "all" => ['minerva'],
      "girder" => ['minerva'],
      "mongo" => ['minerva'],
      "rabbitmq" => ['minerva']
    }

    ansible.extra_vars = {
      default_user: "vagrant"
    }

    ansible.playbook = "ansible/site.yml"
  end
end
