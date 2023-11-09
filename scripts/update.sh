#!/bin/bash

# Functions to log messages
log_info() {
    echo "INFO: $1"
}

log_error() {
    echo "ERROR: $1" >&2
}

# Function to check for a required command
require_cmd() {
    command -v "$1" >/dev/null 2>&1 || {
        log_error "Command not found: $1. Please install it and run this script again."
        exit 1
    }
}

# Check for required commands
require_cmd curl
require_cmd wget
require_cmd gpg
require_cmd systemctl
require_cmd apt-get
require_cmd sha256sum
require_cmd tar
require_cmd rm
require_cmd mv
require_cmd mkdir
require_cmd bash
require_cmd tee

if [ "$#" -lt 2 ]; then
    log_info "Usage: $0 <influx token> <influx bucket>"
    exit 0
fi

# Get the public IP address of the machine
log_info "Retrieving public IP address..."
if ! nat_address=$(curl -s ifconfig.me); then
    log_error "Failed to retrieve public IP address."
    exit 1
fi

log_info "Public IP is $nat_address."

chain="genesis.json"

log_info "Installing curl..."
if ! sudo apt-get install -y curl; then
    log_error "Failed to install curl."
    exit 1
fi

log_info "Fetching the latest version number..."
if ! version=$(curl -s https://api.github.com/repos/NEXTEP-CXS/nxchain/releases/latest | grep tag_name | awk '{print $2}' | tr -d '",' | cut -c 2-); then
    log_error "Failed to fetch the latest version number."
    exit 1
fi

log_info "Latest version is $version."

binary_path="/usr/local/bin/nxchain"
data_dir="/data/nxchain"
telegraf_conf_dir="/usr/local/telegraf"
telegraf_conf_file="telegraf.env"

influx_token=$1
influx_bucket=$2

flags="--price-limit 5000000000 --nat $nat_address --chain $data_dir/$chain --libp2p 0.0.0.0:4547 --jsonrpc :4545 --prometheus 127.0.0.1:5555 --seal"

log_info "Downloading nxchain version $version..."
if ! wget "https://github.com/NEXTEP-CXS/nxchain/releases/download/v$version/nxchain_${version}_linux_amd64.tar.gz"; then
    log_error "Failed to download nxchain version $version."
    exit 1
fi

log_info "Extracting the binary..."
if ! tar -xvzf "nxchain_${version}_linux_amd64.tar.gz"; then
    log_error "Failed to extract the binary."
    exit 1
fi

log_info "Cleaning up downloaded tar.gz file..."
if ! rm "nxchain_${version}_linux_amd64.tar.gz"; then
    log_error "Failed to remove the tar.gz file."
    exit 1
fi

log_info "Moving the binary to $binary_path..."
if ! sudo mv nxchain "$binary_path"; then
    log_error "Failed to move the binary to $binary_path."
    exit 1
fi

log_info "Creating data directory at $data_dir..."
if ! sudo mkdir -p "$data_dir"; then
    log_error "Failed to create data directory at $data_dir."
    exit 1
fi

log_info "Cleaning up and fetching $chain..."
if ! (sudo rm -f "$data_dir/$chain" && sudo wget -P "$data_dir" "https://raw.githubusercontent.com/NEXTEP-CXS/nxchain/master/$chain"); then
    log_error "Failed to cleanup or fetch $chain."
    exit 1
fi

# Install telegraf
log_info "Installing telegraf..."
if ! wget -qO - https://repos.influxdata.com/influxdata-archive_compat.key | gpg --dearmor | sudo tee /usr/share/keyrings/influxdata-archive-keyring.gpg > /dev/null; then
    log_error "Failed to download and install GPG key for telegraf."
    exit 1
fi

if ! echo "deb [signed-by=/usr/share/keyrings/influxdata-archive-keyring.gpg] https://repos.influxdata.com/debian stable main" | sudo tee /etc/apt/sources.list.d/influxdata.list; then
    log_error "Failed to add telegraf repository."
    exit 1
fi

if ! sudo apt-get update && sudo apt-get install -y telegraf; then
    log_error "Failed to install telegraf."
    exit 1
fi

log_info "Configuring telegraf..."
if ! sudo mkdir -p "$telegraf_conf_dir"; then
    log_error "Failed to create telegraf configuration directory."
    exit 1
fi

telegraf_env_content="INFLUX_TOKEN=$influx_token
INFLUX_BUCKET=$influx_bucket
"

if ! echo "$telegraf_env_content" | sudo tee "$telegraf_conf_dir/$telegraf_conf_file" > /dev/null; then
    log_error "Failed to create telegraf environment file."
    exit 1
fi

# Create telegraf service override for environment file
telegraf_service_override_dir="/etc/systemd/system/telegraf.service.d"
telegraf_service_override_file="override.conf"
if ! sudo mkdir -p "$telegraf_service_override_dir"; then
    log_error "Failed to create telegraf service override directory."
    exit 1
fi

telegraf_service_override_content="[Service]
EnvironmentFile=-$telegraf_conf_dir/$telegraf_conf_file
"

if ! echo "$telegraf_service_override_content" | sudo tee "$telegraf_service_override_dir/$telegraf_service_override_file" > /dev/null; then
    log_error "Failed to create telegraf service override file."
    exit 1
fi

log_info "Reloading systemd daemon..."
if ! sudo systemctl daemon-reload; then
    log_error "Failed to reload systemd daemon."
    exit 1
fi

log_info "Enabling and starting telegraf service..."
if ! sudo systemctl enable telegraf && sudo systemctl restart telegraf; then
    log_error "Failed to enable and start telegraf service."
    exit 1
fi
# Configure rsyslog for nxchain logging
log_info "Configuring rsyslog for nxchain..."
rsyslog_conf_content="\$ActionQueueType LinkedList # use asynchronous processing
\$ActionQueueFileName srvrfwd # set file name, also enables disk mode
\$ActionResumeRetryCount -1 # infinite retries on insert failure
\$ActionQueueSaveOnShutdown on # save in-memory data if rsyslog shuts down

# forward over tcp with octet framing according to RFC 5425
:programname, isequal, "nxchain" @@(o)127.0.0.1:6514;RSYSLOG_SyslogProtocol23Format
"

if ! echo "$rsyslog_conf_content" | sudo tee /etc/rsyslog.d/50-nxchain.conf > /dev/null; then
    log_error "Failed to configure rsyslog for nxchain."
    exit 1
fi

log_info "Restarting rsyslog service..."
if ! sudo systemctl restart rsyslog; then
    log_error "Failed to restart rsyslog service."
    exit 1
fi

log_info "Installation and configuration of NXChain and Telegraf completed successfully."
log_info "NXChain service is enabled and running."
log_info "Telegraf service is enabled and running."
log_info "System logs for NXChain are being forwarded to the configured log server."
