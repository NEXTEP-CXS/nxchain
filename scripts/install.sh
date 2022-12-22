#!/bin/bash
mkdir masternode
cd masternode
docker pull unforkable/polygon-edge:0.6.2-alpha-0.1
docker run -v $(pwd):$(pwd) unforkable/polygon-edge:0.6.2-alpha-0.1 secrets init --data-dir $(pwd)/mynode
wget https://raw.githubusercontent.com/unforkableorg/polygon-edge/master/genesis-testnet.json
wget https://raw.githubusercontent.com/unforkableorg/polygon-edge/master/scripts/run.sh
wget https://raw.githubusercontent.com/unforkableorg/polygon-edge/master/scripts/nxchain.service
wget https://raw.githubusercontent.com/unforkableorg/polygon-edge/master/scripts/update.sh
mv nxchain.service /etc/systemd/system/nxchain.service
systemctl daemon-reload
systemctl enable nxchain
systemctl start nxchain