const express = require("express");
const router = express.Router();
const SessionHandler = require("./session");
const ProfileHandler = require("./profile");
const BenefitsHandler = require("./benefits");
const ContributionsHandler = require("./contributions");
const AllocationsHandler = require("./allocations");
const MemosHandler = require("./memos");
const ResearchHandler = require("./research");
const tutorialRouter = require("./tutorial");
const ErrorHandler = require("./error").errorHandler;
const { signupValidationRules, loginValidationRules } = require("../validators/userValidator");
const { validationResult } = require("express-validator");
const { environmentalScripts } = require("../../config/config");

const index = (app, db) => {
    "use strict";

    const sessionHandler = new SessionHandler(db);
    const profileHandler = new ProfileHandler(db);
    const benefitsHandler = new BenefitsHandler(db);
    const contributionsHandler = new ContributionsHandler(db);
    const allocationsHandler = new AllocationsHandler(db);
    const memosHandler = new MemosHandler(db);
    const researchHandler = new ResearchHandler(db);

    // Public routes
    router.get("/", (req, res, next) => sessionHandler.displayWelcomePage(req, res, next));
    router.get("/login", (req, res, next) => sessionHandler.displayLoginPage(req, res, next));
    router.post("/login", (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render("login", {
                userName: req.body.userName || "",
                password: "",
                loginError: errors.array()[0].msg,
                environmentalScripts
            });
        }
        return sessionHandler.handleLoginRequest(req, res, next);
    });
    router.get("/signup", (req, res, next) => sessionHandler.displaySignupPage(req, res, next));
    router.post("/signup", (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = {};
            errors.array().forEach(error => {
                errorMessages[error.param + 'Error'] = error.msg;
            });
            return res.render("signup", {
                ...req.body,
                ...errorMessages,
                environmentalScripts
            });
        }
        return sessionHandler.handleSignup(req, res, next);
    });

    // Protected routes
    router.get("/dashboard", sessionHandler.isLoggedInMiddleware, (req, res, next) => sessionHandler.displayWelcomePage(req, res, next));
    router.get("/profile", sessionHandler.isLoggedInMiddleware, (req, res, next) => profileHandler.displayProfile(req, res, next));
    router.get("/contributions", sessionHandler.isLoggedInMiddleware, (req, res, next) => contributionsHandler.displayContributions(req, res, next));
    router.get("/allocations", sessionHandler.isLoggedInMiddleware, (req, res, next) => allocationsHandler.displayAllocations(req, res, next));
    router.get("/memos", sessionHandler.isLoggedInMiddleware, (req, res, next) => memosHandler.displayMemos(req, res, next));
    router.get("/learning", sessionHandler.isLoggedInMiddleware, (req, res, next) => sessionHandler.displayLoginPage(req, res, next));
    router.get("/research", sessionHandler.isLoggedInMiddleware, (req, res, next) => researchHandler.displayResearch(req, res, next));

    // Admin routes
    router.get("/benefits", sessionHandler.isAdminUserMiddleware, (req, res, next) => benefitsHandler.displayBenefits(req, res, next));
    router.get("/users", sessionHandler.isAdminUserMiddleware, (req, res, next) => sessionHandler.displayLoginPage(req, res, next));

    // Logout
    router.get("/logout", (req, res) => sessionHandler.displayLogoutPage(req, res));

    // Profile page
    router.post("/profile", sessionHandler.isLoggedInMiddleware, (req, res, next) => profileHandler.handleProfileUpdate(req, res, next));

    // Contributions Page
    router.post("/contributions", sessionHandler.isLoggedInMiddleware, (req, res, next) => contributionsHandler.handleContributionsUpdate(req, res, next));

    // Benefits Page
    router.post("/benefits", sessionHandler.isLoggedInMiddleware, (req, res, next) => benefitsHandler.updateBenefits(req, res, next));

    // Allocations Page
    router.get("/allocations/:userId", sessionHandler.isLoggedInMiddleware, (req, res, next) => allocationsHandler.displayAllocations(req, res, next));

    // Memos Page
    router.post("/memos", sessionHandler.isLoggedInMiddleware, (req, res, next) => memosHandler.addMemos(req, res, next));

    // Handle redirect for learning resources link
    router.get("/learn", sessionHandler.isLoggedInMiddleware, (req, res) => {
        return res.redirect(req.query.url);
    });

    // Mount tutorial router
    router.use("/tutorial", tutorialRouter);

    // Error handling middleware
    router.use(ErrorHandler);

    // Mount the router to the app
    app.use("/", router);
};

module.exports = index;
