#!/bin/bash

# Get the public IP address of the machine
nat_address=$(curl ifconfig.me)

chain=genesis-testnet.json

# Set the version of the node
version=$(curl -s https://api.github.com/repos/unforkableorg/nxchain/releases/latest | grep tag_name | awk '{print $2}' | tr -d '",' | cut -c 2-)

# Set the path to the binary file
binary_path="/usr/local/bin/nxchain"

# Set the path to the data directory
data_dir="/data/nxchain"

# Set any additional flags or options for the node
flags="--price-limit 5000000000 --nat $nat_address --chain $data_dir/genesis-testnet.json --libp2p 0.0.0.0:4546 --jsonrpc :4547 --seal"

# Download the binary file
wget https://github.com/unforkableorg/nxchain/releases/download/v$version/nxchain_$version\_linux_amd64.tar.gz

# Extract the binary file
tar -xvzf nxchain_$version\_linux_amd64.tar.gz

# Remove the tar.gz file
rm nxchain_$version\_linux_amd64.tar.gz

# Move the binary file to the specified path
sudo mv nxchain $binary_path

# Create the data directory if it doesn't exist
sudo mkdir -p $data_dir

sudo $binary_path secrets init --data-dir $data_dir

# Generate new node secret

sudo rm -f $data_dir/$chain
sudo wget -P $data_dir https://raw.githubusercontent.com/unforkableorg/nxchain/master/$chain

# Create the service file
sudo bash -c "cat >/etc/systemd/system/nxchain.service <<EOL
[Unit]
Description=NXChain

[Service]
ExecStart=$binary_path server --data-dir $data_dir $flags
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOL"