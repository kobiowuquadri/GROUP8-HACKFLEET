const ResearchDAO = require("../data/research-dao").ResearchDAO;
const needle = require("needle");
const {
    environmentalScripts
} = require("../../config/config");

function ResearchHandler(db) {
    "use strict";

    const researchDAO = new ResearchDAO(db);

    this.displayResearch = (req, res) => {
        if (req.query.symbol) {
            const symbol = req.query.symbol.toUpperCase();
            const url = `https://finance.yahoo.com/quote/${symbol}`;
            
            return needle.get(url, (error, response, body) => {
                if (error || response.statusCode !== 200) {
                    return res.render("research", {
                        error: "Failed to fetch stock information. Please try again.",
                        symbol: symbol,
                        environmentalScripts
                    });
                }

                try {
                    // Extract stock information from the response
                    const stockInfo = {
                        symbol: symbol,
                        url: url,
                        name: extractStockName(body),
                        price: extractStockPrice(body),
                        change: extractStockChange(body),
                        marketCap: extractMarketCap(body)
                    };

                    return res.render("research", {
                        stockInfo,
                        symbol: symbol,
                        environmentalScripts
                    });
                } catch (err) {
                    console.error('Error parsing stock data:', err);
                    return res.render("research", {
                        error: "Error processing stock information. Please try again.",
                        symbol: symbol,
                        environmentalScripts
                    });
                }
            });
        }

        return res.render("research", {
            environmentalScripts
        });
    };
}

// Helper functions to extract stock information
function extractStockName(body) {
    const nameMatch = body.match(/"longName":"([^"]+)"/);
    return nameMatch ? nameMatch[1] : 'N/A';
}

function extractStockPrice(body) {
    const priceMatch = body.match(/"regularMarketPrice":{"raw":([\d.]+)/);
    return priceMatch ? `$${parseFloat(priceMatch[1]).toFixed(2)}` : 'N/A';
}

function extractStockChange(body) {
    const changeMatch = body.match(/"regularMarketChangePercent":{"raw":([-]?[\d.]+)/);
    return changeMatch ? `${parseFloat(changeMatch[1]).toFixed(2)}%` : 'N/A';
}

function extractMarketCap(body) {
    const marketCapMatch = body.match(/"marketCap":{"raw":([\d.]+)/);
    return marketCapMatch ? formatMarketCap(parseFloat(marketCapMatch[1])) : 'N/A';
}

function formatMarketCap(value) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
}

module.exports = ResearchHandler;
