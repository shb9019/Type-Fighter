const Adjudicator = artifacts.require('Adjudicator');
const {aliceKeys, bobKeys, methodSignatures} = require("../config");
const {sleep, encodeParam, createTestChannel} = require("../utils");

// Generate Bob's Game Propose and Alice's Game Accept Moves
const getAliceBobMoves = async (adjudicator, bobPreFundSetupMove, endGame = false) => {
    // Create Bob's Game Propose Move
    const channel = bobPreFundSetupMove.state[1];
    const gameProposeType = encodeParam('uint8', 2);
    const turnNum = encodeParam('uint256', 2);
    const aliceResolution = bobPreFundSetupMove.state[3][0];
    const bobResolution = bobPreFundSetupMove.state[3][1];
    const resolutions = [aliceResolution, bobResolution];
    const aliceOpponentTimestamp = bobPreFundSetupMove.state[4];
    const aliceTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    let play = [encodeParam('uint256', 18), encodeParam('uint256', 0), encodeParam('uint256', 200)];
    if (endGame) {
        play = [encodeParam('uint256', 200), encodeParam('uint256', 188), encodeParam('uint256', 200)];
    }
    const stake = encodeParam('uint256', 200);

    const aliceState = [gameProposeType, channel, turnNum, resolutions, aliceTimestamp, aliceOpponentTimestamp, stake, play];
    const aliceStateHash = await adjudicator.methods[methodSignatures.stateHash].call(aliceState);

    let aliceSignature = await web3.eth.accounts.sign(aliceStateHash, aliceKeys.private);
    aliceSignature = [aliceKeys.public, aliceSignature.signature];

    // Create Alice's Game Accept Move
    const gameAcceptType = encodeParam('uint256', 3);
    const bobOpponentTimestamp = aliceState[4];
    let bobTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    if (endGame) {
        bobTimestamp = aliceTimestamp;
    }
    const bobStake = encodeParam('uint256', 200);
    let bobPlay = [encodeParam('uint256', 20), encodeParam('uint256', 18), encodeParam('uint256', 200)];
    let bobResolutions = [
        encodeParam('uint256', 5000000 - 200),
        encodeParam('uint256', 5000000 + 200)
    ];

    if (endGame) {
        bobPlay = [encodeParam('uint256', 196), encodeParam('uint256', 200), encodeParam('uint256', 200)];
        bobResolutions = [
            encodeParam('uint256', 5000000 + 200),
            encodeParam('uint256', 5000000 - 200)
        ];
    }

    const bobState = [
        gameAcceptType,
        channel,
        turnNum,
        bobResolutions,
        bobTimestamp,
        bobOpponentTimestamp,
        bobStake,
        bobPlay
    ];
    const bobStateHash = await adjudicator.methods[methodSignatures.stateHash].call(bobState);

    let bobSignature = await web3.eth.accounts.sign(bobStateHash, bobKeys.private);
    bobSignature = [bobKeys.public, bobSignature.signature];

    return [aliceState, aliceSignature, bobState, bobSignature];
};

contract("Create Force Move from Game Propose to Game Accept", async accounts => {
    it ("should succeed", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, false);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, bobPreFundSetupMove);
        const channel = alicePreFundSetupMove.state[1];

        try {
            await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [aliceState, aliceSignature],
                [bobState, bobSignature], {
                    from: bobKeys.public
                }
            );
        } catch (err) {
            console.log(err.toString());
            assert(false, "Failed to make force move!");
        }
    });
});

contract("Respond with Game Propose to Game Accept Force Move", async accounts => {
    it ("should succeed", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, true);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, bobPreFundSetupMove);

        try {
            await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [aliceState, aliceSignature],
                [bobState, bobSignature], {
                    from: bobKeys.public
                }
            );
        } catch (err) {
            console.log(err.toString());
            assert(false, "Failed to make force move!");
        }

        const channel = alicePreFundSetupMove.state[1];
        const channelHash = await adjudicator.methods[methodSignatures.channelHash].call(channel);
        const gameProposeType = encodeParam('uint8', 2);
        const turnNum = encodeParam('uint256', 3);
        const aliceResolution = bobState[3][0];
        const bobResolution = bobState[3][1];
        const resolutions = [aliceResolution, bobResolution];
        const aliceOpponentTimestamp = bobState[4];
        const aliceTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
        const play = [encodeParam('uint256', 38), encodeParam('uint256', 20), encodeParam('uint256', 200)];
        const stake = encodeParam('uint256', 200);

        const aliceRespondState = [gameProposeType, channel, turnNum, resolutions, aliceTimestamp, aliceOpponentTimestamp, stake, play];
        const aliceRespondStateHash = await adjudicator.methods[methodSignatures.stateHash].call(aliceRespondState);
        let aliceRespondSignature = await web3.eth.accounts.sign(aliceRespondStateHash, aliceKeys.private);
        aliceRespondSignature = [aliceKeys.public, aliceRespondSignature.signature];

        try {
            await adjudicator.methods[methodSignatures.respondWithMove].sendTransaction(
                channelHash,
                [aliceRespondState, aliceRespondSignature], {
                    from: aliceKeys.public
                }
            );
        } catch (err) {
            assert(false, "Failed to respond!");
        }
    });

    it ("should fail due to wrong resolutions", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, true);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, bobPreFundSetupMove);

        try {
            await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [aliceState, aliceSignature],
                [bobState, bobSignature], {
                    from: bobKeys.public
                }
            );
        } catch (err) {
            console.log(err.toString());
            assert(false, "Failed to make force move!");
        }

        const channel = alicePreFundSetupMove.state[1];
        const channelHash = await adjudicator.methods[methodSignatures.channelHash].call(channel);
        const gameProposeType = encodeParam('uint8', 2);
        const turnNum = encodeParam('uint256', 3);
        const bobResolution = bobState[3][1];
        const resolutions = [encodeParam('uint256', 1000), bobResolution];
        const aliceOpponentTimestamp = bobState[4];
        const aliceTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
        const play = [encodeParam('uint256', 38), encodeParam('uint256', 20), encodeParam('uint256', 200)];
        const stake = encodeParam('uint256', 201);

        const aliceRespondState = [gameProposeType, channel, turnNum, resolutions, aliceTimestamp, aliceOpponentTimestamp, stake, play];
        const aliceRespondStateHash = await adjudicator.methods[methodSignatures.stateHash].call(aliceRespondState);
        let aliceRespondSignature = await web3.eth.accounts.sign(aliceRespondStateHash, aliceKeys.private);
        aliceRespondSignature = [aliceKeys.public, aliceRespondSignature.signature];

        try {
            await adjudicator.methods[methodSignatures.respondWithMove].sendTransaction(
                channelHash,
                [aliceRespondState, aliceRespondSignature], {
                    from: aliceKeys.public
                }
            );

            assert(false, "ValidMove should not accept wrong resolutions!");
        } catch (err) {}
    });
});

