#!/bin/bash

if [ $# -lt 2 ]
then
echo "install script"
echo "arg1: influx token"
echo "arg2: influx bucket"
exit 0
fi

# Get the public IP address of the machine
nat_address=$(curl ifconfig.me)

chain=genesis.json

sudo apt install -y curl

# Set the version of the node
version=$(curl -s https://api.github.com/repos/NEXTEP-CXS/nxchain/releases/latest | grep tag_name | awk '{print $2}' | tr -d '",' | cut -c 2-)

# Set the path to the binary file
binary_path="/usr/local/bin/nxchain"

# Set the path to the data directory
data_dir="/data/nxchain"

# Set the path to store telegraf secrets
telegraf_conf_dir="/usr/local/telegraf"
telegraf_conf_file="telegraf.env"

influx_token=$1
influx_bucket=$2

# Set any additional flags or options for the node
flags="--price-limit 5000000000 --nat $nat_address --chain $data_dir/$chain --libp2p 0.0.0.0:4546 --jsonrpc :4545 --seal"

# Download the binary file
wget https://github.com/NEXTEP-CXS/nxchain/releases/download/v$version/nxchain_$version\_linux_amd64.tar.gz

# Extract the binary file
tar -xvzf nxchain_$version\_linux_amd64.tar.gz

# Remove the tar.gz file
rm nxchain_$version\_linux_amd64.tar.gz

# Move the binary file to the specified path
sudo mv nxchain $binary_path

# Create the data directory if it doesn't exist
sudo mkdir -p $data_dir

# Generate new node secret

sudo $binary_path secrets init --data-dir $data_dir

# cleanup
sudo rm -f $data_dir/$chain
# fetch genesis.json
sudo wget -P $data_dir https://raw.githubusercontent.com/NEXTEP-CXS/nxchain/master/$chain

# Create the service file
sudo bash -c "cat >/etc/systemd/system/nxchain.service <<EOL
[Unit]
Description=NXChain
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=$binary_path server --data-dir $data_dir $flags
User=root

[Install]
WantedBy=multi-user.target
EOL"

sudo systemctl enable nxchain

# Install telegraf
wget -q https://repos.influxdata.com/influxdata-archive_compat.key
echo '393e8779c89ac8d958f81f942f9ad7fb82a25e133faddaf92e15b16e6ac9ce4c influxdata-archive_compat.key' | sha256sum -c && cat influxdata-archive_compat.key | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg > /dev/null
echo 'deb [signed-by=/etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg] https://repos.influxdata.com/debian stable main' | sudo tee /etc/apt/sources.list.d/influxdata.list
sudo apt-get update
sudo apt-get install telegraf -y

# Create telegraf service file
sudo bash -c "cat >/etc/systemd/system/telegraf.service <<EOL
[Unit]
Description=Telegraf
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=telegraf --config https://eu-central-1-1.aws.cloud2.influxdata.com/api/v2/telegrafs/0abf0c860d2c4000
EnvironmentFile=\"/$telegraf_conf_dir/$telegraf_conf_file\"
User=root

[Install]
WantedBy=multi-user.target
EOL"

sudo mkdir $telegraf_conf_dir

sudo bash -c "cat >$telegraf_conf_dir/$telegraf_conf_file <<EOL
INFLUX_TOKEN=$influx_token
INFLUX_BUCKET=$influx_bucket
EOL"

sudo systemctl enable telegraf
sudo systemctl start telegraf
sudo systemctl start nxchain
