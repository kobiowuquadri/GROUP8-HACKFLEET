#!/usr/bin/env nodejs

"use strict";

// This script initializes the database. You can set the environment variable
// before running it (default: development). ie:
// NODE_ENV=production node artifacts/db-reset.js

const { MongoClient } = require("mongodb");
const { db } = require("../config/config");

const USERS_TO_INSERT = [
    {
        "_id": 1,
        "userName": "admin",
        "firstName": "Node Goat",
        "lastName": "Admin",
        "password": "Admin_123",
        //"password" : "$2a$10$8Zo/1e8KM8QzqOKqbDlYlONBOzukWXrM.IiyzqHRYDXqwB3gzDsba", // Admin_123
        "isAdmin": true
    }, {
        "_id": 2,
        "userName": "user1",
        "firstName": "John",
        "lastName": "Doe",
        "benefitStartDate": "2030-01-10",
        "password": "User1_123"
        // "password" : "$2a$10$RNFhiNmt2TTpVO9cqZElb.LQM9e1mzDoggEHufLjAnAKImc6FNE86",// User1_123
    }, {
        "_id": 3,
        "userName": "user2",
        "firstName": "Will",
        "lastName": "Smith",
        "benefitStartDate": "2025-11-30",
        "password": "User2_123"
        //"password" : "$2a$10$Tlx2cNv15M0Aia7wyItjsepeA8Y6PyBYaNdQqvpxkIUlcONf1ZHyq", // User2_123
    }];

const tryDropCollection = async (db, name) => {
    try {
        await db.collection(name).drop();
        console.log(`Dropped collection: ${name}`);
    } catch (err) {
        if (err.code !== 26) { // Collection doesn't exist error
            console.log(`Error dropping collection ${name}:`, err);
        }
    }
};

// MongoDB Connection Options
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

// Starting here
MongoClient.connect(db, mongoOptions, async (err, client) => {
    if (err) {
        console.log("ERROR: connect");
        console.log(JSON.stringify(err));
        process.exit(1);
    }

    try {
        const database = client.db();
        console.log("Connected to the database");

        const collectionNames = [
            "users",
            "allocations",
            "contributions",
            "memos",
            "counters"
        ];

        // Drop existing collections
        console.log("Dropping existing collections");
        for (const name of collectionNames) {
            await tryDropCollection(database, name);
        }

        // Reset unique id counter
        await database.collection("counters").insertOne({
            _id: "userId",
            seq: 3
        });

        // Insert users
        console.log("Users to insert:");
        USERS_TO_INSERT.forEach((user) => console.log(JSON.stringify(user)));
        const result = await database.collection("users").insertMany(USERS_TO_INSERT);

        // Create allocations for each user
        const finalAllocations = result.ops.map((user) => {
            const stocks = Math.floor((Math.random() * 40) + 1);
            const funds = Math.floor((Math.random() * 40) + 1);
            return {
                userId: user._id,
                stocks: stocks,
                funds: funds,
                bonds: 100 - (stocks + funds)
            };
        });

        console.log("Allocations to insert:");
        finalAllocations.forEach(allocation => console.log(JSON.stringify(allocation)));
        await database.collection("allocations").insertMany(finalAllocations);

        console.log("Database reset performed successfully");
        client.close();
        process.exit(0);
    } catch (error) {
        console.error("Error during database reset:", error);
        client.close();
        process.exit(1);
    }
});
