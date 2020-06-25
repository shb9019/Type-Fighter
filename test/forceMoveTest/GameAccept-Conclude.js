const Adjudicator = artifacts.require('Adjudicator');
const {aliceKeys, bobKeys, methodSignatures} = require("../config");
const {sleep, encodeParam, createTestChannel} = require("../utils");

// Generate Bob's Game Accept and Alice's Conclude Moves
const getAliceBobMoves = async (adjudicator, alicePreFundSetupMove) => {
    // Create Bob's Game Propose Move
    const channel = alicePreFundSetupMove.state[1];
    const gameAcceptType = encodeParam('uint8', 3);
    const turnNum = encodeParam('uint256', 2);
    const aliceResolution = alicePreFundSetupMove.state[3][0];
    const bobResolution = alicePreFundSetupMove.state[3][1];
    const resolutions = [aliceResolution, bobResolution];
    const bobOpponentTimestamp = alicePreFundSetupMove.state[4];
    const bobTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    const play = [encodeParam('uint256', 200), encodeParam('uint256', 188), encodeParam('uint256', 200)];
    const stake = encodeParam('uint256', 0);

    const bobState = [gameAcceptType, channel, turnNum, resolutions, bobTimestamp, bobOpponentTimestamp, stake, play];
    const bobStateHash = await adjudicator.methods[methodSignatures.stateHash].call(bobState);

    let bobSignature = await web3.eth.accounts.sign(bobStateHash, bobKeys.private);
    bobSignature = [bobKeys.public, bobSignature.signature];

    // Create Alice's Conclude Move
    const concludeType = encodeParam('uint256', 4);
    const aliceTurnNum = encodeParam('uint256', 3);
    const aliceOpponentTimestamp = bobState[4];
    const aliceTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    const aliceStake = encodeParam('uint256', 0);
    let alicePlay = [encodeParam('uint256', 188), encodeParam('uint256', 200), encodeParam('uint256', 200)];

    const aliceState = [
        concludeType,
        channel,
        aliceTurnNum,
        resolutions,
        aliceTimestamp,
        aliceOpponentTimestamp,
        aliceStake,
        alicePlay
    ];
    const aliceStateHash = await adjudicator.methods[methodSignatures.stateHash].call(aliceState);

    let aliceSignature = await web3.eth.accounts.sign(aliceStateHash, aliceKeys.private);
    aliceSignature = [aliceKeys.public, aliceSignature.signature];

    return [bobState, bobSignature, aliceState, aliceSignature];
};

contract("Create Force Move from GameAccept to Conclude", async accounts => {
    it ("should succeed", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, false);
        const [bobState, bobSignature, aliceState, aliceSignature] = await getAliceBobMoves(adjudicator, alicePreFundSetupMove);

        try {
            await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [bobState, bobSignature],
                [aliceState, aliceSignature], {
                    from: aliceKeys.public
                }
            );
        } catch (err) {
            console.log(err.toString());
            assert(false, "Failed to make force move!");
        }
    });
});

contract("Respond with Conclude to Conclude Force Move", async accounts => {
    it ("should succeed", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, false);
        const [bobState, bobSignature, aliceState, aliceSignature] = await getAliceBobMoves(adjudicator, alicePreFundSetupMove);

        try {
            await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [bobState, bobSignature],
                [aliceState, aliceSignature], {
                    from: aliceKeys.public
                }
            );
        } catch (err) {
            console.log(err.toString());
            assert(false, "Failed to make force move!");
        }

        const channel = alicePreFundSetupMove.state[1];
        const channelHash = await adjudicator.methods[methodSignatures.channelHash].call(channel);
        const concludeType = encodeParam('uint8', 4);
        const turnNum = aliceState[2];
        const resolutions = aliceState[3];
        const bobOpponentTimestamp = aliceState[4];
        const bobTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
        const play = [encodeParam('uint256', 200), encodeParam('uint256', 188), encodeParam('uint256', 200)];
        const stake = encodeParam('uint256', 0);

        const bobConcludeState = [concludeType, channel, turnNum, resolutions, bobTimestamp, bobOpponentTimestamp, stake, play];
        const bobConcludeStateHash = await adjudicator.methods[methodSignatures.stateHash].call(bobConcludeState);

        let bobConcludeSignature = await web3.eth.accounts.sign(bobConcludeStateHash, bobKeys.private);
        bobConcludeSignature = [bobKeys.public, bobConcludeSignature.signature];

        try {
            await adjudicator.methods[methodSignatures.respondWithMove].call(
                channelHash,
                [bobConcludeState, bobConcludeSignature], {
                    from: bobKeys.public
                }
            );
        } catch (err) {
            assert(false, "Failed to respond!");
        }
    });
})
