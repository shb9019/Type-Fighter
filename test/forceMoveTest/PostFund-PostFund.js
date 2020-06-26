const Adjudicator = artifacts.require('Adjudicator');
const {aliceKeys, bobKeys, methodSignatures} = require("../config");
const {sleep, encodeParam, createTestChannel} = require("../utils");

const getAliceBobMoves = async (adjudicator, bobPreFundSetupMove) => {
    // Create Alice's PostFundSetup Move
    const channel = bobPreFundSetupMove.state[1];
    const postFundSetupType = encodeParam('uint8', 1);
    const turnNum = encodeParam('uint256', 0);
    const aliceResolution = bobPreFundSetupMove.state[3][0];
    const bobResolution = bobPreFundSetupMove.state[3][1];
    const resolutions = [aliceResolution, bobResolution];
    const aliceOpponentTimestamp = bobPreFundSetupMove.state[4];
    const aliceTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    const play = [encodeParam('uint256', 0), encodeParam('uint256', 0), encodeParam('uint256', 200)];
    const stake = encodeParam('uint256', 0);

    const aliceState = [postFundSetupType, channel, turnNum, resolutions, aliceTimestamp, aliceOpponentTimestamp, stake, play];
    const aliceStateHash = await adjudicator.methods[methodSignatures.stateHash].call(aliceState);

    let aliceSignature = await web3.eth.accounts.sign(aliceStateHash, aliceKeys.private);
    aliceSignature = [aliceKeys.public, aliceSignature.signature];

    // Create Bob's PostFundSetup Move
    const bobOpponentTimestamp = aliceState[4];
    const bobTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));

    const bobState = [postFundSetupType, channel, turnNum, resolutions, bobTimestamp, bobOpponentTimestamp, stake, play];
    const bobStateHash = await adjudicator.methods[methodSignatures.stateHash].call(bobState);

    let bobSignature = await web3.eth.accounts.sign(bobStateHash, bobKeys.private);
    bobSignature = [bobKeys.public, bobSignature.signature];

    return [aliceState, aliceSignature, bobState, bobSignature];
};

contract("Force Move from PostFundSetup to PostFundSetup", async accounts => {
    it ("should succeed", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, bobPreFundSetupMove);
        try {
            await adjudicator.methods[methodSignatures.forceMove].call(
                [aliceState, aliceSignature],
                [bobState, bobSignature], {
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
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, bobPreFundSetupMove);

        try {
            await adjudicator.methods[methodSignatures.forceMove].call(
                [bobState, bobSignature],
                [aliceState, aliceSignature], {
                    from: aliceKeys.public
                }
            );
            assert(false, "Should not accept wrong transition from bob -> alice!");
        } catch (err) {}
    });
});
