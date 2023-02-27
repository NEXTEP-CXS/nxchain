# Set the version of the node
version=$(curl -s https://api.github.com/repos/NEXTEP-CXS/nxchain/releases/latest | grep tag_name | awk '{print $2}' | tr -d '",' | cut -c 2-)

# Set the path to the binary file
binary_path="/usr/local/bin/nxchain"

# Download the binary file
wget https://github.com/NEXTEP-CXS/nxchain/releases/download/v$version/nxchain_$version\_linux_amd64.tar.gz

# Extract the binary file
tar -xvzf nxchain_$version\_linux_amd64.tar.gz

# Remove the tar.gz file
rm nxchain_$version\_linux_amd64.tar.gz

# Move the binary file to the specified path
sudo mv nxchain $binary_path