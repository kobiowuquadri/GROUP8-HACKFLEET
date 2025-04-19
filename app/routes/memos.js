const MemosDAO = require("../data/memos-dao").MemosDAO;
const {
    environmentalScripts
} = require("../../config/config");
const { marked } = require('marked');

// Configure marked for safe rendering
marked.setOptions({
    sanitize: true,
    breaks: true,
    gfm: true, // GitHub Flavored Markdown
    headerIds: false // Disable header IDs to prevent potential XSS
});

function MemosHandler(db) {
    "use strict";

    const memosDAO = new MemosDAO(db);

    this.addMemos = (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.redirect("/login");
        }

        const { userId } = req.session;

        if (!req.body.memo) {
            return res.render("memos", {
                error: "Please enter a memo",
                memosList: [],
                userId,
                csrfToken: req.csrfToken(),
                environmentalScripts
            });
        }

        memosDAO.insert(req.body.memo, (err, docs) => {
            if (err) {
                console.error("Error in addMemos:", err);
                return res.render("memos", {
                    error: err.message || "An error occurred while adding the memo",
                    memosList: [],
                    userId,
                    csrfToken: req.csrfToken(),
                    environmentalScripts
                });
            }
            this.displayMemos(req, res, next);
        });
    };

    this.displayMemos = (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.redirect("/login");
        }

        const { userId } = req.session;

        memosDAO.getAllMemos((err, docs) => {
            if (err) {
                console.error("Error in displayMemos:", err);
                return res.render("memos", {
                    error: err.message || "An error occurred while fetching memos",
                    memosList: [],
                    userId,
                    csrfToken: req.csrfToken(),
                    environmentalScripts
                });
            }

            try {
                // Ensure docs is an array
                const memos = Array.isArray(docs) ? docs : [];

                // Pre-process memos with marked
                const processedDocs = memos.map(doc => {
                    try {
                        const memoContent = doc.memo || '';
                        let formattedMemo;
                        
                        try {
                            formattedMemo = marked.parse(memoContent);
                        } catch (markdownErr) {
                            console.error("Error processing markdown:", markdownErr);
                            // Fallback to plain text if markdown processing fails
                            formattedMemo = `<p>${memoContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
                        }

                        return {
                            memo: memoContent,
                            formattedMemo: formattedMemo,
                            timestamp: doc.timestamp ? new Date(doc.timestamp).toISOString() : new Date().toISOString()
                        };
                    } catch (processErr) {
                        console.error("Error processing memo:", processErr);
                        console.error("Memo content:", doc.memo);
                        return {
                            memo: doc.memo || '',
                            formattedMemo: `<p>${(doc.memo || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
                            timestamp: new Date().toISOString()
                        };
                    }
                });

                return res.render("memos", {
                    memosList: processedDocs,
                    userId,
                    csrfToken: req.csrfToken(),
                    environmentalScripts
                });
            } catch (renderErr) {
                console.error("Error rendering memos template:", renderErr);
                return res.status(500).send("Error rendering page. Please try again later.");
            }
        });
    };
}

module.exports = MemosHandler;
