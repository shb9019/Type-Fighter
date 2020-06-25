const Adjudicator = artifacts.require('Adjudicator');
const {aliceKeys, bobKeys, methodSignatures} = require("./config");
const {sleep, encodeParam, createTestChannel} = require("./utils");

// Generate Alice's and Bob's Conclude Moves
const getAliceBobConcludeMoves = async (adjudicator, bobPreFundSetupMove, excessFunds = false) => {
    // Create Alice's Conclude Move
    const channel = bobPreFundSetupMove.state[1];
    const concludeType = encodeParam('uint8', 4);
    const turnNum = encodeParam('uint256', 15);
    let aliceResolution = encodeParam('uint256', 6000000);
    let bobResolution = encodeParam('uint256', 4000000);

    if (excessFunds) {
        aliceResolution = encodeParam('uint256', 6500000);
        bobResolution = encodeParam('uint256', 4500000);
    }

    const resolutions = [aliceResolution, bobResolution];
    const aliceOpponentTimestamp = bobPreFundSetupMove.state[4];
    const aliceTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    const play = [encodeParam('uint256', 188), encodeParam('uint256', 200), encodeParam('uint256', 200)];
    const stake = encodeParam('uint256', 0);

    const aliceState = [concludeType, channel, turnNum, resolutions, aliceTimestamp, aliceOpponentTimestamp, stake, play];
    const aliceStateHash = await adjudicator.methods[methodSignatures.stateHash].call(aliceState);

    let aliceSignature = await web3.eth.accounts.sign(aliceStateHash, aliceKeys.private);
    aliceSignature = [aliceKeys.public, aliceSignature.signature];

    // Create Bob's Conclude Move
    const bobOpponentTimestamp = aliceState[4];
    const bobTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    const bobStake = encodeParam('uint256', 0);
    const bobTurnNum = encodeParam('uint256', 15);
    const bobPlay = [encodeParam('uint256', 200), encodeParam('uint256', 188), encodeParam('uint256', 200)];

    const bobState = [concludeType, channel, bobTurnNum, resolutions, bobTimestamp, bobOpponentTimestamp, bobStake, bobPlay];
    const bobStateHash = await adjudicator.methods[methodSignatures.stateHash].call(bobState);

    let bobSignature = await web3.eth.accounts.sign(bobStateHash, bobKeys.private);
    bobSignature = [bobKeys.public, bobSignature.signature];

    return [aliceState, aliceSignature, bobState, bobSignature];
};

contract("Withdraw submitted funds from contract", async accounts => {
    it ("should succeed", async () => {
        const adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, false);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobConcludeMoves(adjudicator, bobPreFundSetupMove);

        const initialBobBalance = await web3.eth.getBalance(bobKeys.public);

        try {
            const tx = await adjudicator.methods[methodSignatures.withdrawFunds].sendTransaction(
                [aliceState, aliceSignature],
                [bobState, bobSignature]
            );

        } catch (err) {
            console.log(err.toString());
            assert(false, "Withdraw failed!");
        }

        const finalBobBalance = await web3.eth.getBalance(bobKeys.public);

        assert.equal((parseInt(finalBobBalance) / 1000000) - (parseInt(initialBobBalance) / 1000000), 4, "Bob did not receive correct amount!");
    });
});

contract("Withdraw excess funds from contract", async accounts => {
    it ("should fail", async () => {
        const adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, false);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobConcludeMoves(adjudicator, bobPreFundSetupMove, true);

        try {
            await adjudicator.methods[methodSignatures.withdrawFunds].call(
                [aliceState, aliceSignature],
                [bobState, bobSignature]
            );
            assert(false, "Excess funds Withdraw should fail!");
        } catch (err) {}
    });
});
