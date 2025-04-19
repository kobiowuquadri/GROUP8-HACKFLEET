const UserDAO = require("./user-dao").UserDAO;

/* The AllocationsDAO must be constructed with a connected database object */
const AllocationsDAO = function(db){

    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof AllocationsDAO)) {
        console.log("Warning: AllocationsDAO constructor called without 'new' operator");
        return new AllocationsDAO(db);
    }

    const allocationsCol = db.collection("allocations");
    const userDAO = new UserDAO(db);

    this.update = (userId, stocks, funds, bonds, callback) => {
        const parsedUserId = parseInt(userId);

        // Validate input values
        if (isNaN(parsedUserId)) {
            return callback("Invalid user ID", null);
        }

        // Validate allocation percentages
        const total = parseInt(stocks) + parseInt(funds) + parseInt(bonds);
        if (total !== 100) {
            return callback("Total allocation must equal 100%", null);
        }

        // Create allocations document
        const allocations = {
            userId: userId,
            stocks: stocks,
            funds: funds,
            bonds: bonds
        };

        allocationsCol.updateOne({
            userId: parsedUserId
        }, {
            $set: allocations
        }, {
            upsert: true
        }, err => {
            if (err) {
                console.error("Error updating allocations:", err);
                return callback("Failed to update allocations. Please try again.", null);
            }

            console.log("Updated allocations");

            userDAO.getUserById(userId, (err, user) => {
                if (err) {
                    console.error("Error getting user:", err);
                    return callback("Failed to retrieve user information", null);
                }

                // add user details
                allocations.userId = userId;
                allocations.userName = user.userName;
                allocations.firstName = user.firstName;
                allocations.lastName = user.lastName;

                return callback(null, allocations);
            });
        });
    };

    this.getByUserIdAndThreshold = (userId, threshold, callback) => {
        const parsedUserId = parseInt(userId);

        // Validate user ID
        if (isNaN(parsedUserId)) {
            return callback("Invalid user ID", null);
        }

        const searchCriteria = () => {
            if (threshold) {
                const parsedThreshold = parseInt(threshold, 10);
                if (isNaN(parsedThreshold)) {
                    return callback("Invalid threshold value. Please enter a number between 0 and 99.", null);
                }
                if (parsedThreshold < 0 || parsedThreshold > 99) {
                    return callback("Threshold must be between 0 and 99", null);
                }
                return {
                    userId: parsedUserId,
                    stocks: { $gt: parsedThreshold }
                };
            }
            return {
                userId: parsedUserId
            };
        };

        allocationsCol.find(searchCriteria()).toArray((err, allocations) => {
            if (err) {
                console.error("Error finding allocations:", err);
                return callback("Failed to retrieve allocations. Please try again.", null);
            }
            if (!allocations.length) {
                return callback("No allocations found matching your criteria", null);
            }

            let doneCounter = 0;
            const userAllocations = [];

            allocations.forEach( alloc => {
                userDAO.getUserById(alloc.userId, (err, user) => {
                    if (err) {
                        console.error("Error getting user:", err);
                        return callback("Failed to retrieve user information", null);
                    }

                    alloc.userName = user.userName;
                    alloc.firstName = user.firstName;
                    alloc.lastName = user.lastName;

                    doneCounter += 1;
                    userAllocations.push(alloc);

                    if (doneCounter === allocations.length) {
                        callback(null, userAllocations);
                    }
                });
            });
        });
    };

};

module.exports.AllocationsDAO = AllocationsDAO;