contract("Respond with Conclude to Game Propose", async accounts => {
    it ("should succeed", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, false);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, bobPreFundSetupMove, true);

        try {
            await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [aliceState, aliceSignature],
                [bobState, bobSignature], {
                    from: bobKeys.public
                }
            );
        } catch (err) {
            console.log(err.toString());
            assert(false, "Failed to make force move!");
        }

        const channel = alicePreFundSetupMove.state[1];
        const channelHash = await adjudicator.methods[methodSignatures.channelHash].call(channel);
        const concludeType = encodeParam('uint8', 4);
        const turnNum = encodeParam('uint256', 3);
        const aliceResolution = bobState[3][0];
        const bobResolution = bobState[3][1];
        const resolutions = [aliceResolution, bobResolution];
        const aliceOpponentTimestamp = bobState[4];
        const aliceTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
        const play = [encodeParam('uint256', 200), encodeParam('uint256', 196), encodeParam('uint256', 200)];
        const stake = encodeParam('uint256', 0);

        const aliceRespondState = [concludeType, channel, turnNum, resolutions, aliceTimestamp, aliceOpponentTimestamp, stake, play];
        const aliceRespondStateHash = await adjudicator.methods[methodSignatures.stateHash].call(aliceRespondState);
        let aliceRespondSignature = await web3.eth.accounts.sign(aliceRespondStateHash, aliceKeys.private);
        aliceRespondSignature = [aliceKeys.public, aliceRespondSignature.signature];

        try {
            await adjudicator.methods[methodSignatures.respondWithMove].sendTransaction(
                channelHash,
                [aliceRespondState, aliceRespondSignature], {
                    from: aliceKeys.public
                }
            );
        } catch (err) {
            assert(false, "Failed to respond!");
        }
    });

    it ("should fail since endgame is not reached yet", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator, true);
        const [aliceState, aliceSignature, bobState, bobSignature] = await getAliceBobMoves(adjudicator, bobPreFundSetupMove);

        const channel = alicePreFundSetupMove.state[1];
        const channelHash = await adjudicator.methods[methodSignatures.channelHash].call(channel);

        try {
            await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [aliceState, aliceSignature],
                [bobState, bobSignature], {
                    from: bobKeys.public
                }
            );
        } catch (err) {
            console.log(err.toString());
            assert(false, "Failed to make force move!");
        }

        const concludeType = encodeParam('uint8', 4);
        const turnNum = encodeParam('uint256', 3);
        const aliceResolution = bobState[3][0];
        const bobResolution = bobState[3][1];
        const resolutions = [aliceResolution, bobResolution];
        const aliceOpponentTimestamp = bobState[4];
        const aliceTimestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
        const play = [encodeParam('uint256', 18), encodeParam('uint256', 20), encodeParam('uint256', 200)];
        const stake = encodeParam('uint256', 0);

        const aliceRespondState = [concludeType, channel, turnNum, resolutions, aliceTimestamp, aliceOpponentTimestamp, stake, play];
        const aliceRespondStateHash = await adjudicator.methods[methodSignatures.stateHash].call(aliceRespondState);
        let aliceRespondSignature = await web3.eth.accounts.sign(aliceRespondStateHash, aliceKeys.private);
        aliceRespondSignature = [aliceKeys.public, aliceRespondSignature.signature];

        try {
            await adjudicator.methods[methodSignatures.respondWithMove].sendTransaction(
                channelHash,
                [aliceRespondState, aliceRespondSignature], {
                    from: aliceKeys.public
                }
            );
            assert(false, "ValidMove should not accept conclude till the game ends!");
        } catch (err) {}
    });
});
