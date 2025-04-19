/* The MemosDAO must be constructed with a connected database object */
function MemosDAO(db) {

    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof MemosDAO)) {
        console.log("Warning: MemosDAO constructor called without 'new' operator");
        return new MemosDAO(db);
    }

    const memosCol = db.collection("memos");

    this.insert = (memo, callback) => {
        if (!memo || typeof memo !== 'string') {
            return callback(new Error("Invalid memo content"), null);
        }

        // Create memo document
        const memoDoc = {
            memo: memo,
            timestamp: new Date()
        };

        memosCol.insertOne(memoDoc, (err, result) => {
            if (err) {
                console.error("Error inserting memo:", err);
                return callback(new Error("Failed to save memo. Please try again."), null);
            }
            callback(null, result);
        });
    };

    this.getAllMemos = (callback) => {
        memosCol.find({})
            .sort({ timestamp: -1 })
            .toArray((err, memos) => {
                if (err) {
                    console.error("Error retrieving memos:", err);
                    return callback(new Error("Failed to retrieve memos. Please try again."), null);
                }
                // Ensure each memo has the required properties
                const processedMemos = (memos || []).map(memo => ({
                    memo: memo.memo || '',
                    timestamp: memo.timestamp || new Date()
                }));
                callback(null, processedMemos);
            });
    };
}

module.exports = { MemosDAO };
