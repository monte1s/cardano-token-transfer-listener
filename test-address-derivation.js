import 'dotenv/config';
import Cardano from "@emurgo/cardano-serialization-lib-nodejs";

// Function to derive address from Ed25519 private key
function deriveAddressFromPrivateKey(privateKeyBech32, networkId = 0) {
    try {
        // For bech32 private keys, we need to decode them first
        // The bech32 format is: ed25519e_sk + base32 encoded bytes
        const prefix = "ed25519e_sk";
        if (!privateKeyBech32.startsWith(prefix)) {
            throw new Error('Invalid private key format. Expected ed25519e_sk prefix.');
        }
        
        // Remove the prefix and decode base32
        const base32Part = privateKeyBech32.substring(prefix.length);
        
        // Convert base32 to bytes using a simple base32 decoder
        const base32Chars = 'abcdefghijklmnopqrstuvwxyz234567';
        let bits = 0;
        let value = 0;
        let bytes = [];
        
        for (let i = 0; i < base32Part.length; i++) {
            const char = base32Part[i];
            const index = base32Chars.indexOf(char);
            if (index === -1) {
                throw new Error('Invalid base32 character in private key');
            }
            
            value = (value << 5) | index;
            bits += 5;
            
            if (bits >= 8) {
                bytes.push((value >>> (bits - 8)) & 0xFF);
                bits -= 8;
            }
        }
        
        // Create private key from bytes
        const privateKey = Cardano.PrivateKey.from_extended_bytes(new Uint8Array(bytes));
        
        // Derive public key from private key
        const publicKey = privateKey.to_public();
        
        // Create base address (payment + stake credentials)
        const baseAddr = Cardano.BaseAddress.new(
            networkId, // 0 for mainnet, 1 for testnet
            Cardano.Credential.from_keyhash(publicKey.hash()),
            Cardano.Credential.from_keyhash(publicKey.hash())
        );
        
        // Convert to bech32 address
        const address = baseAddr.to_address().to_bech32();
        
        return {
            address: address,
            publicKey: publicKey.to_hex(),
            privateKey: privateKey.to_hex()
        };
    } catch (error) {
        console.error('Error deriving address:', error);
        throw error;
    }
}

// Your private key
const YOUR_PRIVATE_KEY = "ed25519e_sk13pjg47xvthhsvsq6l9pg3meufq8zkeucl6t7ha996l70m0atgpfdvrmym4puv9h8j23ar8uc2nedkgpzk0m3agamv6qr7hss28f6jkq5zahd3";

console.log('🔑 Deriving addresses from Ed25519 private key...\n');

try {
    // For mainnet (networkId = 0)
    console.log('🌐 Mainnet:');
    const mainnetResult = deriveAddressFromPrivateKey(YOUR_PRIVATE_KEY, 0);
    console.log('   Address:', mainnetResult.address);
    console.log('   Public Key:', mainnetResult.publicKey);
    console.log('   Private Key (hex):', mainnetResult.privateKey);
    
    console.log('\n🧪 Testnet:');
    // For testnet (networkId = 1) 
    const testnetResult = deriveAddressFromPrivateKey(YOUR_PRIVATE_KEY, 1);
    console.log('   Address:', testnetResult.address);
    console.log('   Public Key:', testnetResult.publicKey);
    console.log('   Private Key (hex):', testnetResult.privateKey);
    
} catch (error) {
    console.error('❌ Error:', error.message);
} 