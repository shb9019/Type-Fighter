const Adjudicator = artifacts.require('Adjudicator');
const {aliceKeys, bobKeys, methodSignatures} = require("../config");
const {sleep, encodeParam, createTestChannel} = require("../utils");

contract("Force Move from PreFundSetup to PreFundSetup", async accounts => {
    it ("should succeed", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator);

        try {
            await adjudicator.methods[methodSignatures.forceMove].call(
                [alicePreFundSetupMove.state, alicePreFundSetupMove.signature],
                [bobPreFundSetupMove.state, bobPreFundSetupMove.signature], {
                    from: bobKeys.public
                }
            );
        } catch (err) {
            assert(false, err.toString());
        }
    });

    it ("should fail due to wrong transition", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, true);

        try {
            await adjudicator.methods[methodSignatures.forceMove].call(
                [bobPreFundSetupMove.state, bobPreFundSetupMove.signature],
                [alicePreFundSetupMove.state, alicePreFundSetupMove.signature], {
                    from: aliceKeys.public
                }
            );
            assert(false, "Should not accept wrong transition from bob -> alice!");
        } catch (err) {}
    });
});
