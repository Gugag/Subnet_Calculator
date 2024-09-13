function calculate() {
    const ipAddress = document.getElementById('ip-address').value;
    const subnetMaskBits = parseInt(document.getElementById('subnet-mask').value);

    // Convert IP Address to binary
    const ipParts = ipAddress.split('.').map(part => parseInt(part).toString(2).padStart(8, '0')).join('');

    // Calculate the subnet mask
    const subnetMaskBinary = '1'.repeat(subnetMaskBits) + '0'.repeat(32 - subnetMaskBits);

    // Calculate the network address
    const networkAddressBinary = ipParts.substring(0, subnetMaskBits) + '0'.repeat(32 - subnetMaskBits);
    const networkAddress = binaryToIp(networkAddressBinary);

    // Calculate the broadcast address
    const broadcastAddressBinary = ipParts.substring(0, subnetMaskBits) + '1'.repeat(32 - subnetMaskBits);
    const broadcastAddress = binaryToIp(broadcastAddressBinary);

    // Calculate the first and last usable addresses
    const firstUsableBinary = networkAddressBinary.substring(0, 31) + '1';
    const lastUsableBinary = broadcastAddressBinary.substring(0, 31) + '0';

    const firstUsable = binaryToIp(firstUsableBinary);
    const lastUsable = binaryToIp(lastUsableBinary);

    // Calculate the total number of hosts
    const totalHosts = Math.pow(2, 32 - subnetMaskBits) - 2;

    // Display results
    document.getElementById('network-address').innerText = `Network Address: ${networkAddress}`;
    document.getElementById('broadcast-address').innerText = `Broadcast Address: ${broadcastAddress}`;
    document.getElementById('first-usable').innerText = `First Usable IP: ${firstUsable}`;
    document.getElementById('last-usable').innerText = `Last Usable IP: ${lastUsable}`;
    document.getElementById('total-hosts').innerText = `Total Hosts: ${totalHosts}`;
};

function binaryToIp(binary) {
    return binary.match(/.{1,8}/g).map(b => parseInt(b, 2)).join('.');
};