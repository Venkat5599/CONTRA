export PATH=$PATH:/root/.local/bin
echo "=== vol ==="; vol --version 2>&1 | head -2 || echo "vol missing"
