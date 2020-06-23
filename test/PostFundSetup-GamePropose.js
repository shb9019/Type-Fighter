const Adjudicator = artifacts.require('Adjudicator');
const {aliceKeys, bobKeys, methodSignatures} = require("./config");
const {sleep, encodeParam, createTestChannel} = require("./utils");

// Generate Bob's Post Fund and Alice's Game Propose Moves
const getBobPostFundSetupMove = async (adjudicator, alicePreFundSetupMove) => {
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

    // Create Alice's GamePropose Move
    const gameProposeType = encodeParam('uint256', 2);
    const aliceOpponentTimestamp = bobState[4];
    const aliceTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    const aliceStake = encodeParam('uint256', 10);
    const aliceTurnNum = encodeParam('uint256', 1);
    const alicePlay = [encodeParam('uint256', 18)];

    const aliceState = [gameProposeType, channel, aliceTurnNum, resolutions, aliceTimestamp, aliceOpponentTimestamp, aliceStake, alicePlay];
    const aliceStateHash = await adjudicator.methods[methodSignatures.stateHash].call(aliceState);

    let aliceSignature = await web3.eth.accounts.sign(aliceStateHash, aliceKeys.private);
    aliceSignature = [aliceKeys.public, aliceSignature.signature];

    return [bobState, bobSignature, aliceState, aliceSignature];
};

contract("Create ForceMove from PostFundSetup to GamePropose", async accounts => {
    it ("should create a force move", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, true);
        const [bobState, bobSignature, aliceState, aliceSignature] = await getBobPostFundSetupMove(adjudicator, alicePreFundSetupMove);
        const channel = alicePreFundSetupMove.state[1];

        try {
            await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [bobState, bobSignature],
                [aliceState, aliceSignature], {
                    from: aliceKeys.public
                }
            );
        } catch(err) {
            assert(false, "Force Move failed:" + err.toString());
        }

        const channelHash = await adjudicator.methods[methodSignatures.channelHash].call(channel);

        try {
            const challenge = await adjudicator.methods[methodSignatures.challenges].call(channelHash);

            assert(challenge.isSet === true, "Challenge should not be set");
            assert(challenge.isExpired === false, "Challenge should not be expired yet");
            assert(challenge.opponentMove.signature.signer === bobKeys.public, "Wrong signature signer for opponent move");
            assert(challenge.challengerMove.signature.signer === aliceKeys.public, "Wrong signature signer for challenger move");
            assert(challenge.challengerMove.signature.signature === aliceSignature[1], "Wrong signature");
            assert(challenge.opponentMove.signature.signature === bobSignature[1], "Wrong signature");
        } catch (err) {
            assert(false, "Challenge is not setup:" + err.toString());
        }
    });

    it("should fail due to no stake", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, true);
        const [bobState, bobSignature, aliceState, aliceSignature] = await getBobPostFundSetupMove(adjudicator, alicePreFundSetupMove);

        try {
            aliceState[6] = encodeParam('uint256', 0);

            await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [bobState, bobSignature],
                [aliceState, aliceSignature], {
                    from: aliceKeys.public
                }
            );
            assert(false, "Contract accepts game propose with nothing at stake");
        } catch(err) {
            assert(true);
        }
    });

    it("should fail due to too high stake", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, true);
        const [bobState, bobSignature, aliceState, aliceSignature] = await getBobPostFundSetupMove(adjudicator, alicePreFundSetupMove);

        try {
            aliceState[6] = encodeParam('uint256', 10000000);

            await adjudicator.methods[methodSignatures.validMove].call(
                [bobState, bobSignature],
                [aliceState, aliceSignature], {
                    from: aliceKeys.public
                }
            );
            assert(false, "Contract accepts game propose with an unreasonable stake");
        } catch(err) {
            assert(true);
        }
    });

    it("should fail due to no play", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, true);
        const [bobState, bobSignature, aliceState, aliceSignature] = await getBobPostFundSetupMove(adjudicator, alicePreFundSetupMove);

        try {
            aliceState[7] = [encodeParam('uint256', 0)];

            await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [bobState, bobSignature],
                [aliceState, aliceSignature], {
                    from: aliceKeys.public
                }
            );
            assert(false, "Contract accepts game propose with an unreasonable stake");
        } catch(err) {
            assert(true);
        }
    });

    it("should fail due to same turn number", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, true);
        const [bobState, bobSignature, aliceState, aliceSignature] = await getBobPostFundSetupMove(adjudicator, alicePreFundSetupMove);

        try {
            aliceState[2] = encodeParam('uint256', 0);

            await adjudicator.methods[methodSignatures.validMove].call(
                [bobState, bobSignature],
                [aliceState, aliceSignature], {
                    from: aliceKeys.public
                }
            );
            assert(false, "Contract accepts game propose with an unreasonable stake");
        } catch(err) {
            assert(true);
        }
    });

    it("should fail due to wrong opponent timestamp", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, true);
        const [bobState, bobSignature, aliceState, aliceSignature] = await getBobPostFundSetupMove(adjudicator, alicePreFundSetupMove);

        try {
            aliceState[5] = encodeParam('uint256', Math.floor(new Date() / 1000));

            await adjudicator.methods[methodSignatures.validMove].call(
                [bobState, bobSignature],
                [aliceState, aliceSignature], {
                    from: aliceKeys.public
                }
            );
            assert(false, "Contract accepts game propose with an unreasonable stake");
        } catch(err) {
            assert(true);
        }
    });


});
