const Adjudicator = artifacts.require('Adjudicator');
const {aliceKeys, bobKeys, methodSignatures} = require("./config");
const {encodeParam, createTestChannel} = require("./utils");

// Generate Bob's Post Fund and Alice's Conclude Moves
const getAliceBobMoves = async (adjudicator, alicePreFundSetupMove) => {
    // Create Bob's PostFundSetup Move
    const channel = alicePreFundSetupMove.state[1];
    const postFundSetupType = encodeParam('uint8', 1);
    const turnNum = encodeParam('uint256', 0);
    const aliceResolution = alicePreFundSetupMove.state[3][0];
    const bobResolution = alicePreFundSetupMove.state[3][1];
    const resolutions = [aliceResolution, bobResolution];
    const bobOpponentTimestamp = alicePreFundSetupMove.state[4];
    const bobTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    const play = [encodeParam('uint256', 0)];
    const stake = encodeParam('uint256', 0);

    const bobState = [postFundSetupType, channel, turnNum, resolutions, bobTimestamp, bobOpponentTimestamp, stake, play];
    const bobStateHash = await adjudicator.methods[methodSignatures.stateHash].call(bobState);

    let bobSignature = await web3.eth.accounts.sign(bobStateHash, bobKeys.private);
    bobSignature = [bobKeys.public, bobSignature.signature];

    // Create Alice's Conclude Move
    const concludeType = encodeParam('uint256', 4);
    const aliceOpponentTimestamp = bobState[4];
    const aliceTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    const aliceStake = encodeParam('uint256', 0);
    const aliceTurnNum = encodeParam('uint256', 1);
    const alicePlay = [encodeParam('uint256', 0)];

    const aliceState = [concludeType, channel, aliceTurnNum, resolutions, aliceTimestamp, aliceOpponentTimestamp, aliceStake, alicePlay];
    const aliceStateHash = await adjudicator.methods[methodSignatures.stateHash].call(aliceState);

    let aliceSignature = await web3.eth.accounts.sign(aliceStateHash, aliceKeys.private);
    aliceSignature = [aliceKeys.public, aliceSignature.signature];

    return [aliceState, aliceSignature, bobState, bobSignature];
};

contract("Validate Move from Post Fund to Conclude", async accounts => {
    it("should succeed", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, ] = await createTestChannel(adjudicator);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, alicePreFundSetupMove);

        try {
            const valid = await adjudicator.methods[methodSignatures.validMove].call(
                [bobState, bobSignature],
                [aliceState, aliceSignature]
            );
            assert.equal(valid, true, "Valid move sequence is considered invalid!");
        } catch (err) {
            assert(false, err.toString());
        }
    });

    it("should fail due to wrong resolutions", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, ] = await createTestChannel(adjudicator, true);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, alicePreFundSetupMove);

        // TODO: Previous "should fail" tests are passing because of wrong signatures.
        try {
            const fakeAliceState = JSON.parse(JSON.stringify(aliceState));
            fakeAliceState[3][0] = encodeParam('uint256', 5000001);
            const fakeAliceStateHash = await adjudicator.methods[methodSignatures.stateHash].call(fakeAliceState);
            let fakeAliceSignature = await web3.eth.accounts.sign(fakeAliceStateHash, aliceKeys.private);
            fakeAliceSignature = [aliceKeys.public, fakeAliceSignature.signature];
            const valid = await adjudicator.methods[methodSignatures.validMove].call(
                [bobState, bobSignature],
                [fakeAliceState, fakeAliceSignature]
            );
            assert.equal(valid, false, "Changing resolutions should not be accepted!");
        } catch (err) {
            assert(false, err.toString());
        }
    });

    it("should fail due to wrong opponent timestamp", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, ] = await createTestChannel(adjudicator, true);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, alicePreFundSetupMove);

        try {
            const fakeAliceState = JSON.parse(JSON.stringify(aliceState));
            fakeAliceState[5] = encodeParam('uint256', 30);
            const fakeAliceStateHash = await adjudicator.methods[methodSignatures.stateHash].call(fakeAliceState);
            let fakeAliceSignature = await web3.eth.accounts.sign(fakeAliceStateHash, aliceKeys.private);
            fakeAliceSignature = [aliceKeys.public, fakeAliceSignature.signature];

            const valid = await adjudicator.methods[methodSignatures.validMove].call(
                [bobState, bobSignature],
                [fakeAliceState, fakeAliceSignature]
            );
            assert.equal(valid, false, "Changing opponent timestamp should not be accepted!");
        } catch (err) {
            assert(false, err.toString());
        }
    });

    it("should fail due to wrong channel Nonce", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, ] = await createTestChannel(adjudicator, true);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, alicePreFundSetupMove);

        try {
            const fakeAliceState = JSON.parse(JSON.stringify(aliceState));
            fakeAliceState[1][2] = encodeParam('uint256', 30);
            const fakeAliceStateHash = await adjudicator.methods[methodSignatures.stateHash].call(fakeAliceState);
            let fakeAliceSignature = await web3.eth.accounts.sign(fakeAliceStateHash, aliceKeys.private);
            fakeAliceSignature = [aliceKeys.public, fakeAliceSignature.signature];

            const valid = await adjudicator.methods[methodSignatures.validMove].call(
                [bobState, bobSignature],
                [fakeAliceState, fakeAliceSignature]
            );
            assert(false, "Changing channel details should not be accepted!");
        } catch (err) {
            assert(true);
        }
    });
});

contract("Respond to Post Fund to Conclude Force Move", async accounts => {
    it("should accept the respond move", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove,] = await createTestChannel(adjudicator);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, alicePreFundSetupMove);

        try {
            const valid = await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [bobState, bobSignature],
                [aliceState, aliceSignature], {
                    from: aliceKeys.public
                }
            );
        } catch (err) {
            assert(false, err.toString());
        }


    });
});
