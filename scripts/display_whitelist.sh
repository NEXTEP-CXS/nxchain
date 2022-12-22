#!/bin/bash
docker run -v $(pwd):$(pwd) unforkable/polygon-edge:0.6.2-alpha-0.1 whitelist show --chain $(pwd)/genesis.json