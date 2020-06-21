var Adjudicator = artifacts.require("Adjudicator");

module.exports = function(deployer) {
    // deployment steps
    deployer.deploy(Adjudicator);
};
