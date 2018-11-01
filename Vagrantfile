require 'socket'

Vagrant.configure("2") do |config|
  config.vm.box = "centos/7"
  config.vm.network :forwarded_port, guest: 8443, host: 8443
  config.vm.network :forwarded_port, guest: 443, host: 443
  config.vm.network :forwarded_port, guest: 80, host: 80

  config.vm.provider "virtualbox" do |vb|
    vb.name = "centshift"
    vb.cpus = 4
    vb.memory = 8192
  end

  config.vm.provision :ansible do |ansible|
    ansible.become = true
    ansible.playbook = "provision/playbook.yml"
    ansible.extra_vars = {
      host_ip: Socket.ip_address_list.detect{|intf| intf.ipv4_private?}.ip_address
    }
  end
end