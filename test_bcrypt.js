// test_bcrypt.js
const bcrypt = require('bcryptjs');

async function testBcrypt() {
    const plainPassword = 'password123'; // The password you will use for testing
    const saltRounds = 10;

    console.log(`--- bcrypt Test ---`);
    console.log(`Plain password: "${plainPassword}"`);
    console.log(`Salt Rounds: ${saltRounds}`);

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        console.log(`Generated Hashed Password: "${hashedPassword}"`);
        console.log(`Hashed Password Length: ${hashedPassword.length}`); // Should be 60

        // Compare the plain password with the generated hash
        const isMatch1 = await bcrypt.compare(plainPassword, hashedPassword);
        console.log(`Comparison 1 (plain vs generated hash): ${isMatch1}`); // Should be true

        // Simulate retrieving from DB:
        // Copy this hash string and paste it here if you want to test a known DB hash
        const dbHashedPassword = hashedPassword; // Use the one generated above for direct test

        // Test comparison again
        const isMatch2 = await bcrypt.compare(plainPassword, dbHashedPassword);
        console.log(`Comparison 2 (plain vs simulated DB hash): ${isMatch2}`); // Should be true

        // Test with a WRONG password
        const wrongPassword = 'wrongpassword';
        const isMatchWrong = await bcrypt.compare(wrongPassword, dbHashedPassword);
        console.log(`Comparison 3 (wrong plain vs simulated DB hash): ${isMatchWrong}`); // Should be false

    } catch (error) {
        console.error('An error occurred during bcrypt test:', error);
    }
}

testBcrypt();