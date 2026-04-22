#!/bin/bash
# Simple script to download the architecture diagram
echo "Downloading Shadow Vault architecture diagram..."
wget -O /home/carlos/projects/shadow-vault/media/architecture-diagram.png "https://v3b.fal.media/files/b/0a973547/3mrdKCP2X8HtX3biOjnM8_91eMh4cP.png" 2>/dev/null || curl -L -o /home/carlos/projects/shadow-vault/media/architecture-diagram.png "https://v3b.fal.media/files/b/0a973547/3mrdKCP2X8HtX3biOjnM8_91eMh4cP.png"
if [ -f /home/carlos/projects/shadow-vault/media/architecture-diagram.png ]; then
    echo "✓ Successfully saved architecture diagram"
    echo "File location: /home/carlos/projects/shadow-vault/media/architecture-diagram.png"
    echo "File size: $(stat -c%s /home/carlos/projects/shadow-vault/media/architecture-diagram.png) bytes"
else
    echo "✗ Failed to download architecture diagram"
fi