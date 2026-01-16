
import mongoose from 'mongoose';

const uri = "mongodb://neiht:hj6scsg4@10.93.30.39:28224/telecom_dashboard";

async function testConnection(connectionString: string, options: any = {}) {
    console.log(`Testing connection to: ${connectionString}`);
    console.log(`Options: ${JSON.stringify(options)}`);
    try {
        await mongoose.connect(connectionString, options);
        console.log("✅ Connection SUCCESS!");
        await mongoose.disconnect();
        return true;
    } catch (e: any) {
        console.log("❌ Connection FAILED:", e.message);
        return false;
    }
}

async function runTests() {
    console.log("--- Starting MongoDB Connection Tests ---");

    // Test 1: As currently configured (Full URI)
    console.log("\nTest 1: Full URI without explicit authSource");
    await testConnection(uri);

    // Test 2: Full URI + authSource=admin
    console.log("\nTest 2: Full URI + authSource=admin (in options)");
    await testConnection(uri, { authSource: 'admin' });

    // Test 3: Base URI + dbName + authSource=admin
    console.log("\nTest 3: Base URI + dbName option + authSource=admin");
    const baseUri = "mongodb://neiht:hj6scsg4@10.93.30.39:28224";
    await testConnection(baseUri, { dbName: 'telecom_dashboard', authSource: 'admin' });

    console.log("\n--- Tests Completed ---");
}

runTests();
