#!/bin/bash
systemctl stop nxchain
wget https://raw.githubusercontent.com/unforkableorg/polygon-edge/master/genesis-testnet.json
rm -rf nxchain
wget https://github.com/unforkableorg/nxchain/releases/download/v0.6.2-alpha-0.8/nxchain_0.6.2-alpha-0.8_linux_amd64.tar.gz
tar -xvf nxchain_0.6.2-alpha-0.8_linux_amd64.tar.gz
chmod u+x nxchain
systemctl start nxchain